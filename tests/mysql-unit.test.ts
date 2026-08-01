import assert from "node:assert/strict";
import test from "node:test";
import {
  ActivityError,
  createActivity,
  mysqlAdapter,
  type MySQLClient,
  type MySQLConnection,
} from "../src/activity";

test("MySQL insert uses a pooled transaction and preserves changes", async () => {
  const calls: string[] = [];
  let released = false;
  const connection: MySQLConnection = {
    async execute(sql) { calls.push(sql); return [[], undefined]; },
    async beginTransaction() { calls.push("BEGIN"); },
    async commit() { calls.push("COMMIT"); },
    async rollback() { calls.push("ROLLBACK"); },
    release() { released = true; },
  };
  const adapter = mysqlAdapter({
    async execute() { return [[], undefined]; },
    async getConnection() { return connection; },
  });
  const activity = createActivity({
    adapter,
    clock: () => new Date("2026-08-01T10:00:00.000Z"),
    idGenerator: () => "entry-1",
  });
  await activity.track({
    resource: { type: "invoice", id: "inv-1", title: "Invoice" },
    actor: { type: "user", id: "usr-1", name: "Ada", avatarUrl: "/ada.png" },
    action: "update",
    changes: [
      { field: "status", label: "Status", before: "draft", after: "paid", valueType: "enum" },
      { field: "note", label: "Note", valueType: "string" },
    ],
    content: { type: "custom", name: "approval", data: { source: "test" } },
    metadata: { tenant: "one" },
  });
  assert.deepEqual(calls.map((call) => call.trim().split(/\s+/)[0]), ["BEGIN", "insert", "insert", "insert", "COMMIT"]);
  assert.equal(released, true);
});

test("MySQL insert rolls back direct connection failures", async () => {
  const calls: string[] = [];
  const connection: MySQLConnection = {
    async execute() { throw new Error("duplicate"); },
    async beginTransaction() { calls.push("begin"); },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
  };
  await assert.rejects(
    createActivity({ adapter: mysqlAdapter(connection), idGenerator: () => "duplicate" }).track({
      resource: { type: "invoice", id: "inv-1" },
      actor: { type: "system", id: "system", name: "System" },
      action: "create",
    }),
    (error: ActivityError) => error.code === "STORAGE_FAILURE" && error.message === "duplicate",
  );
  assert.deepEqual(calls, ["begin", "rollback"]);
});

test("MySQL insert supports a direct connection and nullable fields", async () => {
  const calls: string[] = [];
  const connection: MySQLConnection = {
    async execute(sql) { calls.push(sql); return [[], undefined]; },
    async beginTransaction() { calls.push("begin"); },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
  };
  await createActivity({ adapter: mysqlAdapter(connection), idGenerator: () => "minimal" }).track({
    resource: { type: "invoice", id: "minimal" },
    actor: { type: "system", id: "system", name: "System" },
    action: "create",
  });
  assert.deepEqual(calls.map((call) => call.trim().split(/\s+/)[0]), ["begin", "insert", "commit"]);
});

test("MySQL query supports filters, offset, cursor, JSON, and immutable records", async () => {
  const statements: Array<{ sql: string; params?: import("../src/activity").MySQLValue[] }> = [];
  let page = 0;
  const client = fakeClient(async (sql, params) => {
    statements.push({ sql, params });
    if (sql.includes("count(*)")) return [[{ total: "2" }], undefined];
    if (sql.trimStart().startsWith("select\n    field")) return [[{
      field: "status", label: "Status", before_value: '"draft"', after_value: '"paid"', value_type: "enum",
    }], undefined];
    page += 1;
    return [[mysqlRow(page === 1 ? "entry-2" : "entry-1"), ...(page === 1 ? [mysqlRow("entry-1")] : [])], undefined];
  });
  const adapter = mysqlAdapter(client);
  const resource = { type: "invoice", id: "inv-1" };
  const first = await adapter.query({
    resource,
    actions: ["update"],
    actor: "usr-1",
    from: new Date("2026-08-01T09:00:00.000Z"),
    to: new Date("2026-08-01T11:00:00.000Z"),
    search: "paid",
    limit: 1,
    offset: 2,
  });
  assert.equal(first.total, 2);
  assert.equal(first.hasMore, true);
  assert.ok(first.nextCursor);
  assert.equal(first.entries[0].changes?.[0].after, "paid");
  assert.equal(first.entries[0].content?.type, "comment");
  assert.equal(first.entries[0].metadata?.tenant, "one");
  assert.equal(Object.isFrozen(first.entries[0]), true);
  const second = await adapter.query({ resource, limit: 1, cursor: first.nextCursor });
  assert.equal(second.hasMore, false);
  assert.equal(second.nextCursor, undefined);
  assert.match(statements.find(({ sql }) => sql.includes("(created_at < ?"))!.sql, /id < \?/);
});

test("MySQL query rejects malformed rows, changes, and JSON", async () => {
  const resource = { type: "invoice", id: "broken" };
  for (const client of [
    queryClient({ rows: {} }),
    queryClient({ rows: [null] }),
    queryClient({ rows: [mysqlRow("broken")], changes: {} }),
    queryClient({ rows: [mysqlRow("broken")], changes: [null] }),
    queryClient({ rows: [{ ...mysqlRow("broken"), content_json: "{" }], changes: [] }),
  ]) {
    await assert.rejects(
      mysqlAdapter(client).query({ resource }),
      (error: ActivityError) => error.code === "STORAGE_FAILURE",
    );
  }
  const result = await mysqlAdapter(queryClient({
    rows: [{
      ...mysqlRow("object-json"),
      resource_title: null,
      actor_avatar_url: null,
      content_json: undefined,
      metadata_json: { tenant: "object" },
    }],
    changes: [],
    countRows: {},
  })).query({ resource });
  assert.equal(result.total, 0);
  assert.equal(result.entries[0].resource.title, undefined);
  assert.equal(result.entries[0].actor.avatarUrl, undefined);
  assert.equal(result.entries[0].content, undefined);
  assert.equal(result.entries[0].metadata?.tenant, "object");
});

function fakeClient(execute: MySQLClient["execute"]): MySQLClient {
  return {
    execute,
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
  };
}

function queryClient(options: { rows: unknown; changes?: unknown; countRows?: unknown }): MySQLClient {
  return fakeClient(async (sql) => {
    if (sql.includes("count(*)")) return [options.countRows ?? [{ total: 1 }], undefined];
    if (sql.trimStart().startsWith("select\n    field")) return [options.changes ?? [], undefined];
    return [options.rows, undefined];
  });
}

function mysqlRow(id: string) {
  return {
    id,
    resource_type: "invoice",
    resource_id: "inv-1",
    resource_title: "Invoice",
    action: "update",
    actor_type: "user",
    actor_id: "usr-1",
    actor_name: "Ada",
    actor_avatar_url: "/ada.png",
    created_at: new Date("2026-08-01T10:00:00.000Z"),
    content_json: '{"type":"comment","text":"Paid"}',
    metadata_json: '{"tenant":"one"}',
  };
}
