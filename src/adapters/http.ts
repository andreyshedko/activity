import {
  ActivityError,
  type ActivityRecord,
  type QueryOptions,
  type QueryResult,
  type StorageAdapter,
} from "../activity";

export type ActivityFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type HttpAdapterOptions = {
  endpoint: string;
  fetch?: ActivityFetch;
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
};

export function httpAdapter({
  endpoint,
  fetch: fetchImplementation = globalThis.fetch,
  headers,
}: HttpAdapterOptions): StorageAdapter {
  if (!endpoint.trim()) {
    throw new ActivityError("INVALID_HTTP_ENDPOINT", "HTTP endpoint is required", "endpoint");
  }
  if (typeof fetchImplementation !== "function") {
    throw new ActivityError("MISSING_FETCH", "A Fetch API implementation is required", "fetch");
  }

  return {
    async insert(entry) {
      await request(fetchImplementation, endpoint, headers, {
        method: "POST",
        body: JSON.stringify(entry),
      });
    },
    async query(options) {
      const url = new URL(endpoint, "http://activity.local");
      appendQuery(url.searchParams, options);
      const target = isAbsoluteUrl(endpoint)
        ? url.toString()
        : `${url.pathname}${url.search}`;
      const payload = await request(fetchImplementation, target, headers, { method: "GET" });
      return parseQueryResult(payload);
    },
  };
}

async function request(
  fetchImplementation: ActivityFetch,
  endpoint: string,
  configuredHeaders: HttpAdapterOptions["headers"],
  init: RequestInit,
): Promise<unknown> {
  const suppliedHeaders =
    typeof configuredHeaders === "function" ? await configuredHeaders() : configuredHeaders;
  let response: Response;
  try {
    response = await fetchImplementation(endpoint, {
      ...init,
      headers: {
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...headersToObject(suppliedHeaders),
      },
    });
  } catch (error) {
    throw new ActivityError(
      "HTTP_FAILURE",
      error instanceof Error ? error.message : "Activity request failed",
    );
  }

  const payload = await readJson(response);
  if (!response.ok) {
    const message = readErrorMessage(payload) ?? `Activity request failed with ${response.status}`;
    throw new ActivityError("HTTP_FAILURE", message);
  }
  return payload;
}

function appendQuery(params: URLSearchParams, options: QueryOptions): void {
  params.set("resourceType", options.resource.type);
  params.set("resourceId", options.resource.id);
  if (options.resource.title) params.set("resourceTitle", options.resource.title);
  if (options.search) params.set("search", options.search);
  if (options.actor) params.set("actor", options.actor);
  if (options.actorId) params.set("actorId", options.actorId);
  if (options.actions?.length) params.set("actions", JSON.stringify(options.actions));
  if (options.from) params.set("from", options.from.toISOString());
  if (options.to) params.set("to", options.to.toISOString());
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));
}

function parseQueryResult(payload: unknown): QueryResult {
  if (!isObject(payload) || !Array.isArray(payload.entries)) {
    throw new ActivityError("INVALID_HTTP_RESPONSE", "Activity response must contain entries");
  }
  const entries = payload.entries.map(parseRecord);
  const total = typeof payload.total === "number" ? payload.total : entries.length;
  const hasMore = typeof payload.hasMore === "boolean" ? payload.hasMore : false;
  return { entries, total, hasMore };
}

function parseRecord(value: unknown): ActivityRecord {
  if (!isObject(value) || typeof value.timestamp !== "string") {
    throw new ActivityError("INVALID_HTTP_RESPONSE", "Activity response contains an invalid record");
  }
  const timestamp = new Date(value.timestamp);
  if (Number.isNaN(timestamp.getTime())) {
    throw new ActivityError("INVALID_HTTP_RESPONSE", "Activity record timestamp is invalid");
  }
  return Object.freeze({ ...value, timestamp }) as ActivityRecord;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ActivityError("INVALID_HTTP_RESPONSE", "Activity response is not valid JSON");
  }
}

function readErrorMessage(payload: unknown): string | undefined {
  return isObject(payload) && typeof payload.error === "string" ? payload.error : undefined;
}

function headersToObject(headers: HeadersInit | undefined): Record<string, string> {
  return headers ? Object.fromEntries(new Headers(headers).entries()) : {};
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
