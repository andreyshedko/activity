import { mkdir, rm } from "node:fs/promises";
import { build } from "esbuild";

const entryPoints = {
  index: "src/index.ts",
  react: "src/react.ts",
  "adapters/memory": "src/adapters/memory.ts",
  "adapters/postgres": "src/adapters/postgres.ts",
};

await rm("dist", { force: true, recursive: true });
await mkdir("dist", { recursive: true });

for (const format of ["esm", "cjs"]) {
  await build({
    bundle: true,
    entryPoints,
    external: ["react", "react-dom"],
    format,
    jsx: "automatic",
    outExtension: { ".js": format === "esm" ? ".js" : ".cjs" },
    outdir: "dist",
    platform: "neutral",
    sourcemap: true,
    target: ["es2020"],
  });
}

await build({
  bundle: true,
  entryPoints: ["src/styles.css"],
  external: [],
  loader: { ".svg": "dataurl" },
  outfile: "dist/styles.css",
  minify: true,
});
