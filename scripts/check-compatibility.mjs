import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const baselinePath = join(root, "api/compatibility-baseline.json");
const storedBaseline = JSON.parse(await readFile(baselinePath, "utf8"));
const baselinePackage = process.env.API_BASELINE_PACKAGE || storedBaseline.baseline;
const update = process.argv.includes("--update-baseline");

if (update) {
  const work = await mkdtemp(join(tmpdir(), "activity-api-baseline-"));
  try {
    const localBaseline = baselinePackage === ".";
    const packed = JSON.parse(execFileSync("npm", ["pack", baselinePackage, "--json", "--ignore-scripts"], {
      cwd: localBaseline ? root : work,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    }));
    execFileSync("tar", ["-xzf", join(localBaseline ? root : work, packed[0].filename)], { cwd: work });
    execFileSync("npm", ["install", "--no-save", "--ignore-scripts", "react@19", "react-dom@19"], {
      cwd: join(work, "package"),
      stdio: "inherit",
    });
    const manifest = await collectSurface(join(work, "package"));
    manifest.baseline = localBaseline ? `${manifest.packageName}@${manifest.packageVersion}` : baselinePackage;
    manifest.generatedFrom = localBaseline ? "reviewed local release candidate" : "npm registry tarball";
    await writeFile(baselinePath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Updated ${relative(root, baselinePath)} from ${baselinePackage}`);
  } finally {
    await rm(work, { force: true, recursive: true });
  }
} else {
  const baseline = storedBaseline;
  const current = await collectSurface(root);

  for (const [entrypoint, targets] of Object.entries(baseline.entrypoints)) {
    assert(current.entrypoints[entrypoint], `Removed public entrypoint: ${entrypoint}`);
    for (const condition of Object.keys(targets)) {
      assert(condition in current.entrypoints[entrypoint], `Removed ${condition} target from ${entrypoint}`);
    }
  }
  for (const [entrypoint, formats] of Object.entries(baseline.runtimeExports)) {
    for (const [format, names] of Object.entries(formats)) {
      const currentNames = current.runtimeExports[entrypoint]?.[format] ?? [];
      for (const name of names) {
        assert(currentNames.includes(name), `Removed ${format} export ${name} from ${entrypoint}`);
      }
    }
  }
  for (const [file, digest] of Object.entries(baseline.declarations)) {
    assert.equal(current.declarations[file], digest, `Public declaration changed: ${file}`);
  }
  for (const [file, digest] of Object.entries(baseline.migrations)) {
    assert.equal(current.migrations[file], digest, `Released migration changed: ${file}`);
  }
  for (const [file, digest] of Object.entries(baseline.publicAssets)) {
    assert.equal(current.publicAssets[file], digest, `Public asset changed: ${file}`);
  }

  console.log(`Current package is backward-compatible with ${baseline.baseline}`);
}

async function collectSurface(directory) {
  const metadata = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
  const entrypoints = Object.fromEntries(
    Object.entries(metadata.exports).map(([key, value]) => [key, normalizeTargets(value)]),
  );
  const runtimeExports = {};
  const require = createRequire(import.meta.url);

  for (const [entrypoint, targets] of Object.entries(entrypoints)) {
    const formats = {};
    if (targets.import?.endsWith(".js")) {
      const module = await import(`${pathToFileURL(join(directory, targets.import)).href}?audit=${Date.now()}`);
      formats.import = Object.keys(module).sort();
    }
    if (targets.require?.endsWith(".cjs")) {
      formats.require = Object.keys(require(join(directory, targets.require))).sort();
    }
    if (Object.keys(formats).length) runtimeExports[entrypoint] = formats;
  }

  return {
    packageName: metadata.name,
    packageVersion: metadata.version,
    entrypoints,
    runtimeExports,
    declarations: await hashFiles(directory, "dist", (name) => name.endsWith(".d.ts")),
    migrations: await hashFiles(directory, "migrations", (name) => name.endsWith(".sql")),
    publicAssets: await hashFiles(directory, "dist", (name) => name.endsWith(".css")),
  };
}

function normalizeTargets(value) {
  if (typeof value === "string") return { default: value };
  return Object.fromEntries(Object.entries(value));
}

async function hashFiles(rootDirectory, subdirectory, include) {
  const base = join(rootDirectory, subdirectory);
  const files = await walk(base);
  const result = {};
  for (const file of files.filter(include).sort()) {
    const path = join(base, file);
    const contents = await readFile(path);
    result[join(subdirectory, file)] = createHash("sha256").update(contents).digest("hex");
  }
  return result;
}

async function walk(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const name = join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await walk(join(directory, entry.name), name));
    else files.push(name);
  }
  return files;
}
