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

test("track validates every required field and content contract", async () => {
  const activity = createActivity({ adapter: createMemoryStorageAdapter() });
  const invalidInputs = [
    { resource: { ...invoice, type: " " }, actor, action: "create", field: "resource.type" },
    { resource: { ...invoice, id: " " }, actor, action: "create", field: "resource.id" },
    { resource: invoice, actor: { ...actor, type: "invalid" }, action: "create", field: "actor.type" },
    { resource: invoice, actor: { ...actor, name: " " }, action: "create", field: "actor.name" },
    { resource: invoice, actor, action: " ", field: "action" },
    { resource: invoice, actor, action: "comment", field: "content" },
    { resource: invoice, actor, action: "attachment", field: "content" },
  ];

  for (const { field, ...input } of invalidInputs) {
    await assert.rejects(
      activity.track(input as Parameters<typeof activity.track>[0]),
      (error) => error instanceof ActivityError && error.field === field,
    );
  }

  for (const change of [
    { field: " ", label: "Status" },
    { field: "status", label: " " },
  ]) {
    await assert.rejects(
      activity.track({
        resource: invoice,
        actor,
        action: "update",
        changes: [{ ...change, valueType: "string" }],
      }),
      (error) => error instanceof ActivityError && error.code === "INVALID_CHANGE",
    );
  }
});

test("query validates resource, pagination, and date ranges", async () => {
  const activity = createActivity({ adapter: createMemoryStorageAdapter() });
  const invalidQueries = [
    { resource: { type: "", id: "inv_1" }, field: "resource" },
    { resource: invoice, limit: 0, field: "limit" },
    { resource: invoice, limit: 501, field: "limit" },
    { resource: invoice, offset: -1, field: "offset" },
    {
      resource: invoice,
      from: new Date("2026-07-12T00:00:00Z"),
      to: new Date("2026-07-11T00:00:00Z"),
      field: "from",
    },
  ];

  for (const { field, ...options } of invalidQueries) {
    await assert.rejects(
      activity.query(options),
      (error) => error instanceof ActivityError && error.field === field,
    );
  }
});

test("memory adapter covers actor, date, pagination, ordering, and value inference", async () => {
  const adapter = createMemoryStorageAdapter([], 1);
  const activity = createActivity({
    adapter,
    idGenerator: createSequentialIds("evt_full"),
  });
  const timestamps = [
    new Date("2026-07-11T10:00:00Z"),
    new Date("2026-07-11T10:00:00Z"),
    new Date("2026-07-12T10:00:00Z"),
  ];
  const values = [
    new Date("2026-07-10T00:00:00Z"),
    true,
    { nested: "value" },
    "text",
    42,
  ];

  for (let index = 0; index < values.length; index += 1) {
    await activity.track({
      resource: invoice,
      actor: index === 2 ? { ...actor, id: "usr_other", name: "Other User" } : actor,
      action: "update",
      timestamp: timestamps[index] ?? new Date(`2026-07-${13 + index}T10:00:00Z`),
      changes: [{
        field: `field_${index}`,
        label: `Field ${index}`,
        before: index === 0 ? null : undefined,
        after: values[index],
      } as Parameters<typeof activity.track>[0]["changes"] extends (infer Item)[] | undefined ? Item : never],
    });
  }

  const page = await adapter.query({
    resource: invoice,
    actorId: actor.id,
    from: new Date("2026-07-11T00:00:00Z"),
    to: new Date("2026-07-11T23:59:59Z"),
    limit: 1,
    offset: 0,
  });
  assert.equal(page.total, 2);
  assert.equal(page.entries.length, 1);
  assert.equal(page.hasMore, true);
  assert.equal(page.entries[0].id, "evt_full_2");

  const byActorAlias = await adapter.query({ resource: invoice, actor: "usr_other" });
  assert.equal(byActorAlias.entries.length, 1);
  const noMatches = await adapter.query({ resource: invoice, search: "missing" });
  assert.equal(noMatches.entries.length, 0);
  const dateSearch = await adapter.query({ resource: invoice, search: "2026-07-10" });
  assert.equal(dateSearch.entries.length, 1);
  assert.deepEqual(
    (await adapter.query({ resource: invoice })).entries.map((record) => record.changes?.[0].valueType),
    ["number", "string", "json", "boolean", "date"],
  );

  const inferredFromBefore = await activity.track({
    resource: invoice,
    actor,
    action: "update",
    changes: [{ field: "fallback", label: "Fallback", before: "before" } as never],
  });
  assert.equal(inferredFromBefore.changes?.[0].valueType, "string");
});

test("default id generation supports crypto UUID and fallback ids", async () => {
  const activity = createActivity({ adapter: createMemoryStorageAdapter() });
  const uuidRecord = await activity.track({ resource: invoice, actor, action: "create" });
  assert.ok(uuidRecord.id.length > 0);

  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: undefined });
  try {
    const fallback = await activity.track({ resource: invoice, actor, action: "create" });
    assert.match(fallback.id, /^act_/);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
  }
});

function createSequentialIds(prefix: string) {
  let count = 0;
  return () => `${prefix}_${++count}`;
}
