/**
 * FR-TST-105 — privacy invariant across the core loop.
 *
 * Paste a synthetic resume, paste a synthetic posting, run the local tailor,
 * open the letter and export. Across the whole flow:
 *   (i)   no request goes to any host other than the app origin,
 *   (ii)  no request of any method carries the resume's marker strings in its
 *         URL or body (raw, URL-encoded or base64),
 *   (iii) no request goes to grok.com / x.ai.
 */
import { expect, PERSON, POSTING, RESUME_MARKERS, runCoreLoop, test } from "./support/fixtures";

test.describe("privacy invariant", () => {
  test("resume text never leaves the browser during the core loop", async ({ page, net, problems, origin }) => {
    await runCoreLoop(page);
    // Let the debounced localStorage write (400ms) and any trailing beacon settle.
    await page.waitForTimeout(1_000);
    await page.waitForLoadState("networkidle");

    // Sanity: the recorder saw the app's own traffic, so an empty violation list means something.
    expect(net.network().length, "recorded requests").toBeGreaterThan(3);

    // (i) same-origin only
    expect(net.summary(net.offOrigin(origin)), "requests to hosts other than the app origin").toEqual([]);
    // (iii) never grok.com / x.ai
    expect(net.summary(net.forbidden()), "requests to grok.com / x.ai").toEqual([]);
    // (ii) no marker in any URL or body, any method
    expect(net.carrying(RESUME_MARKERS), "requests carrying resume markers").toEqual([]);
    // The posting and target are user input too; with AI off they stay local as well.
    expect(net.carrying([POSTING.company, "Kubernetes experience is a plus"]), "requests carrying the posting").toEqual([]);
    // AI off: the loop needs no upstream write at all (no server function, no beacon).
    expect(net.summary(net.writes()), "non-GET requests during the loop").toEqual([]);

    expect(problems.pageErrors, "uncaught page errors").toEqual([]);
    expect(problems.consoleErrors, "console errors").toEqual([]);

    // The data did go somewhere: this browser's localStorage, and nowhere else.
    const stored = await page.evaluate(() => localStorage.getItem("chambers-studio") ?? "");
    expect(stored).toContain(PERSON.email);
    const cookies = await page.context().cookies();
    for (const c of cookies) {
      for (const m of RESUME_MARKERS) {
        expect(decodeURIComponent(c.value), `cookie ${c.name}`).not.toContain(m);
      }
    }
  });

  test("the recorder catches a leak (self-check)", async ({ page, net, origin }) => {
    await page.goto("/start");
    // Simulate the exact failure the invariant guards against, from inside the page.
    await page.evaluate(
      async ({ email, name }) => {
        await fetch("/__e2e-leak-probe", { method: "POST", body: JSON.stringify({ resume: `${name} <${email}>` }) }).catch(() => {});
        await fetch(`/__e2e-leak-probe?q=${encodeURIComponent(name)}`).catch(() => {});
        await fetch("/__e2e-leak-probe", { method: "PUT", body: btoa(`x ${email} y`) }).catch(() => {});
        await fetch("https://api.x.ai/v1/e2e-probe", { method: "POST", body: "{}", mode: "no-cors" }).catch(() => {});
      },
      { email: PERSON.email, name: PERSON.name },
    );
    const hits = net.carrying(RESUME_MARKERS);
    expect(hits.filter((h) => h.where === "body").length, "body hits (JSON + base64)").toBeGreaterThanOrEqual(2);
    expect(hits.filter((h) => h.where === "url").length, "URL hits").toBeGreaterThanOrEqual(1);
    expect(net.forbidden().length, "x.ai request recorded").toBe(1);
    expect(net.offOrigin(origin).length, "off-origin request recorded").toBe(1);
    expect(net.writes().length).toBeGreaterThanOrEqual(3);
  });
});
