import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ALLOWED_VITE_VARS, checkViteEnv, findViolationsInText } from "./check-vite-env.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "check-vite-env.mjs");
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function workspace(files) {
  const root = mkdtempSync(join(tmpdir(), "check-vite-env-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [SCRIPT, root], { encoding: "utf8" });
}

test("allowlist is exactly the two public flags", () => {
  assert.deepEqual([...ALLOWED_VITE_VARS], ["VITE_AUTH_ENABLED", "VITE_ASSIST_ENABLED"]);
});

test("allowed names pass, in code and in comments", () => {
  const text = [
    'export const a = import.meta.env.VITE_AUTH_ENABLED !== "false";',
    "// VITE_ASSIST_ENABLED defaults to off",
  ].join("\n");
  assert.deepEqual(findViolationsInText(text), []);
});

test("reports disallowed names with line numbers", () => {
  const text = "const ok = 1;\nconst k = import.meta.env.VITE_API_KEY;\n";
  assert.deepEqual(findViolationsInText(text), [{ line: 2, name: "VITE_API_KEY" }]);
});

test("a longer name sharing an allowed prefix is still rejected", () => {
  assert.deepEqual(findViolationsInText("VITE_AUTH_ENABLED_SECRET=x"), [
    { line: 1, name: "VITE_AUTH_ENABLED_SECRET" },
  ]);
});

test("does not flag identifiers that merely contain VITE_", () => {
  assert.deepEqual(findViolationsInText("const INVITE_CODE = 1; const MY_VITE_X = 2;"), []);
});

test("scans src/, server/ and .env* files; ignores other locations", () => {
  const root = workspace({
    "src/a.ts": "import.meta.env.VITE_STUN_URLS",
    "server/b.ts": 'process.env["VITE_TOKEN"]',
    ".env.local": "VITE_SECRET=abc\nVITE_AUTH_ENABLED=false\n",
    ".env.example": "VITE_ASSIST_ENABLED=false\n",
    "scripts/c.mjs": "VITE_IGNORED_HERE",
    "src/node_modules/x/index.js": "VITE_IGNORED_TOO",
  });
  assert.deepEqual(checkViteEnv(root), [
    { file: ".env.local", line: 1, name: "VITE_SECRET" },
    { file: "server/b.ts", line: 1, name: "VITE_TOKEN" },
    { file: "src/a.ts", line: 1, name: "VITE_STUN_URLS" },
  ]);
});

test("CLI exits 0 on a clean tree", () => {
  const root = workspace({
    "src/a.ts": "import.meta.env.VITE_AUTH_ENABLED",
    ".env.example": "VITE_AUTH_ENABLED=false\n",
  });
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
});

test("CLI exits 1 and names the offender", () => {
  const root = workspace({ "src/a.ts": "import.meta.env.VITE_API_KEY" });
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /src\/a\.ts:1 references VITE_API_KEY/);
});

test("CLI exits 0 when src/ and server/ do not exist", () => {
  assert.equal(run(workspace({ "README.md": "hi" })).status, 0);
});

test("this repository passes the guard", () => {
  assert.deepEqual(checkViteEnv(REPO_ROOT), []);
});
