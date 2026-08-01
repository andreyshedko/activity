import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

await loadLocalEnvironment();
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

async function loadLocalEnvironment() {
  let contents;
  try {
    contents = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
