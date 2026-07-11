import { mkdir, readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";

await rm(".tmp/tests", { force: true, recursive: true });
await mkdir(".tmp/tests", { recursive: true });

await build({
  bundle: true,
  entryPoints: [
    "tests/activity.test.ts",
    "tests/react.test.tsx",
    "tests/postgres.test.ts",
  ],
  format: "esm",
  outExtension: { ".js": ".mjs" },
  outdir: ".tmp/tests",
  packages: "external",
  platform: "node",
  sourcemap: false,
  target: ["node22"],
});

const testFiles = (await readdir(".tmp/tests"))
  .filter((file) => file.endsWith(".test.mjs"))
  .map((file) => `.tmp/tests/${file}`);

const result = spawnSync(
  process.execPath,
  ["--test", ...testFiles],
  {
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);
