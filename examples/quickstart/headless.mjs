import assert from "node:assert/strict";
import { createActivity, createMemoryStorageAdapter } from "@feedclip/activity";
import { collapseActivityEntries, createActivityFeed, exportActivityEntries } from "@feedclip/activity/headless";
import { createRedactionMiddleware, createTelemetryListener, trackBatch } from "@feedclip/activity/reliability";

const telemetry = [];
const activity = createActivity({
  adapter: createMemoryStorageAdapter(),
  middleware: [createRedactionMiddleware(["email"])],
  listeners: [createTelemetryListener((event) => { telemetry.push(event.name); })],
});
const base = {
  resource: { type: "customer", id: "customer_1" },
  actor: { type: "user", id: "user_1", name: "Ada" },
  action: "update",
  changes: [{ field: "email", label: "Email", before: "old@example.com", after: "new@example.com", valueType: "string" }],
};
await trackBatch(activity, [base, base]);
const entries = await activity.query({ resource: base.resource });
const feed = createActivityFeed(entries);

assert.equal(collapseActivityEntries(entries).length, 1);
assert.match(exportActivityEntries(feed.getSnapshot(), "csv"), /customer_1/);
assert.equal(entries[0].changes[0].after, "[REDACTED]");
assert.equal(telemetry.length, 4);
console.log("Headless and reliability quick start passed");
