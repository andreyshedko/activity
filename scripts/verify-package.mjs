import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const work = await mkdtemp(join(tmpdir(), "activity-package-"));
let tarball;

const run = (command, args, cwd = root) => execFileSync(command, args, {
  cwd,
  encoding: "utf8",
  env: { ...process.env, npm_config_audit: "false", npm_config_fund: "false" },
  stdio: ["ignore", "pipe", "inherit"],
});

try {
  const pack = JSON.parse(run("npm", ["pack", "--json", "--ignore-scripts"]));
  const artifact = pack[0];
  tarball = join(root, artifact.filename);
  const names = artifact.files.map(({ path }) => path);
  const required = [
    "dist/index.js",
    "dist/index.cjs",
    "dist/index.d.ts",
    "dist/react.js",
    "dist/react.cjs",
    "dist/styles.css",
    "migrations/001_activity_schema.sql",
    "README.md",
    "SECURITY.md",
    "COMPATIBILITY.md",
    "MIGRATIONS.md",
    "API_STABILITY.md",
  ];

  for (const file of required) assert(names.includes(file), `Package is missing ${file}`);
  assert(artifact.size <= 250_000, `Tarball is too large: ${artifact.size} bytes`);
  assert(artifact.unpackedSize <= 1_000_000, `Unpacked package is too large: ${artifact.unpackedSize} bytes`);
  assert(!names.some((name) => name.startsWith("src/") || name.startsWith("tests/") || name === ".env"), "Package contains development or environment files");

  const secretPattern = /(npm_[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@)/;
  for (const { path } of artifact.files) {
    if (!/\.(?:js|cjs|mjs|json|md|css|sql|ts)$/.test(path)) continue;
    const contents = readFile(join(root, path), "utf8");
    assert(!secretPattern.test(await contents), `Possible secret found in ${path}`);
  }

  await writeFile(join(work, "package.json"), JSON.stringify({ type: "module", private: true }));
  await writeFile(join(work, "verify.mjs"), `
    import assert from "node:assert/strict";
    import * as activity from "@feedclip/activity";
    import { ActivityPanel } from "@feedclip/activity/react";
    import { createMemoryStorageAdapter } from "@feedclip/activity/adapters/memory";
    import { createElement } from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    assert.equal(typeof activity.createActivity, "function");
    assert.equal(typeof createMemoryStorageAdapter, "function");
    const client = activity.createActivity({ adapter: createMemoryStorageAdapter() });
    assert.match(renderToStaticMarkup(createElement(ActivityPanel, {
      activity: client,
      entries: [],
      resource: { type: "test", id: "consumer" },
    })), /activity/i);
  `);
  for (const reactVersion of ["18", "19"]) {
    await rm(join(work, "node_modules"), { force: true, recursive: true });
    await rm(join(work, "package-lock.json"), { force: true });
    run("npm", ["install", tarball, `react@${reactVersion}`, `react-dom@${reactVersion}`], work);
    run("node", ["verify.mjs"], work);
  }
  await writeFile(join(work, "verify.cjs"), `
    const assert = require("node:assert/strict");
    assert.equal(typeof require("@feedclip/activity").createActivity, "function");
    assert.equal(typeof require("@feedclip/activity/react").ActivityPanel, "function");
    assert.equal(typeof require("@feedclip/activity/adapters/postgres").postgresAdapter, "function");
  `);
  run("node", ["verify.cjs"], work);
  await rm(tarball, { force: true });
  console.log(`Verified ${artifact.filename}: ${artifact.entryCount} files, ${artifact.size} bytes packed`);
} finally {
  if (tarball) await rm(tarball, { force: true });
  await rm(work, { force: true, recursive: true });
}
