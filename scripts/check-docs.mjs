import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const files = [
  "README.md",
  "docs/README.md",
  "docs/authentication.md",
  "docs/adoption-study.md",
  "docs/commercial-options.md",
  "docs/cloud-mvp.md",
  "docs/customization.md",
  "docs/feedback.md",
  "docs/frameworks.md",
  "docs/headless.md",
  "docs/launch-kit.md",
  "docs/performance.md",
  "docs/PROJECT_HANDOFF.md",
  "docs/reliability.md",
  "docs/troubleshooting.md",
  "docs/use-cases.md",
  "examples/nextjs/README.md",
  "OWNER_ACTIONS.md",
];

for (const file of files) {
  const contents = await readFile(file, "utf8");
  for (const match of contents.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split("#", 1)[0];
    if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
    await access(resolve(dirname(file), decodeURIComponent(target)));
  }
}

const hub = await readFile("docs/README.md", "utf8");
for (const topic of ["Authentication", "Framework", "Troubleshooting", "Performance", "Feedback"]) {
  assert.match(hub, new RegExp(topic, "i"), `Documentation hub is missing ${topic}`);
}

console.log(`Verified ${files.length} documentation entrypoints and their local links`);
