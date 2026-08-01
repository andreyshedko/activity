import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { createActivity } from "@feedclip/activity";
import { mysqlAdapter } from "@feedclip/activity/adapters/mysql";

if (!process.env.MYSQL_URL) {
  console.log("MySQL quick start skipped: MYSQL_URL is not set");
  process.exit(0);
}

const pool = mysql.createPool({ uri: process.env.MYSQL_URL, multipleStatements: true });
const resource = { type: "invoice", id: "inv_mysql_quickstart", title: "MySQL quick-start invoice" };
try {
  const migration = fileURLToPath(import.meta.resolve("@feedclip/activity/mysql-migration.sql"));
  await pool.query(await readFile(migration, "utf8"));
  await pool.execute("delete from activity_entries where resource_type = ? and resource_id = ?", [resource.type, resource.id]);
  const activity = createActivity({ adapter: mysqlAdapter(pool) });
  await activity.track({
    resource,
    actor: { type: "system", id: "quickstart", name: "Quick start" },
    action: "create",
  });
  const page = await activity.queryPage({ resource, limit: 10 });
  assert.equal(page.total, 1);
  assert.equal(page.entries[0].action, "create");
  console.log("MySQL quick start passed");
} finally {
  await pool.end();
}
