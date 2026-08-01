import assert from "node:assert/strict";
import test from "node:test";
import { createActivity } from "@feedclip/activity";
import { createMemoryStorageAdapter } from "@feedclip/activity/adapters/memory";
import { createTenantAdapter } from "../lib/tenant-storage";

test("tenant adapters isolate identical public resource ids", async () => {
  const storage = createMemoryStorageAdapter();
  const acme = createActivity({ adapter: createTenantAdapter(storage, "acme") });
  const globex = createActivity({ adapter: createTenantAdapter(storage, "globex") });
  const resource = { type: "invoice", id: "inv_1001" };

  await acme.track({
    resource,
    actor: { type: "user", id: "alice", name: "Alice" },
    action: "create",
  });
  await globex.track({
    resource,
    actor: { type: "user", id: "grace", name: "Grace" },
    action: "comment",
    content: { type: "comment", text: "Globex only" },
  });

  const acmeEntries = await acme.query({ resource });
  const globexEntries = await globex.query({ resource });
  assert.deepEqual(acmeEntries.map((entry) => entry.actor.id), ["alice"]);
  assert.deepEqual(globexEntries.map((entry) => entry.actor.id), ["grace"]);
  assert.equal(acmeEntries[0]?.resource.id, resource.id);
});
