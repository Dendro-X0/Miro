import * as esbuild from "esbuild";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, "..");
const apiRoot = path.resolve(desktopRoot, "../miro-api");
const outDir = path.resolve(desktopRoot, "src-tauri/resources/miro-api");
const entry = path.resolve(apiRoot, "src/run-lean.ts");

process.env.MIRO_ENABLE_AUTH = "false";

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [entry],
  outfile: path.join(outDir, "index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: false,
  minify: false,
  logLevel: "info",
  banner: {
    js: "#!/usr/bin/env node",
  },
});

console.log(`[miro-desktop] API sidecar written to ${outDir}/index.mjs`);
