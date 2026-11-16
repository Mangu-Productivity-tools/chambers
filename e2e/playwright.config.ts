import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// The runner ships inside the `playwright` devDependency (>= 1.38), so no
// separate `@playwright/test` install is needed.
import { defineConfig, devices } from "playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

/**
 * `vite preview` is pinned to 127.0.0.1:8081 (strictPort) in vite.config.ts.
 * Set BASE_URL to point the suite at an already-running target instead (a
 * Vercel deployment for the post-deploy check); no local server is started then.
 */
export const LOCAL_BASE_URL = "http://127.0.0.1:8081";
const baseURL = (process.env.BASE_URL || LOCAL_BASE_URL).replace(/\/+$/, "");
const external = Boolean(process.env.BASE_URL);
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: here,
  testMatch: "**/*.spec.ts",
  outputDir: join(here, "test-results"),
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: join(here, "playwright-report"), open: "never" }],
    ["junit", { outputFile: join(here, "test-results", "junit.xml") }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // No service worker may answer for the network in these tests: the privacy
    // assertions must see every request the page makes.
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: external
    ? undefined
    : {
        // Production-mode bundle, same as the deploy, minus `db:migrate`
        // (`npm run build` would apply migrations if DATABASE_URL were set).
        command: "node scripts/with-app-env.mjs vite build && npm run preview",
        cwd: repoRoot,
        url: `${LOCAL_BASE_URL}/`,
        reuseExistingServer: !isCI,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
        // Launch posture: AI off. A real env entry beats .grok/app-env.json.
        env: { VITE_ASSIST_ENABLED: "false" },
      },
});
