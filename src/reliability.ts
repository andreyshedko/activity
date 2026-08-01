import type {
  Activity,
  ActivityEventListener,
  ActivityMiddleware,
  ActivityRecord,
  StorageAdapter,
  TrackInput,
} from "./activity";

export type ActivityTelemetry = Readonly<{
  name: "activity.track.started" | "activity.track.completed" | "activity.track.failed";
  recordId?: string;
  resourceType?: string;
  action?: string;
  error?: unknown;
}>;

export function createTelemetryListener(
  emit: (event: ActivityTelemetry) => void | Promise<void>,
): ActivityEventListener {
  return async (event) => {
    if (event.type === "beforeTrack") {
      await emit(toTelemetry("activity.track.started", event.record));
    } else if (event.type === "afterTrack") {
      await emit(toTelemetry("activity.track.completed", event.record));
    } else {
      await emit({
        name: "activity.track.failed",
        error: event.error,
        ...(event.record ? recordFields(event.record) : {}),
      });
    }
  };
}

export function createRedactionMiddleware(
  fields: readonly string[],
  replacement: unknown = "[REDACTED]",
): ActivityMiddleware {
  const sensitive = new Set(fields);
  return (record) => Object.freeze({
    ...record,
    changes: record.changes?.map((change) => Object.freeze(
      sensitive.has(change.field)
        ? { ...change, before: replacement, after: replacement }
        : change,
    )),
  });
}

export function withIdempotency(
  adapter: StorageAdapter,
  options: {
    key?: (entry: ActivityRecord) => string | undefined;
    maxKeys?: number;
  } = {},
): StorageAdapter {
  const key = options.key ?? ((entry) => String(entry.metadata?.idempotencyKey || "") || undefined);
  const maxKeys = options.maxKeys ?? 10_000;
  const inserted = new Set<string>();
  return {
    async insert(entry) {
      const idempotencyKey = key(entry);
      if (idempotencyKey && inserted.has(idempotencyKey)) return;
      await adapter.insert(entry);
      if (idempotencyKey) {
        inserted.add(idempotencyKey);
        if (inserted.size > maxKeys) inserted.delete(inserted.values().next().value!);
      }
    },
    query: (query) => adapter.query(query),
  };
}

export async function trackBatch(
  activity: Activity,
  inputs: readonly TrackInput[],
  options: { concurrency?: number } = {},
): Promise<ActivityRecord[]> {
  const concurrency = Math.max(1, Math.floor(options.concurrency ?? 4));
  const output = new Array<ActivityRecord>(inputs.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < inputs.length) {
      const index = cursor++;
      output[index] = await activity.track(inputs[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, inputs.length) }, worker));
  return output;
}

function toTelemetry(name: ActivityTelemetry["name"], record: ActivityRecord): ActivityTelemetry {
  return { name, ...recordFields(record) };
}

function recordFields(record: ActivityRecord) {
  return {
    recordId: record.id,
    resourceType: record.resource.type,
    action: record.action,
  };
}
