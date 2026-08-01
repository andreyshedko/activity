import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ActivityError,
  createActivity,
  sqliteAdapter,
  type Actor,
  type Resource,
  type SQLiteDatabase,
} from "../src";

const supported = Number(process.versions.node.split(".")[0]) >= 22;

test("SQLite adapter persists, filters, searches, and cursor-paginates records", { skip: !supported }, async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const database = new DatabaseSync(":memory:");
  database.exec("pragma foreign_keys = on");
  database.exec(await readFile(new URL("../migrations/sqlite/001_activity_schema.sql", import.meta.url), "utf8"));
  const activity = createActivity({
    adapter: sqliteAdapter(database),
    clock: sequentialClock(),
    idGenerator: sequentialIds(),
  });
  const actor: Actor = { type: "user", id: "usr_sqlite", name: "SQLite User", avatarUrl: "/avatar.png" };
  const resource: Resource = { type: "invoice", id: "inv_sqlite", title: "SQLite invoice" };

  await activity.track({ resource, actor, action: "create" });
  await activity.track({
    resource,
    actor,
    action: "update",
    changes: [
      { field: "status", label: "Status", after: "paid", valueType: "enum" },
      { field: "legacy", label: "Legacy", before: "enabled", valueType: "string" },
    ],
    metadata: { source: "sqlite-test" },
  });
  await activity.track({
    resource,
    actor: { type: "system", id: "sys_sqlite", name: "SQLite Bot" },
    action: "comment",
    content: { type: "comment", text: "Searchable SQLite note" },
  });

  const first = await activity.queryPage!({ resource, limit: 2 });
  assert.deepEqual(first.entries.map((entry) => entry.id), ["0003", "0002"]);
  assert.equal(first.total, 3);
  assert.equal(first.hasMore, true);
  assert.ok(first.nextCursor);
  const second = await activity.queryPage!({ resource, limit: 2, cursor: first.nextCursor });
  assert.deepEqual(second.entries.map((entry) => entry.id), ["0001"]);
  assert.equal(second.hasMore, false);

  const filtered = await activity.queryPage!({
    resource,
    actions: ["update"],
    actorId: actor.id,
    from: new Date("2026-07-31T10:01:00.000Z"),
    to: new Date("2026-07-31T10:02:00.000Z"),
    search: "paid",
    limit: 1,
    offset: 0,
  });
  assert.equal(filtered.entries[0].changes?.[0].after, "paid");
  assert.equal(filtered.entries[0].metadata?.source, "sqlite-test");
  assert.equal(filtered.entries[0].actor.avatarUrl, "/avatar.png");
  assert.equal(filtered.hasMore, false);

  const contentSearch = await activity.query({ resource, actor: "sys_sqlite", search: "searchable" });
  assert.equal(contentSearch[0].content?.type, "comment");

  await assert.rejects(
    createActivity({ adapter: sqliteAdapter(database), idGenerator: () => "0001" })
      .track({ resource: { type: resource.type, id: resource.id }, actor, action: "create" }),
    (error: ActivityError) => error.code === "STORAGE_FAILURE",
  );
  assert.equal((await activity.query({ resource })).length, 3);
  database.close();
});

test("SQLite adapter rejects malformed driver rows, changes, and JSON", async () => {
  const resource = { type: "invoice", id: "inv_broken" };
  for (const database of [
    fakeDatabase(null, []),
    fakeDatabase(sqliteRow(), [null]),
    fakeDatabase({ ...sqliteRow(), content_json: "{" }, []),
  ]) {
    await assert.rejects(
      sqliteAdapter(database).query({ resource }),
      (error: ActivityError) => error.code === "STORAGE_FAILURE",
    );
  }

  const result = await sqliteAdapter(fakeDatabase({
    ...sqliteRow(),
    content_json: undefined,
    metadata_json: { source: "driver-object" },
  }, [])).query({ resource });
  assert.equal(result.entries[0].content, undefined);
  assert.equal(result.entries[0].metadata?.source, "driver-object");
});

function sequentialIds() {
  let value = 0;
  return () => String(++value).padStart(4, "0");
}

function sequentialClock() {
  let value = 0;
  return () => new Date(`2026-07-31T10:0${value++}:00.000Z`);
}

function fakeDatabase(row: unknown, changes: unknown[]): SQLiteDatabase {
  return {
    exec() {},
    prepare(sql) {
      return {
        run() {},
        get() { return { total: 1 }; },
        all() {
          if (sql.includes("from activity_changes")) return changes;
          return [row];
        },
      };
    },
  };
}

function sqliteRow() {
  return {
    id: "evt_broken",
    resource_type: "invoice",
    resource_id: "inv_broken",
    resource_title: null,
    action: "create",
    actor_type: "system",
    actor_id: "system",
    actor_name: "System",
    actor_avatar_url: null,
    created_at: "2026-07-31T10:00:00.000Z",
    content_json: null,
    metadata_json: null,
  };
}
