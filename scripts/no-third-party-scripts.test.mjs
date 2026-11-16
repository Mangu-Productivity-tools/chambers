/**
 * FR-SEC-104: the app loads no third-party script. Every source file under
 * `src/` and `server/`, plus every HTML template in the repo, is scanned for
 *  - a `<script>` tag whose `src` is absolute (`http:`, `https:` or `//host`),
 *  - any URL on grok.com (the host of the injected app-builder extension
 *    removed in v25.4), and
 *  - any absolute URL to a JavaScript file.
 * The allowlist is empty and should stay that way.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** External script hosts permitted to be referenced. Intentionally empty. */
export const ALLOWED_SCRIPT_HOSTS = Object.freeze([]);

const SOURCE_DIRS = ["src", "server"];
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".output",
  ".nitro",
  ".vercel",
  ".git",
  ".tanstack",
]);
const TEXT_EXT = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|html|htm|json|css|md|mdx|svg|txt)$/i;

const RULES = [
  {
    name: "external <script src>",
    // <script ... src="https://host/..."> or src="//host/..." (any quote style, or JSX {"..."}).
    pattern: /<script\b[^>]*?\bsrc\s*=\s*\{?\s*["'`]?\s*(?:https?:)?\/\/([^/"'`\s>}]+)/gi,
  },
  {
    name: "grok.com URL",
    pattern: /(?:https?:)?\/\/((?:[a-z0-9-]+\.)*grok\.com)(?![a-z0-9.-])/gi,
  },
  {
    name: "external JavaScript URL",
    pattern: /(?:https?:)?\/\/([a-z0-9.-]+\.[a-z]{2,})(?::\d+)?\/[^\s"'`<>)]*\.m?js(?![a-z0-9])/gi,
  },
];

function walk(dir, keep, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, keep, out);
    } else if (entry.isFile() && keep(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

export function listScannedFiles(root) {
  const files = new Set();
  for (const dir of SOURCE_DIRS) {
    for (const file of walk(join(root, dir), (name) => TEXT_EXT.test(name))) files.add(file);
  }
  // HTML templates anywhere in the repo (index.html, scripts/*.html, public/**).
  for (const file of walk(root, (name) => /\.html?$/i.test(name))) files.add(file);
  return [...files].sort();
}

export function findExternalScriptRefs(text, allowedHosts = ALLOWED_SCRIPT_HOSTS) {
  const allow = new Set(allowedHosts.map((host) => host.toLowerCase()));
  const hits = [];
  const seen = new Set();
  for (const { name, pattern } of RULES) {
    for (const match of text.matchAll(pattern)) {
      const host = match[1].toLowerCase();
      if (allow.has(host)) continue;
      const line = text.slice(0, match.index).split("\n").length;
      const key = `${line}:${host}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ line, host, rule: name });
    }
  }
  return hits.sort((a, b) => a.line - b.line);
}

test("allowlist of external script hosts is empty", () => {
  assert.deepEqual([...ALLOWED_SCRIPT_HOSTS], []);
});

test("detector: flags external <script src> in HTML and JSX", () => {
  const hosts = (text) => findExternalScriptRefs(text).map((hit) => hit.host);
  assert.deepEqual(hosts('<script src="https://cdn.example.com/a.js"></script>'), [
    "cdn.example.com",
  ]);
  assert.deepEqual(hosts("<script async src='http://evil.example/x'></script>"), ["evil.example"]);
  assert.deepEqual(hosts('<script\n  defer\n  src="//cdn.example.com/lib"></script>'), [
    "cdn.example.com",
  ]);
  assert.deepEqual(hosts('<script src={"https://cdn.example.com/a"} />'), ["cdn.example.com"]);
});

test("detector: flags grok.com URLs and external .js URLs", () => {
  const hosts = (text) => findExternalScriptRefs(text).map((hit) => hit.host);
  assert.deepEqual(hosts('s.src = "https://grok.com/grok-app-builder/extensions.js";'), [
    "grok.com",
  ]);
  assert.deepEqual(hosts('fetch("//assets.grok.com/x")'), ["assets.grok.com"]);
  assert.deepEqual(hosts('import("https://unpkg.com/pkg@1/dist/index.mjs")'), ["unpkg.com"]);
});

test("detector: ignores inline scripts, local scripts and non-script URLs", () => {
  for (const text of [
    "<script>window.x = 1;</script>",
    '<script src="/assets/app.js"></script>',
    '<script type="module" src="./main.tsx"></script>',
    'const BASE = "https://api.example.com/v1/chat/completions";',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    "const url = `https://${resume.identity.website}`;",
    '"https://gate.grok.me/__gate/signin"',
    '"https://x.grok-sandbox.com/api"',
  ]) {
    assert.deepEqual(findExternalScriptRefs(text), [], text);
  }
});

test("detector: honours an explicit allowlist", () => {
  const text = '<script src="https://cdn.example.com/a.js"></script>';
  assert.deepEqual(findExternalScriptRefs(text, ["cdn.example.com"]), []);
});

test("no file under src/, server/ or any HTML template references an external script host", () => {
  const files = listScannedFiles(REPO_ROOT);
  assert.ok(
    files.some((file) => file.startsWith(join(REPO_ROOT, "src") + sep)),
    "expected to scan at least one file under src/",
  );
  const violations = [];
  for (const file of files) {
    for (const hit of findExternalScriptRefs(readFileSync(file, "utf8"))) {
      violations.push(
        `${relative(REPO_ROOT, file).split(sep).join("/")}:${hit.line} ${hit.rule} -> ${hit.host}`,
      );
    }
  }
  assert.deepEqual(violations, []);
});
