import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const work = await mkdtemp(join(tmpdir(), "activity-init-"));

const run = (args) => execFileSync("node", [join(root, "bin/activity-init.mjs"), ...args], {
  cwd: work,
  encoding: "utf8",
});

try {
  const memoryOutput = run(["init", "memory-app", "--template", "react-memory"]);
  assert.match(memoryOutput, /Created Activity react-memory starter/);
  assert.match(await readFile(join(work, "memory-app/src/activity.ts"), "utf8"), /createMemoryStorageAdapter/);
  assert.match(await readFile(join(work, "memory-app/src/ActivityHistory.tsx"), "utf8"), /ActivityPanel/);

  const postgresOutput = run(["init", "next-app", "--template", "next-postgres"]);
  assert.match(postgresOutput, /Created Activity next-postgres starter/);
  assert.match(await readFile(join(work, "next-app/activity/server.ts"), "utf8"), /postgresAdapter/);
  assert.match(await readFile(join(work, "next-app/app/api/activity/route.ts"), "utf8"), /authorize/);
  assert.match(await readFile(join(work, "next-app/migrations/001_activity_schema.sql"), "utf8"), /activity_entries/);

  assert.throws(
    () => run(["init", "memory-app", "--template", "react-memory"]),
    /Command failed/,
  );
  run(["init", "memory-app", "--template", "react-memory", "--force"]);
  console.log("Activity init templates verified");
} finally {
  await rm(work, { force: true, recursive: true });
}
