import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";

await rm("dist", { force: true, recursive: true });
await mkdir("dist/assets", { recursive: true });

await build({
  bundle: true,
  entryNames: "main",
  entryPoints: ["src/main.tsx"],
  format: "esm",
  jsx: "automatic",
  loader: {
    ".svg": "dataurl",
  },
  minify: true,
  outdir: "dist/assets",
  platform: "browser",
  sourcemap: false,
  splitting: false,
  target: ["es2020"],
});

const sourceHtml = await readFile("index.html", "utf8");
const html = sourceHtml.replace(
  '<script type="module" src="/src/main.tsx"></script>',
  '<link rel="stylesheet" href="/assets/main.css" />\n    <script type="module" src="/assets/main.js"></script>',
);

await writeFile("dist/index.html", html);
