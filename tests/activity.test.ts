import assert from "node:assert/strict";
import test from "node:test";
import {
  ActivityError,
  createActivity,
  createMemoryStorageAdapter as createMemoryStorageAdapterFromRoot,
  type Actor,
  type Resource,
} from "../src";
import { createMemoryStorageAdapter } from "../src/adapters/memory";
import { ActivityPanel } from "../src/react";

const actor: Actor = {
  type: "user",
  id: "usr_demo",
  name: "Demo User",
};

const invoice: Resource = {
  type: "invoice",
  id: "inv_1",
  title: "Invoice INV-1",
};

const customer: Resource = {
  type: "customer",
  id: "cus_1",
  title: "Customer CUS-1",
};

test("track returns the normalized ActivityRecord and persists it", async () => {
  const activity = createActivity({
    adapter: createMemoryStorageAdapter(),
    clock: () => new Date("2026-07-09T09:00:00.000Z"),
    idGenerator: () => "evt_test_1",
  });

  const record = await activity.track({
    resource: invoice,
    actor,
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
    metadata: {
      source: "test",
    },
  });

  assert.equal(record.id, "evt_test_1");
  assert.equal(record.resource.type, "invoice");
  assert.equal(record.action, "update");
  assert.equal(record.timestamp.toISOString(), "2026-07-09T09:00:00.000Z");

  const entries = await activity.query({
    resource: {
      type: "invoice",
      id: "inv_1",
    },
  });

  assert.deepEqual(entries, [record]);
});

test("query isolates records by resource type and id", async () => {
  const activity = createActivity({
    adapter: createMemoryStorageAdapter(),
    clock: () => new Date("2026-07-09T09:00:00.000Z"),
    idGenerator: createSequentialIds("evt_resource"),
  });

  await activity.track({
    resource: invoice,
    actor,
    action: "comment",
    content: {
      type: "comment",
      text: "Invoice-only note",
    },
  });
  await activity.track({
    resource: customer,
    actor,
    action: "comment",
    content: {
      type: "comment",
      text: "Customer-only note",
    },
  });

  const invoiceEntries = await activity.query({
    resource: {
      type: "invoice",
      id: "inv_1",
    },
  });
  const customerEntries = await activity.query({
    resource: {
      type: "customer",
      id: "cus_1",
    },
  });

  assert.equal(invoiceEntries.length, 1);
  assert.equal(invoiceEntries[0].resource.type, "invoice");
  assert.equal(customerEntries.length, 1);
  assert.equal(customerEntries[0].resource.type, "customer");
});

test("query filters by action and search without domain knowledge", async () => {
  const activity = createActivity({
    adapter: createMemoryStorageAdapter(),
    clock: () => new Date("2026-07-09T09:00:00.000Z"),
    idGenerator: createSequentialIds("evt_query"),
  });

  await activity.track({
    resource: invoice,
    actor,
    action: "update",
    changes: [
      {
        field: "owner",
        label: "Owner",
        before: "Unassigned",
        after: "Priya Shah",
        valueType: "user",
      },
    ],
  });
  await activity.track({
    resource: invoice,
    actor,
    action: "comment",
    content: {
      type: "comment",
      text: "Ready for collection",
    },
  });

  const updates = await activity.query({
    resource: {
      type: "invoice",
      id: "inv_1",
    },
    actions: ["update"],
  });
  const search = await activity.query({
    resource: {
      type: "invoice",
      id: "inv_1",
    },
    search: "Priya",
  });

  assert.equal(updates.length, 1);
  assert.equal(updates[0].action, "update");
  assert.equal(search.length, 1);
  assert.equal(search[0].changes?.[0].after, "Priya Shah");
});

test("update events require at least one change", async () => {
  const activity = createActivity({
    adapter: createMemoryStorageAdapter(),
  });

  await assert.rejects(
    activity.track({
      resource: invoice,
      actor,
      action: "update",
    }),
    (error) =>
      error instanceof ActivityError &&
      error.code === "INVALID_ACTION" &&
      error.field === "changes",
  );
});

test("React entrypoint exposes ActivityPanel without requiring a Provider", () => {
  assert.equal(typeof ActivityPanel, "function");
  assert.equal(typeof createMemoryStorageAdapterFromRoot, "function");
});

test("track rejects missing actor ids and invalid timestamps", async () => {
  const activity = createActivity({ adapter: createMemoryStorageAdapter() });

  await assert.rejects(
    activity.track({
      resource: invoice,
      actor: { ...actor, id: " " },
      action: "create",
    }),
    (error) => error instanceof ActivityError && error.field === "actor.id",
  );

  await assert.rejects(
    activity.track({
      resource: invoice,
      actor,
      action: "create",
      timestamp: new Date("invalid"),
    }),
    (error) => error instanceof ActivityError && error.code === "INVALID_TIMESTAMP",
  );
});

test("query sends immutable normalized options to storage", async () => {
  let received: unknown;
  const activity = createActivity({
    adapter: {
      async insert() {},
      async query(options) {
        received = options;
        return { entries: [], total: 0, hasMore: false };
      },
    },
  });

  await activity.query({
    resource: { type: " invoice ", id: " inv_1 " },
    actions: ["UPDATE", "update"],
  });

  const options = received as {
    resource: { type: string; id: string };
    actions: readonly string[];
    limit: number;
    offset: number;
  };
  assert.equal(Object.isFrozen(options), true);
  assert.equal(Object.isFrozen(options.resource), true);
  assert.equal(Object.isFrozen(options.actions), true);
  assert.deepEqual(options.actions, ["update"]);
  assert.deepEqual(options.resource, { type: "invoice", id: "inv_1", title: undefined });
  assert.equal(options.limit, 50);
  assert.equal(options.offset, 0);
});

function createSequentialIds(prefix: string) {
  let count = 0;
  return () => `${prefix}_${++count}`;
}
