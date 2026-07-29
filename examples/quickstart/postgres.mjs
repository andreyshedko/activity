import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createActivity } from "@feedclip/activity";
import { postgresAdapter } from "@feedclip/activity/adapters/postgres";

if (!process.env.DATABASE_URL) {
  console.log("PostgreSQL quick start skipped: DATABASE_URL is not set");
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const resource = { type: "invoice", id: "inv_quickstart", title: "Quick-start invoice" };

try {
  const migration = fileURLToPath(import.meta.resolve("@feedclip/activity/migration.sql"));
  await pool.query(await readFile(migration, "utf8"));
  await pool.query("delete from activity_entries where resource_type = $1 and resource_id = $2", [
    resource.type,
    resource.id,
  ]);

  const activity = createActivity({ adapter: postgresAdapter(pool) });
  await activity.track({
    resource,
    actor: { type: "system", id: "quickstart", name: "Quick start" },
    action: "create",
  });

  const page = await activity.queryPage({ resource, limit: 10, offset: 0 });
  assert.equal(page.total, 1);
  assert.equal(page.entries[0].action, "create");
  console.log("PostgreSQL quick start passed");
} finally {
  await pool.end();
}
