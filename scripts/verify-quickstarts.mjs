import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const examples = ["memory.mjs", "http.mjs", "postgres.mjs"];

for (const example of examples) {
  execFileSync("node", [resolve(root, "examples/quickstart", example)], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
}

console.log("Quick-start documentation verified");
