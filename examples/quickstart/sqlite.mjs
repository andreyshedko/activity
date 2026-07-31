import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { createActivity } from "@feedclip/activity";
import { sqliteAdapter } from "@feedclip/activity/adapters/sqlite";

const database = new DatabaseSync(":memory:");
database.exec("pragma foreign_keys = on");
database.exec(await readFile(new URL(import.meta.resolve("@feedclip/activity/sqlite-migration.sql")), "utf8"));

try {
  const resource = { type: "invoice", id: "inv_sqlite_quickstart", title: "SQLite invoice" };
  const activity = createActivity({ adapter: sqliteAdapter(database) });
  await activity.track({
    resource,
    actor: { type: "system", id: "quickstart", name: "Quick start" },
    action: "create",
  });

  const page = await activity.queryPage({ resource, limit: 10 });
  assert.equal(page.total, 1);
  assert.equal(page.entries[0].action, "create");
  console.log("SQLite quick start passed");
} finally {
  database.close();
}
