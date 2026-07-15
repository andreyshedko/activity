import { mkdir, readFile, writeFile } from "node:fs/promises";

const declarationFiles = [
  "dist/index.d.ts",
  "dist/react.d.ts",
  "dist/adapters/memory.d.ts",
  "dist/adapters/postgres.d.ts",
];
const snapshotPath = "api/public-api.snapshot.txt";
const sections = [];
for (const file of declarationFiles) {
  sections.push(`## ${file}\n\n${(await readFile(file, "utf8")).trim()}\n`);
}
const current = `${sections.join("\n")}\n`;

if (process.argv.includes("--update")) {
  await mkdir("api", { recursive: true });
  await writeFile(snapshotPath, current);
  console.log(`Updated ${snapshotPath}`);
} else {
  const expected = await readFile(snapshotPath, "utf8");
  if (current !== expected) {
    console.error("Public API declarations changed.");
    console.error("Review compatibility, update API_STABILITY.md/CHANGELOG.md, then run npm run api:update.");
    process.exit(1);
  }
  console.log("Public API declarations match the reviewed snapshot.");
}
