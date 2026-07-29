import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const requestedVersion = process.env.PACKAGE_VERSION || "latest";
const packageSpec = `@feedclip/activity@${requestedVersion}`;
const work = await mkdtemp(join(tmpdir(), "activity-registry-smoke-"));

const run = (command, args, cwd = work) => execFileSync(command, args, {
  cwd,
  encoding: "utf8",
  env: {
    ...process.env,
    npm_config_audit: "false",
    npm_config_fund: "false",
    npm_config_ignore_scripts: "true",
  },
  stdio: ["ignore", "pipe", "inherit"],
});

try {
  const resolvedVersion = run("npm", ["view", packageSpec, "version"]).trim();
  const packed = JSON.parse(run("npm", ["pack", packageSpec, "--json"]));
  const artifact = packed[0];
  const archive = join(work, artifact.filename);
  const names = artifact.files.map(({ path }) => path);
  const required = [
    "dist/index.js",
    "dist/index.cjs",
    "dist/react.js",
    "dist/adapters/memory.js",
    "dist/adapters/postgres.js",
    "dist/adapters/http.js",
    "dist/http.js",
    "dist/styles.css",
    "migrations/001_activity_schema.sql",
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
  ];
  const forbidden = [
    "SECURITY.md",
    "COMPATIBILITY.md",
    "MIGRATIONS.md",
    "API_STABILITY.md",
    "RELEASE_CHECKLIST.md",
  ];

  for (const file of required) assert(names.includes(file), `Published package is missing ${file}`);
  for (const file of forbidden) assert(!names.includes(file), `Published package contains ${file}`);
  assert(!names.some((name) => name.startsWith("src/") || name.startsWith("tests/")), "Published package contains source or test files");

  await writeFile(join(work, "package.json"), JSON.stringify({ private: true, type: "module" }));
  run("npm", ["install", archive, "react@19", "react-dom@19", "pg@8"]);
  await writeFile(join(work, "consumer.mjs"), `
    import assert from "node:assert/strict";
    import { createRequire } from "node:module";
    import { readFile } from "node:fs/promises";
    import { fileURLToPath } from "node:url";
    import { createActivity } from "@feedclip/activity";
    import { createMemoryStorageAdapter } from "@feedclip/activity/adapters/memory";
    import { postgresAdapter } from "@feedclip/activity/adapters/postgres";
    import pg from "pg";

    const expectedVersion = process.env.EXPECTED_VERSION;
    const metadata = JSON.parse(await readFile(
      new URL("./node_modules/@feedclip/activity/package.json", import.meta.url),
      "utf8",
    ));
    assert.equal(metadata.version, expectedVersion);

    const require = createRequire(import.meta.url);
    assert.equal(typeof require("@feedclip/activity").createActivity, "function");
    assert.equal(typeof require("@feedclip/activity/adapters/postgres").postgresAdapter, "function");

    let memoryId = 0;
    const memory = createActivity({
      adapter: createMemoryStorageAdapter(),
      idGenerator: () => \`00000000-0000-4000-8000-\${String(++memoryId).padStart(12, "0")}\`,
    });
    const memoryResource = { type: "smoke", id: "registry" };
    await memory.track({
      resource: memoryResource,
      actor: { type: "system", id: "npm", name: "npm smoke test" },
      action: "create",
    });
    assert.equal((await memory.query({ resource: memoryResource })).length, 1);

    if (process.env.DATABASE_URL) {
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      try {
        const migrationUrl = import.meta.resolve("@feedclip/activity/migration.sql");
        await pool.query(await readFile(fileURLToPath(migrationUrl), "utf8"));
        await pool.query("truncate activity_changes, activity_entries cascade");

        let id = 0;
        const activity = createActivity({
          adapter: postgresAdapter(pool),
          clock: () => new Date("2026-07-29T00:00:00.000Z"),
          idGenerator: () => \`10000000-0000-4000-8000-\${String(++id).padStart(12, "0")}\`,
        });
        const resource = { type: "invoice", id: "npm-registry-smoke", title: "Registry smoke" };
        const actor = { type: "user", id: "smoke-user", name: "Registry tester" };

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
        const page = await activity.queryPage({ resource, limit: 1, offset: 0 });
        assert.equal(updates.length, 1);
        assert.equal(updates[0].changes[0].after, "Approved");
        assert.equal(search.length, 1);
        assert.equal(search[0].action, "comment");
        assert.equal(page.entries.length, 1);
        assert.equal(page.total, 2);
        assert.equal(page.hasMore, true);
      } finally {
        await pool.end();
      }
    }
  `);
  execFileSync("node", ["consumer.mjs"], {
    cwd: work,
    env: { ...process.env, EXPECTED_VERSION: resolvedVersion },
    stdio: "inherit",
  });

  console.log(`Verified ${packageSpec} as ${resolvedVersion} from ${basename(archive)} (${artifact.entryCount} files)`);
} finally {
  await rm(work, { force: true, recursive: true });
}
