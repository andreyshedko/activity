import {
  ActivityError,
  createActivity,
  type ActivityRecord,
  type QueryOptions,
  type ResourceReference,
  type StorageAdapter,
  type TrackInput,
} from "./activity";

export type ActivityHttpOperation = "query" | "insert";

export type ActivityHttpAuthorization = {
  request: Request;
  operation: ActivityHttpOperation;
  resource: ResourceReference;
};

export type ActivityHttpHandlerOptions = {
  adapter: StorageAdapter;
  authorize: (context: ActivityHttpAuthorization) => boolean | Promise<boolean>;
  onError?: (error: Error, request: Request) => void;
};

export function createActivityHttpHandler({
  adapter,
  authorize,
  onError,
}: ActivityHttpHandlerOptions): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      if (request.method === "GET") {
        const options = readQuery(new URL(request.url));
        if (!(await authorize({ request, operation: "query", resource: options.resource }))) {
          return json({ error: "Forbidden" }, 403);
        }
        const activity = createActivity({ adapter });
        const result = await activity.queryPage!(options);
        return json(result);
      }

      if (request.method === "POST") {
        const record = await readRecord(request);
        if (!(await authorize({ request, operation: "insert", resource: record.resource }))) {
          return json({ error: "Forbidden" }, 403);
        }
        const activity = createActivity({
          adapter,
          idGenerator: () => record.id,
        });
        await activity.track(toTrackInput(record));
        return json({ ok: true }, 201);
      }

      return json({ error: "Method not allowed" }, 405, { allow: "GET, POST" });
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error("Activity request failed");
      onError?.(normalized, request);
      const isClientError = error instanceof ActivityError && error.code.startsWith("INVALID_");
      const status = isClientError ? 400 : 500;
      const message = isClientError ? normalized.message : "Activity request failed";
      return json({ error: message }, status);
    }
  };
}

function readQuery(url: URL): QueryOptions {
  const resource = {
    type: required(url.searchParams, "resourceType"),
    id: required(url.searchParams, "resourceId"),
    title: url.searchParams.get("resourceTitle") ?? undefined,
  };
  const actionsValue = url.searchParams.get("actions");
  const actions = actionsValue ? parseActions(actionsValue) : undefined;
  return {
    resource,
    search: optional(url, "search"),
    actor: optional(url, "actor"),
    actorId: optional(url, "actorId"),
    actions,
    from: optionalDate(url, "from"),
    to: optionalDate(url, "to"),
    limit: optionalNumber(url, "limit"),
    offset: optionalNumber(url, "offset"),
  };
}

async function readRecord(request: Request): Promise<ActivityRecord> {
  let value: unknown;
  try {
    value = (await request.json()) as unknown;
  } catch {
    throw new ActivityError("INVALID_HTTP_REQUEST", "Request body must be valid JSON");
  }
  if (!isObject(value) || typeof value.id !== "string" || typeof value.timestamp !== "string") {
    throw new ActivityError("INVALID_HTTP_REQUEST", "Request must contain an activity record");
  }
  const timestamp = new Date(value.timestamp);
  if (Number.isNaN(timestamp.getTime())) {
    throw new ActivityError("INVALID_HTTP_REQUEST", "Activity timestamp is invalid", "timestamp");
  }
  return { ...value, timestamp } as ActivityRecord;
}

function toTrackInput(record: ActivityRecord): TrackInput {
  return {
    resource: record.resource,
    actor: record.actor,
    action: record.action,
    changes: record.changes ? [...record.changes] : undefined,
    content: record.content,
    metadata: record.metadata,
    timestamp: record.timestamp,
  };
}

function parseActions(value: string): string[] {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed) || parsed.some((action) => typeof action !== "string")) {
    throw new ActivityError("INVALID_QUERY", "actions must be a JSON array of strings", "actions");
  }
  return parsed;
}

function required(params: URLSearchParams, key: string): string {
  const value = params.get(key);
  if (!value) throw new ActivityError("INVALID_QUERY", `${key} is required`, key);
  return value;
}

function optional(url: URL, key: string): string | undefined {
  return url.searchParams.get(key) ?? undefined;
}

function optionalDate(url: URL, key: string): Date | undefined {
  const value = optional(url, key);
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ActivityError("INVALID_QUERY", `${key} is invalid`, key);
  return date;
}

function optionalNumber(url: URL, key: string): number | undefined {
  const value = optional(url, key);
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isInteger(number)) throw new ActivityError("INVALID_QUERY", `${key} is invalid`, key);
  return number;
}

function json(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headersToObject(headers) },
  });
}

function headersToObject(headers: HeadersInit | undefined): Record<string, string> {
  return headers ? Object.fromEntries(new Headers(headers).entries()) : {};
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
