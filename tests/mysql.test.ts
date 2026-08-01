import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import mysql from "mysql2/promise";
import { createActivity, mysqlAdapter } from "../src/activity";

const uri = process.env.MYSQL_URL;

test("MySQL adapter persists, filters, searches, and cursor-paginates records", { skip: !uri }, async () => {
  const pool = mysql.createPool({ uri, multipleStatements: true });
  try {
    await pool.query(await readFile("migrations/mysql/001_activity_schema.sql", "utf8"));
    await pool.query("delete from activity_changes");
    await pool.query("delete from activity_entries");
    let id = 0;
    const resource = { type: "invoice", id: "inv_mysql", title: "MySQL invoice" };
    const actor = { type: "user" as const, id: "usr_mysql", name: "MySQL User" };
    const activity = createActivity({
      adapter: mysqlAdapter(pool),
      clock: () => new Date(`2026-08-01T10:0${id}:00.000Z`),
      idGenerator: () => `entry-${++id}`,
    });
    await activity.track({ resource, actor, action: "create" });
    await activity.track({
      resource,
      actor,
      action: "update",
      changes: [{ field: "status", label: "Status", before: "draft", after: "paid", valueType: "enum" }],
      metadata: { source: "mysql-test" },
    });
    await activity.track({
      resource,
      actor: { type: "system", id: "mysql-system", name: "MySQL Bot" },
      action: "comment",
      content: { type: "comment", text: "Searchable MySQL note" },
    });
    const first = await activity.queryPage!({ resource, limit: 2 });
    assert.deepEqual(first.entries.map(({ id: entryId }) => entryId), ["entry-3", "entry-2"]);
    assert.equal(first.total, 3);
    assert.ok(first.nextCursor);
    const second = await activity.queryPage!({ resource, limit: 2, cursor: first.nextCursor });
    assert.deepEqual(second.entries.map(({ id: entryId }) => entryId), ["entry-1"]);
    const filtered = await activity.query({ resource, actions: ["update"], actorId: actor.id, search: "paid" });
    assert.equal(filtered[0].changes?.[0].after, "paid");
    assert.equal(filtered[0].metadata?.source, "mysql-test");
    assert.equal((await activity.query({ resource, search: "searchable" }))[0].action, "comment");
  } finally {
    await pool.end();
  }
});
