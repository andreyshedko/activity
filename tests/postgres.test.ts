import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import { createActivity, postgresAdapter } from "../src/activity";

const connectionString = process.env.DATABASE_URL;

test(
  "PostgreSQL adapter persists, filters, searches, and paginates records",
  { skip: !connectionString },
  async () => {
    const pool = new pg.Pool({ connectionString });
    try {
      const migration = await readFile("migrations/001_activity_schema.sql", "utf8");
      await pool.query(migration);
      await pool.query("truncate activity_changes, activity_entries cascade");

      let id = 0;
      const adapter = postgresAdapter(pool);
      const activity = createActivity({
        adapter,
        clock: () => new Date("2026-07-11T10:00:00.000Z"),
        idGenerator: () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`,
      });
      const resource = { type: "invoice", id: "inv_pg", title: "Invoice PG" };
      const actor = { type: "user" as const, id: "usr_pg", name: "Ada Lovelace" };

      await activity.track({
        resource,
        actor,
        action: "update",
        changes: [{ field: "status", label: "Status", before: "Draft", after: "Approved", valueType: "enum" }],
      });
      await activity.track({
        resource,
        actor,
        action: "comment",
        content: { type: "comment", text: "Ready for payment" },
      });

      const updates = await activity.query({ resource, actions: ["update"] });
      const search = await activity.query({ resource, search: "payment" });
      const firstPage = await adapter.query({ resource, limit: 1, offset: 0 });
      const page = await pool.query(
        "select count(*)::int as count from activity_entries where resource_id = $1",
        [resource.id],
      );

      assert.equal(updates.length, 1);
      assert.equal(updates[0].changes?.[0].after, "Approved");
      assert.equal(search.length, 1);
      assert.equal(search[0].action, "comment");
      assert.equal(firstPage.entries.length, 1);
      assert.equal(firstPage.total, 2);
      assert.equal(firstPage.hasMore, true);
      assert.equal(page.rows[0].count, 2);

      const duplicate = createActivity({
        adapter,
        idGenerator: () => "00000000-0000-4000-8000-000000000001",
      });
      await assert.rejects(
        duplicate.track({ resource, actor, action: "create" }),
        (error: unknown) => error instanceof Error && error.name === "ActivityError",
      );
      const afterRollback = await pool.query(
        "select count(*)::int as count from activity_entries where resource_id = $1",
        [resource.id],
      );
      assert.equal(afterRollback.rows[0].count, 2);
    } finally {
      await pool.end();
    }
  },
);
