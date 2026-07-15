import assert from "node:assert/strict";
import test from "node:test";
import {
  ActivityError,
  createActivity,
  postgresAdapter,
  type ActivityRecord,
} from "../src/activity";

const entry: ActivityRecord = Object.freeze({
  id: "evt_pg_unit",
  resource: Object.freeze({ type: "invoice", id: "inv_1", title: "Invoice 1" }),
  action: "update",
  actor: Object.freeze({
    type: "user",
    id: "usr_1",
    name: "Ada",
    avatarUrl: "https://example.com/ada.png",
  }),
  timestamp: new Date("2026-07-11T10:00:00Z"),
  changes: Object.freeze([
    Object.freeze({ field: "status", label: "Status", before: null, after: "Paid", valueType: "enum" }),
    Object.freeze({ field: "owner", label: "Owner", before: "Ada", after: null, valueType: "user" }),
  ]),
  content: Object.freeze({ type: "comment", text: "Paid" }),
  metadata: Object.freeze({ source: "unit" }),
});

test("PostgreSQL insert uses transactions, changes, and pooled connection release", async () => {
  const calls: Array<{ sql: string; params?: readonly unknown[] }> = [];
  let released = false;
  const connection = {
    async query(sql: string, params?: readonly unknown[]) {
      calls.push({ sql, params });
      return { rows: [] };
    },
    release() {
      released = true;
    },
  };
  const adapter = postgresAdapter({
    async connect() {
      return connection;
    },
    async query() {
      return { rows: [] };
    },
  });

  await adapter.insert(entry);
  assert.equal(calls[0].sql, "BEGIN");
  assert.match(calls[1].sql, /insert into activity_entries/);
  assert.match(calls[2].sql, /insert into activity_changes/);
  assert.equal(calls.at(-1)?.sql, "COMMIT");
  assert.equal(released, true);
  assert.equal(calls[1].params?.[3], entry.resource.title);
  assert.equal(calls[1].params?.[8], entry.actor.avatarUrl);
});

test("PostgreSQL insert supports a direct client and null optional values", async () => {
  const calls: string[] = [];
  const adapter = postgresAdapter({
    async query(sql: string) {
      calls.push(sql);
      return { rows: [] };
    },
  });
  await adapter.insert(Object.freeze({
    ...entry,
    resource: Object.freeze({ type: "invoice", id: "inv_2" }),
    actor: Object.freeze({ type: "system", id: "sys", name: "System" }),
    changes: undefined,
    content: undefined,
    metadata: undefined,
  }));
  assert.deepEqual([calls[0], calls.at(-1)], ["BEGIN", "COMMIT"]);
});

test("PostgreSQL insert rolls back and normalizes every error shape", async () => {
  for (const failure of [
    new Error("database down"),
    new ActivityError("CUSTOM", "custom failure"),
    "unknown failure",
  ]) {
    const calls: string[] = [];
    let released = false;
    const adapter = postgresAdapter({
      async connect() {
        return {
          async query(sql: string) {
            calls.push(sql);
            if (sql.includes("insert into activity_entries")) throw failure;
            return { rows: [] };
          },
          release() {
            released = true;
          },
        };
      },
      async query() {
        return { rows: [] };
      },
    });

    await assert.rejects(adapter.insert(entry), ActivityError);
    assert.equal(calls.at(-1), "ROLLBACK");
    assert.equal(released, true);
  }
});

test("PostgreSQL query builds all filters, maps rows, and paginates", async () => {
  const calls: Array<{ sql: string; params?: readonly unknown[] }> = [];
  const row = {
    id: "evt_1",
    resource_type: "invoice",
    resource_id: "inv_1",
    resource_title: "Invoice 1",
    action: "update",
    actor_type: "user",
    actor_id: "usr_1",
    actor_name: "Ada",
    actor_avatar_url: "https://example.com/avatar.png",
    created_at: "2026-07-11T10:00:00Z",
    changes: [{ field: "status", label: "Status", before: "Draft", after: "Paid", valueType: "enum" }],
    content_json: { type: "comment", text: "Paid" },
    metadata_json: { source: "unit" },
  };
  const client = {
    async query(sql: string, params?: readonly unknown[]) {
      calls.push({ sql, params });
      return sql.includes("count(*)")
        ? { rows: [{ total: "2" }] }
        : { rows: [row, { ...row, id: "evt_2" }] };
    },
  };
  const result = await postgresAdapter(client).query({
    resource: { type: "invoice", id: "inv_1" },
    actions: ["update"],
    actorId: "usr_1",
    from: new Date("2026-07-01T00:00:00Z"),
    to: new Date("2026-07-31T00:00:00Z"),
    search: "paid",
    limit: 1,
    offset: 2,
  });

  assert.equal(result.total, 2);
  assert.equal(result.hasMore, true);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].changes?.[0].after, "Paid");
  assert.equal(result.entries[0].content?.type, "comment");
  assert.match(calls[0].sql, /e\.action = any/);
  assert.match(calls[0].sql, /e\.actor_id/);
  assert.match(calls[0].sql, /e\.created_at >=/);
  assert.match(calls[0].sql, /e\.created_at <=/);
  assert.match(calls[0].sql, /ilike/);
});

test("PostgreSQL query handles defaults, optional fields, totals, and invalid rows", async () => {
  const baseRow = {
    id: "evt_1",
    resource_type: "invoice",
    resource_id: "inv_1",
    resource_title: null,
    action: "create",
    actor_type: "system",
    actor_id: "sys",
    actor_name: "System",
    actor_avatar_url: null,
    created_at: "2026-07-11T10:00:00Z",
    changes: null,
    content_json: null,
    metadata_json: null,
  };
  for (const total of [3, null]) {
    let call = 0;
    const result = await postgresAdapter({
      async query() {
        call += 1;
        return call === 1 ? { rows: [{ total }] } : { rows: [baseRow] };
      },
    }).query({ resource: { type: "invoice", id: "inv_1" }, actor: "sys" });
    assert.equal(result.total, total ?? 0);
    assert.equal(result.hasMore, false);
    assert.equal(result.entries[0].resource.title, undefined);
    assert.equal(result.entries[0].changes, undefined);
  }

  for (const invalidRow of [null, "invalid", { ...baseRow, changes: [null] }]) {
    let call = 0;
    const adapter = postgresAdapter({
      async query() {
        call += 1;
        return call === 1 ? { rows: [] } : { rows: [invalidRow] };
      },
    });
    await assert.rejects(adapter.query({ resource: { type: "invoice", id: "inv_1" } }), ActivityError);
  }

  let contentCall = 0;
  const invalidContent = await postgresAdapter({
    async query() {
      contentCall += 1;
      return contentCall === 1
        ? { rows: [{ total: 1 }] }
        : { rows: [{ ...baseRow, content_json: { type: 42 } }] };
    },
  }).query({ resource: { type: "invoice", id: "inv_1" } });
  assert.equal(invalidContent.entries[0].content, undefined);
});

test("createActivity propagates storage failures", async () => {
  const activity = createActivity({
    adapter: {
      async insert() {
        throw new Error("insert failed");
      },
      async query() {
        throw new Error("query failed");
      },
    },
  });
  await assert.rejects(activity.track({
    resource: { type: "invoice", id: "inv_1" },
    actor: { type: "user", id: "usr_1", name: "Ada" },
    action: "create",
  }), /insert failed/);
  await assert.rejects(activity.query({ resource: { type: "invoice", id: "inv_1" } }), /query failed/);
});
