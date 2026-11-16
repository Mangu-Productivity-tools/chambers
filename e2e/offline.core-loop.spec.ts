/**
 * FR-TST-102 groundwork — the core loop with the network gone.
 *
 * Two levels:
 *   1. warm: the loop's routes are visited once in-app while online, so their
 *      lazily loaded chunks are already in the page's module map; then the
 *      context goes offline for the whole loop. Proves the loop's logic itself
 *      (parse, tailor, letter, export) needs no network.
 *   2. cold: offline straight after the first page (/start) has loaded. This is
 *      the real FR-TST-102 bar and needs a precached app shell / service worker.
 */
import { expect, RESUME_MARKERS, runCoreLoop, test } from "./support/fixtures";

test.describe("offline core loop", () => {
  test("warm: passes offline once the loop's routes have been opened in-app", async ({ page, context, net, problems }) => {
    await page.goto("/start");
    await page.waitForLoadState("networkidle");
    // Client-side hops only: a full reload would drop the module map again.
    await page.getByRole("link", { name: /explore the studio first/i }).click();
    await expect(page).toHaveURL(/\/studio$/);
    const nav = page.getByRole("banner").getByRole("navigation");
    for (const [label, path] of [
      ["Tailor", /\/tailor$/],
      ["Letter", /\/letter$/],
      ["Export", /\/export$/],
    ] as const) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    }
    await page.getByRole("banner").getByRole("link", { name: "Start from a file" }).click();
    await expect(page).toHaveURL(/\/start$/);
    await page.waitForLoadState("networkidle");

    await context.setOffline(true);
    const wentOfflineAt = net.seen.length;
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);

    await runCoreLoop(page, { alreadyOnStart: true });

    // Offline, nothing can leave anyway; what matters is that the app did not even try.
    expect(net.carrying(RESUME_MARKERS, wentOfflineAt), "requests carrying resume markers while offline").toEqual([]);
    expect(net.summary(net.network().filter((r) => net.seen.indexOf(r) >= wentOfflineAt && r.method !== "GET")), "writes attempted while offline").toEqual([]);
    expect(problems.pageErrors, "uncaught page errors").toEqual([]);
    expect(problems.consoleErrors, "console errors").toEqual([]);
  });

  test("cold: passes offline straight after the first page load", async ({ page, context, problems }) => {
    test.fixme(
      process.env.E2E_OFFLINE_COLD !== "1",
      "App gap (FR-TST-102): no service worker / precached app shell. After /start loads and the context goes " +
        "offline, pasting and 'Build the sheet' work, but the client-side navigation to /studio needs lazily loaded " +
        "route chunks (/assets/studio-*.js and 11 siblings), which fail with net::ERR_INTERNET_DISCONNECTED; the " +
        "router then falls back to a full document load of /studio and the tab lands on the browser offline error " +
        "page. Run with E2E_OFFLINE_COLD=1 to reproduce.",
    );
    await runCoreLoop(page, {
      afterInitialLoad: async () => {
        await context.setOffline(true);
      },
    });
    expect(problems.pageErrors, "uncaught page errors").toEqual([]);
  });
});
