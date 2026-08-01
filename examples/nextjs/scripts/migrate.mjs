import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const migration = await readFile(
    fileURLToPath(import.meta.resolve("@feedclip/activity/migration.sql")),
    "utf8",
  );
  await pool.query(migration);
  console.log("Activity schema is ready");
} finally {
  await pool.end();
}
