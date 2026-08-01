import assert from "node:assert/strict";
import test from "node:test";
import {
  createActivity,
  createMemoryStorageAdapter,
  type ActivityRecord,
  type TrackInput,
} from "../src/activity";
import {
  createRedactionMiddleware,
  createTelemetryListener,
  trackBatch,
  withIdempotency,
} from "../src/reliability";

const input = (idempotencyKey: string): TrackInput => ({
  resource: { type: "customer", id: "customer_1" },
  actor: { type: "user", id: "user_1", name: "Ada" },
  action: "update",
  changes: [{ field: "email", label: "Email", before: "old@example.com", after: "new@example.com", valueType: "string" }],
  metadata: { idempotencyKey },
});

test("reliability helpers redact, emit telemetry, deduplicate, and batch", async () => {
  const events: string[] = [];
  const adapter = withIdempotency(createMemoryStorageAdapter(), { maxKeys: 1 });
  const activity = createActivity({
    adapter,
    middleware: [createRedactionMiddleware(["email"])],
    listeners: [createTelemetryListener(({ name }) => { events.push(name); })],
    idGenerator: (() => {
      let id = 0;
      return () => `entry_${++id}`;
    })(),
  });

  const records = await trackBatch(activity, [input("same"), input("same")], { concurrency: 1 });
  assert.equal(records.length, 2);
  assert.equal(records[0].changes?.[0].after, "[REDACTED]");
  assert.equal((await activity.query({ resource: { type: "customer", id: "customer_1" } })).length, 1);
  assert.deepEqual(events, [
    "activity.track.started",
    "activity.track.completed",
    "activity.track.started",
    "activity.track.completed",
  ]);

  await activity.track(input("new"));
  await activity.track(input("same"));
  assert.equal((await activity.query({ resource: { type: "customer", id: "customer_1" } })).length, 3);
});

test("telemetry reports failures with and without a normalized record", async () => {
  const events: Array<{ name: string; recordId?: string }> = [];
  const listener = createTelemetryListener((event) => { events.push(event); });
  await listener({ type: "trackFailed", error: new Error("invalid") });
  await listener({
    type: "trackFailed",
    error: new Error("storage"),
    record: { id: "entry", resource: { type: "x", id: "1" }, actor: { type: "system", id: "s", name: "System" }, action: "create", timestamp: new Date() } satisfies ActivityRecord,
  });
  assert.deepEqual(events.map(({ recordId }) => recordId), [undefined, "entry"]);
});

test("batch tracking accepts empty input and normalizes concurrency", async () => {
  const activity = createActivity({ adapter: createMemoryStorageAdapter() });
  assert.deepEqual(await trackBatch(activity, [], { concurrency: 0 }), []);
  assert.equal((await trackBatch(activity, [input("default")])).length, 1);
});

test("reliability defaults support records without changes or idempotency keys", async () => {
  const storage = createMemoryStorageAdapter();
  const adapter = withIdempotency(storage);
  const activity = createActivity({
    adapter,
    middleware: [createRedactionMiddleware(["secret"], null)],
  });
  await activity.track({
    resource: { type: "job", id: "1" },
    actor: { type: "system", id: "system", name: "System" },
    action: "create",
  });
  await activity.track({
    resource: { type: "job", id: "1" },
    actor: { type: "system", id: "system", name: "System" },
    action: "update",
    changes: [{ field: "status", label: "Status", after: "done", valueType: "enum" }],
    metadata: { idempotencyKey: "" },
  });
  assert.equal((await activity.query({ resource: { type: "job", id: "1" } })).length, 2);

  const custom = withIdempotency(storage, { key: ({ id }) => id });
  const record = { id: "fixed", resource: { type: "job", id: "2" }, actor: { type: "system", id: "system", name: "System" }, action: "create", timestamp: new Date() } satisfies ActivityRecord;
  await custom.insert(record);
  await custom.insert(record);
  assert.equal((await custom.query({ resource: record.resource })).entries.length, 1);
});
