import assert from "node:assert/strict";
import { createActivity } from "@feedclip/activity";
import { createMemoryStorageAdapter } from "@feedclip/activity/adapters/memory";

const resource = { type: "invoice", id: "inv_123", title: "Invoice INV-123" };
const activity = createActivity({ adapter: createMemoryStorageAdapter() });

await activity.track({
  resource,
  actor: { type: "user", id: "user_1", name: "John Smith" },
  action: "update",
  changes: [
    {
      field: "status",
      label: "Status",
      before: "Draft",
      after: "Approved",
      valueType: "enum",
    },
  ],
});

const entries = await activity.query({ resource });
assert.equal(entries.length, 1);
assert.equal(entries[0].changes[0].after, "Approved");
console.log("Memory quick start passed");
