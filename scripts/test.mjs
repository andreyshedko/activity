import { mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";

await rm(".tmp/tests", { force: true, recursive: true });
await mkdir(".tmp/tests", { recursive: true });

await build({
  bundle: true,
  entryPoints: ["tests/activity.test.ts"],
  format: "esm",
  outfile: ".tmp/tests/activity.test.mjs",
  platform: "node",
  sourcemap: false,
  target: ["node22"],
});

const result = spawnSync(
  process.execPath,
  ["--test", ".tmp/tests/activity.test.mjs"],
  {
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);
