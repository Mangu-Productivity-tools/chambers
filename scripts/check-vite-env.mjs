#!/usr/bin/env node
/**
 * FR-SEC-107 guard: Vite inlines every `VITE_`-prefixed variable into the
 * client bundle, so each one is public. Only the names in `ALLOWED_VITE_VARS`
 * (both plain on/off flags) may be referenced. Anything else — in `src/`,
 * `server/`, or a `.env*` file — fails the check, so a secret can never be
 * shipped by giving it a `VITE_` name.
 *
 * Run with `npm run check:env` (exit 0 clean, 1 violations).
 */
import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ALLOWED_VITE_VARS = Object.freeze(["VITE_AUTH_ENABLED", "VITE_ASSIST_ENABLED"]);

/** Directories scanned recursively, relative to the project root. */
export const SCAN_DIRS = Object.freeze(["src", "server"]);

const SKIP_DIRS = new Set(["node_modules", "dist", ".output", ".nitro", ".vercel", ".git"]);
const BINARY_EXT =
  /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|eot|pdf|zip|gz|mp4|webm|mp3|wasm)$/i;
const VITE_VAR = /(?<![A-Za-z0-9_])VITE_[A-Za-z0-9_]*/g;

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out);
    } else if (entry.isFile() && !BINARY_EXT.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Files the guard reads: everything under src/ and server/, plus root `.env*`. */
export function listScannedFiles(root) {
  const files = [];
  for (const dir of SCAN_DIRS) walk(join(root, dir), files);
  let rootEntries = [];
  try {
    rootEntries = readdirSync(root);
  } catch {
    // missing root: nothing to scan
  }
  for (const name of rootEntries) {
    if (!name.startsWith(".env")) continue;
    const full = join(root, name);
    if (statSync(full).isFile()) files.push(full);
  }
  return files.sort();
}

/** Every disallowed `VITE_*` reference in `text`, as `{ line, name }`. */
export function findViolationsInText(text, allowed = ALLOWED_VITE_VARS) {
  const allow = new Set(allowed);
  const found = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    for (const match of lines[i].matchAll(VITE_VAR)) {
      if (!allow.has(match[0])) found.push({ line: i + 1, name: match[0] });
    }
  }
  return found;
}

/** Scan the project at `root`; returns `{ file, line, name }[]` (file is root-relative). */
export function checkViteEnv(root, allowed = ALLOWED_VITE_VARS) {
  const violations = [];
  for (const file of listScannedFiles(root)) {
    const text = readFileSync(file, "utf8");
    for (const hit of findViolationsInText(text, allowed)) {
      violations.push({ file: relative(root, file).split(sep).join("/"), ...hit });
    }
  }
  return violations;
}

function isMain() {
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMain()) {
  const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
  const violations = checkViteEnv(root);
  if (violations.length === 0) {
    console.log(`[check-vite-env] ok — only ${ALLOWED_VITE_VARS.join(", ")} referenced`);
  } else {
    for (const v of violations) {
      console.error(`[check-vite-env] ${v.file}:${v.line} references ${v.name}`);
    }
    console.error(
      `[check-vite-env] ${violations.length} disallowed VITE_ reference(s). VITE_ variables are ` +
        `inlined into the public client bundle; allowed: ${ALLOWED_VITE_VARS.join(", ")}.`,
    );
    process.exit(1);
  }
}
