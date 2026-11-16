import { expect, test as base, type BrowserContext, type Page, type Request } from "playwright/test";

/* ----------------------------- synthetic data ----------------------------- */

/** Obviously fake person. Every value below is a marker that must never leave the browser. */
export const PERSON = {
  name: "Testa Persona-Zzyzx",
  email: "testa.persona.zzyzx@example.com",
  phone: "555-0100-7741",
  employer: "Quuxbridge Fictional Holdings",
  token: "CHMBRS-MARKER-7Q4X9",
};

export const RESUME_TEXT = `${PERSON.name}
Senior Editorial Systems Designer
${PERSON.email} | ${PERSON.phone} | Nowhere, ZZ

Summary
Designer who builds publishing workflows and content systems. Reference ${PERSON.token}.

Experience
Senior Systems Designer, ${PERSON.employer}, 2019 - Present
- Led redesign of the editorial workflow for 40 editors, cutting publish time by 30%
- Built a component library in Figma and React used across 6 product teams
- Ran accessibility audits and shipped WCAG AA fixes across the content platform

Product Designer, Blarghaven Imaginary Press, 2015 - 2019
- Designed a content management system for long-form publishing
- Partnered with engineering on a design system and documentation

Education
BA Design, University of Nowhere, 2015

Skills
Figma, React, Design systems, Accessibility, Content strategy, User research, Prototyping, Editorial workflow
`;

export const POSTING = {
  company: "Fakecorp Synthetic Ltd",
  role: "Staff Product Designer",
  text: `Fakecorp Synthetic Ltd is hiring a Staff Product Designer for our publishing platform.
You will own the editorial workflow and the design system, partner with engineering,
and raise the accessibility bar across the content management system.

Requirements
- 6+ years of product design experience with design systems and component libraries
- Strong Figma and prototyping skills; working knowledge of React
- Experience running user research and accessibility (WCAG) audits
- Clear writing and content strategy for long-form publishing
- Kubernetes experience is a plus`,
};

/** Strings that identify the resume; checked raw, URL-encoded and base64-encoded. */
export const RESUME_MARKERS = [
  PERSON.name,
  PERSON.email,
  PERSON.phone,
  PERSON.employer,
  PERSON.token,
  "Blarghaven Imaginary Press",
];

/** Hosts the launch posture forbids outright (FR-TST-105 iii). */
export const FORBIDDEN_HOSTS = /(^|\.)(grok\.com|x\.ai|grok\.me)$/i;

/* ---------------------------- network recording --------------------------- */

export type Seen = {
  method: string;
  url: string;
  resourceType: string;
  body: string;
  kind: "http" | "websocket";
};

const LOCAL_SCHEMES = /^(data|blob|about|chrome-extension|chrome):/i;

function needles(marker: string): string[] {
  const b64 = Buffer.from(marker, "utf8").toString("base64").replace(/=+$/, "");
  return [
    marker,
    encodeURIComponent(marker),
    encodeURIComponent(marker).replace(/%20/g, "+"),
    // Skip the last 4 chars: they depend on what follows the marker in the payload.
    b64.slice(0, Math.max(8, b64.length - 4)),
  ].map((s) => s.toLowerCase());
}

export class NetworkLog {
  readonly seen: Seen[] = [];
  constructor(context: BrowserContext) {
    context.on("request", (req: Request) => {
      let body = "";
      try {
        body = req.postData() ?? "";
        if (!body) body = req.postDataBuffer()?.toString("latin1") ?? "";
      } catch {
        body = "";
      }
      this.seen.push({
        method: req.method(),
        url: req.url(),
        resourceType: req.resourceType(),
        body,
        kind: "http",
      });
    });
    context.on("page", (page) => this.watchPage(page));
    for (const page of context.pages()) this.watchPage(page);
  }

  private watchPage(page: Page) {
    page.on("websocket", (ws) => {
      const entry: Seen = { method: "WS", url: ws.url(), resourceType: "websocket", body: "", kind: "websocket" };
      this.seen.push(entry);
      ws.on("framesent", (f) => {
        entry.body += typeof f.payload === "string" ? f.payload : f.payload.toString("latin1");
      });
    });
  }

  /** Requests that actually hit a network (data:/blob: never leave the browser). */
  network(): Seen[] {
    return this.seen.filter((r) => !LOCAL_SCHEMES.test(r.url));
  }

  offOrigin(origin: string): Seen[] {
    const want = new URL(origin);
    return this.network().filter((r) => {
      const u = new URL(r.url);
      // ws(s) to the app host counts as same origin.
      return u.host !== want.host;
    });
  }

  forbidden(): Seen[] {
    return this.network().filter((r) => FORBIDDEN_HOSTS.test(new URL(r.url).hostname));
  }

  /** Requests whose URL or body contains any marker. `from` limits the scan to requests recorded at or after that index. */
  carrying(markers: string[], from = 0): { marker: string; where: "url" | "body"; request: string }[] {
    const hits: { marker: string; where: "url" | "body"; request: string }[] = [];
    for (const r of this.seen.slice(from)) {
      // blob:/data: URLs are local, but a data: URL would still embed the text; only skip blob:.
      if (/^blob:/i.test(r.url)) continue;
      const url = r.url.toLowerCase();
      let decoded = url;
      try {
        decoded = decodeURIComponent(url);
      } catch {
        /* keep raw */
      }
      const body = r.body.toLowerCase();
      for (const marker of markers) {
        for (const n of needles(marker)) {
          if (url.includes(n) || decoded.includes(n)) {
            hits.push({ marker, where: "url", request: `${r.method} ${r.url.slice(0, 200)}` });
            break;
          }
          if (body.includes(n)) {
            hits.push({ marker, where: "body", request: `${r.method} ${r.url.slice(0, 200)}` });
            break;
          }
        }
      }
    }
    return hits;
  }

  /** Same-origin requests that could carry a payload upstream. */
  writes(): Seen[] {
    return this.network().filter((r) => !["GET", "HEAD", "OPTIONS"].includes(r.method));
  }

  summary(list: Seen[] = this.network()): string[] {
    return list.map((r) => `${r.method} ${r.url}`);
  }
}

/* ------------------------------ page problems ------------------------------ */

export class PageProblems {
  readonly pageErrors: string[] = [];
  readonly consoleErrors: string[] = [];
  constructor(page: Page) {
    page.on("pageerror", (err) => this.pageErrors.push(String(err?.stack || err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") this.consoleErrors.push(`${msg.text()} @ ${msg.location().url}`);
    });
  }
}

/* --------------------------------- fixtures -------------------------------- */

export const test = base.extend<{ net: NetworkLog; problems: PageProblems; origin: string }>({
  origin: async ({ baseURL }, provide) => {
    await provide(new URL(baseURL!).origin);
  },
  net: async ({ context }, provide) => {
    await provide(new NetworkLog(context));
  },
  problems: async ({ page }, provide) => {
    await provide(new PageProblems(page));
  },
});

export { expect };

/* -------------------------------- core loop -------------------------------- */

/** The primary nav is only visible at >= lg; the config pins a 1440px viewport. */
function primaryNav(page: Page) {
  return page.getByRole("banner").getByRole("navigation");
}

/** Content region holding the live US-Letter sheet (resume or letter) on studio/tailor/letter. */
export function paper(page: Page) {
  return page.locator("#main");
}

export type LoopOptions = {
  /** Called once /start has rendered and before any resume text is typed. */
  afterInitialLoad?: (page: Page) => Promise<void>;
  /** The page is already on step 1 of /start (reached in-app); do not reload it. */
  alreadyOnStart?: boolean;
};

/**
 * Paste resume -> studio -> paste posting -> local tailor -> letter -> export.
 * Every hop after the first page load is a client-side navigation, exactly as a
 * user would move through the app.
 */
export async function runCoreLoop(page: Page, opts: LoopOptions = {}) {
  await test.step("open /start", async () => {
    if (!opts.alreadyOnStart) await page.goto("/start");
    await expect(page).toHaveURL(/\/start$/);
    await expect(page.getByRole("heading", { level: 1, name: /existing resume/i })).toBeVisible();
    // Buttons are inert until React hydrates; the module graph being idle is the signal.
    await page.waitForLoadState("networkidle");
  });

  if (opts.afterInitialLoad) await opts.afterInitialLoad(page);

  await test.step("paste the synthetic resume", async () => {
    await page.getByRole("button", { name: /paste or (upload|choose a file)/i }).click();
    const box = page.getByPlaceholder(/name, headline, roles, bullets/i);
    await expect(box).toBeVisible();
    await box.fill(RESUME_TEXT);
    await page.getByRole("button", { name: /build the sheet/i }).click();
    await expect(page).toHaveURL(/\/studio$/);
    // AI-off posture: the local-only toast, never the "Refining structure…" one.
    // Toast copy checks are soft so that, if the assistant is on, the loop still
    // runs to the end and the network assertions report what actually leaked.
    await expect.soft(page.getByText("On paper. Stays on this device.")).toBeVisible();
    await expect.soft(page.getByText(/refining structure/i)).toHaveCount(0);
    await expect(paper(page)).toContainText(PERSON.name);
    await expect(paper(page)).toContainText(PERSON.email);
  });

  await test.step("paste the posting and run the local tailor", async () => {
    await primaryNav(page).getByRole("link", { name: "Tailor", exact: true }).click();
    await expect(page).toHaveURL(/\/tailor$/);
    await expect(page.getByRole("heading", { level: 1, name: /one posting/i })).toBeVisible();
    await page.getByLabel("Company").fill(POSTING.company);
    await page.getByLabel("Role").fill(POSTING.role);
    await page.getByLabel("Job description").fill(POSTING.text);
    await page.getByRole("button", { name: "Tailor this resume" }).click();
    await expect.soft(page.getByText("Local tailor applied. Nothing was added.")).toBeVisible();
    await expect.soft(page.getByText("Tailored from your facts")).toHaveCount(0);
    // Tailoring leaves a snapshot to compare against and to undo.
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Original", exact: true })).toBeVisible();
    await expect(paper(page)).toContainText(PERSON.name);
    await page.getByRole("button", { name: "Draft cover letter" }).click();
    await expect.soft(page.getByText("Drafted a local letter.")).toBeVisible();
  });

  await test.step("open the letter", async () => {
    await page.getByRole("link", { name: /open the letter/i }).click();
    await expect(page).toHaveURL(/\/letter$/);
    await expect(page.getByRole("heading", { level: 1, name: /same voice as the sheet/i })).toBeVisible();
    await expect(page.getByLabel("Company")).toHaveValue(POSTING.company);
    await expect(page.getByLabel("Body")).not.toHaveValue("");
    await page.getByRole("button", { name: "Generate letter" }).click();
    await expect.soft(page.getByText("Local draft — assistant unavailable.")).toBeVisible();
    await expect.soft(page.getByText("Letter drafted", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Body")).not.toHaveValue("");
    await expect(paper(page)).toContainText(PERSON.name);
  });

  await test.step("open export and download", async () => {
    await primaryNav(page).getByRole("link", { name: "Export", exact: true }).click();
    await expect(page).toHaveURL(/\/export$/);
    await expect(page.getByRole("heading", { level: 1, name: /take the paper with you/i })).toBeVisible();
    const ready = page.getByRole("main").getByRole("list").first();
    await expect(ready).toContainText("Name on the sheet");
    await expect(ready).toContainText("Posting on file");
    await expect(ready).toContainText("Cover letter drafted");

    const resumeCard = page.getByRole("main").locator("section").filter({
      has: page.getByRole("heading", { name: "Resume", exact: true }),
    });
    const [txt] = await Promise.all([
      page.waitForEvent("download"),
      resumeCard.getByRole("button", { name: ".txt", exact: true }).click(),
    ]);
    expect(txt.suggestedFilename()).toMatch(/\.txt$/);
    const [docx] = await Promise.all([
      page.waitForEvent("download"),
      resumeCard.getByRole("button", { name: "Word .docx" }).click(),
    ]);
    expect(docx.suggestedFilename()).toMatch(/\.docx$/);
    const [pack] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download pack" }).click(),
    ]);
    expect(pack.suggestedFilename()).toMatch(/\.json$/);
    // The export is real: the pack on disk holds the resume we pasted.
    const stream = await pack.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    expect(Buffer.concat(chunks).toString("utf8")).toContain(PERSON.email);
  });
}
