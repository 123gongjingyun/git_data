import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

function tryResolveLocalPlaywright() {
  try {
    return require.resolve("playwright");
  } catch {
    return null;
  }
}

function tryResolveCachedNpxPlaywright() {
  const npxRoot = path.join(process.env.HOME || "", ".npm", "_npx");
  if (!npxRoot || !fs.existsSync(npxRoot)) {
    return null;
  }

  const candidates = fs
    .readdirSync(npxRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(npxRoot, entry.name, "node_modules", "playwright", "index.mjs"))
    .filter((candidate) => fs.existsSync(candidate))
    .map((candidate) => ({
      candidate,
      mtimeMs: fs.statSync(candidate).mtimeMs,
    }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return candidates[0]?.candidate || null;
}

function resolvePlaywrightViaNpx() {
  const resolvedPath = execFileSync(
    "npx",
    [
      "--yes",
      "--package",
      "playwright",
      "node",
      "-e",
      "process.stdout.write(require.resolve('playwright'))",
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 15000,
    },
  ).trim();

  if (!resolvedPath) {
    throw new Error("npx playwright resolve returned an empty path");
  }

  return resolvedPath;
}

export async function loadPlaywright() {
  const resolvedPath =
    process.env.PLAYWRIGHT_MODULE_PATH ||
    tryResolveLocalPlaywright() ||
    tryResolveCachedNpxPlaywright() ||
    resolvePlaywrightViaNpx();
  return import(pathToFileURL(resolvedPath).href);
}
