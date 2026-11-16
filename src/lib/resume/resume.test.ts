import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reportAsText, scoreAts } from "./ats.ts";
import { diffResumes } from "./diff.ts";
import { letterDocx, resumeDocx } from "./export-docx.ts";
import { letterAsText, resumeAsMarkdown, resumeAsText } from "./export-text.ts";
import { highlightTerms } from "./highlight.ts";
import { ingestResumeInput } from "./ingest.ts";
import { inferTargets } from "./infer.ts";
import { fromJsonResume, importAnyJson, makePack, parseChambersPack, toJsonResume } from "./json-io.ts";
import { canPromote, classifyKeywords, withPromotedSkill } from "./keywords.ts";
import { writeLetterLocal } from "./letter-local.ts";
import { parseResumeText } from "./parse.ts";
import { bulletHint, hintLine, looksLikeEmail, stripProtocol, wordCount } from "./quality.ts";
import { emptyResume, SAMPLE_JD_EDITORIAL, sampleResume } from "./sample.ts";
import { tailorLocal } from "./tailor-local.ts";
import { tidyResume } from "./tidy.ts";
import { baseForm, honestOpener, pastTense, rewriteOpener, WEAK_OPENER } from "./honest-opener.ts";
import type { OpenerOutcome } from "./honest-opener.ts";
import {
  IMPROVEMENT_CLAIMS,
  JD_PLATFORM,
  numbersIn,
  thinInternResume,
  UNGROUNDED_CLAIMS,
} from "./honesty-fixtures.ts";
import { writeSummaryLocal } from "./summary-local.ts";
import { evidencedIn, resumePlainText, tokenize } from "./text.ts";
import { localVariants } from "./bullet-local.ts";
import { crc32, zipStore } from "./zip.ts";

describe("parseResumeText", () => {
  it("pulls identity and a job from labeled sections", () => {
    const text = `Avery Lang
Editorial systems · product operations
Newark / remote
avery@mangu.example

SUMMARY
Operator who ships editorial systems.

EXPERIENCE
Operating lead — Mangu Platforms — Newark, NJ — 2023 — Present
Shipped a reader storefront used on live titles.
Defined the house visual language.

EDUCATION
B.A., Literature — The New School — 2016

SKILLS
Figma, InDesign, EPUB 3, Next.js
`;
    const r = parseResumeText(text);
    assert.equal(r.identity.name, "Avery Lang");
    assert.match(r.identity.email, /avery@/);
    assert.ok(r.summary.toLowerCase().includes("editorial"));
    assert.ok(r.experience.length >= 1);
    assert.ok(r.skills.some((s) => /figma/i.test(s)));
  });

  it("returns empty-ish resume for blank input", () => {
    const r = parseResumeText("   \n");
    assert.equal(r.identity.name, "");
    assert.equal(r.experience.length, 0);
  });

  it("reads LinkedIn-ish role + company · full-time", () => {
    const text = `Maya Chen
Staff frontend
maya@x.test

EXPERIENCE
Staff frontend
Northwind · Full-time
Jan 2022 - Present · 4 yrs
Remote
Led the token pipeline for five products.

EDUCATION
B.S., Computer Science — NYU — 2016

SKILLS
TypeScript, React
`;
    const r = parseResumeText(text);
    assert.ok(r.experience.length >= 1);
    assert.match(r.experience[0].org, /Northwind/i);
    assert.match(r.experience[0].end, /Present/i);
  });

  it("captures certifications as an extra section", () => {
    const text = `Pat Lee
Engineer
pat@x.test

EXPERIENCE
Engineer — Acme — 2020 — Present
Shipped the API.

CERTIFICATIONS
AWS Solutions Architect
`;
    const r = parseResumeText(text);
    assert.ok(r.extras.some((x) => /cert/i.test(x.label)));
  });
});

describe("ingestResumeInput", () => {
  it("detects a Chambers pack", () => {
    const pack = makePack({
      resume: sampleResume(),
      templateId: "letter",
      jobDescription: "",
      targetCompany: "",
      targetRole: "",
      letter: writeLetterLocal(sampleResume(), "", "Acme", "Designer"),
      notes: null,
    });
    const result = ingestResumeInput(JSON.stringify(pack));
    assert.equal(result.source, "json-pack");
    assert.equal(result.resume.identity.name, "Avery Lang");
  });

  it("detects JSON Resume", () => {
    const result = ingestResumeInput(
      JSON.stringify({
        basics: { name: "Pat Lee", email: "pat@x.test" },
        work: [{ name: "Acme", position: "Engineer", startDate: "2020" }],
      }),
    );
    assert.equal(result.source, "json-resume");
    assert.equal(result.resume.identity.name, "Pat Lee");
  });

  it("falls back to text parse", () => {
    const result = ingestResumeInput("Pat Lee\nEngineer\npat@x.test\n");
    assert.equal(result.source, "text");
    assert.equal(result.resume.identity.name, "Pat Lee");
  });
});

describe("inferTargets", () => {
  it("reads company and role from the editorial sample posting", () => {
    const t = inferTargets(SAMPLE_JD_EDITORIAL);
    assert.match(t.role, /Senior Product Designer/i);
    assert.match(t.company, /Acme Press Systems/i);
  });
});

describe("scoreAts", () => {
  it("scores the sample resume against its own posting above a weak baseline", () => {
    const report = scoreAts(sampleResume(), SAMPLE_JD_EDITORIAL);
    assert.ok(report.score >= 40);
    assert.ok(report.checks.length >= 8);
    assert.ok(report.matched.length + report.missing.length > 0);
    assert.ok(report.checks.some((c) => c.id === "keywords"));
    assert.ok(report.checks.some((c) => c.id === "dates"));
  });

  it("fails contact when email is missing", () => {
    const r = emptyResume();
    r.identity.name = "X";
    const report = scoreAts(r, "");
    const contact = report.checks.find((c) => c.id === "contact");
    assert.equal(contact?.pass, false);
  });

  it("serializes a report as text", () => {
    const t = reportAsText(scoreAts(sampleResume(), SAMPLE_JD_EDITORIAL), "Avery");
    assert.match(t, /ATS check — Avery/);
    assert.match(t, /Score /);
    assert.match(t, /do not invent|Present:/);
  });
});

describe("keywords honesty", () => {
  it("will not promote a phrase that is not evidenced", () => {
    const r = sampleResume();
    assert.equal(canPromote(r, "kubernetes"), false);
    assert.equal(withPromotedSkill(r, "kubernetes"), null);
  });

  it("will promote a phrase already in the work", () => {
    const r = sampleResume();
    assert.equal(canPromote(r, "storefront"), true);
    const next = withPromotedSkill(r, "storefront");
    assert.ok(next?.skills.includes("storefront"));
    assert.equal(r.skills.includes("storefront"), false);
  });

  it("classifies posting phrases into buckets", () => {
    const buckets = classifyKeywords(sampleResume(), SAMPLE_JD_EDITORIAL);
    assert.ok(buckets.coverage >= 0);
    assert.ok(buckets.inSkills.length + buckets.inBody.length + buckets.missing.length > 0);
    assert.equal(buckets.inBody.includes("systems"), false);
  });
});

describe("quality", () => {
  it("flags a weak opener", () => {
    const h = bulletHint("Responsible for the storefront.");
    assert.equal(h?.verb, false);
    assert.ok(hintLine(h!));
  });

  it("accepts an action bullet with a figure", () => {
    const h = bulletHint("Led a 40% cut in cycle time by replacing one-off files.");
    assert.equal(h?.verb, true);
    assert.equal(h?.metric, true);
    assert.equal(hintLine(h!), null);
  });

  it("counts words", () => {
    assert.equal(wordCount("one two three"), 3);
    assert.equal(wordCount("  "), 0);
  });

  it("validates email loosely", () => {
    assert.equal(looksLikeEmail(""), true);
    assert.equal(looksLikeEmail("avery@mangu.example"), true);
    assert.equal(looksLikeEmail("not-an-email"), false);
  });

  it("strips protocols from urls", () => {
    assert.equal(stripProtocol("https://mangu.example/avery"), "mangu.example/avery");
    assert.equal(stripProtocol("linkedin.com/in/avery/"), "linkedin.com/in/avery");
  });
});

describe("tailorLocal", () => {
  it("does not invent a new employer", () => {
    const src = sampleResume();
    const orgs = new Set(src.experience.map((j) => j.org));
    const { resume, notes } = tailorLocal(src, SAMPLE_JD_EDITORIAL);
    for (const job of resume.experience) assert.ok(orgs.has(job.org));
    assert.ok(typeof notes.summary === "string");
  });

  it("tightens weak openers honestly (HF-1: never inserts Led)", () => {
    const src = sampleResume();
    src.experience[0].bullets[0] = "Responsible for shipping the storefront.";
    const { resume, notes } = tailorLocal(src, SAMPLE_JD_EDITORIAL);
    const all = resume.experience.flatMap((j) => j.bullets);
    assert.ok(all.includes("Shipped the storefront."));
    assert.ok(!all.some((b) => b.startsWith("Led the storefront") || b === "Led shipping the storefront."));
    assert.ok(notes.rewrote.length >= 1);
  });
});

describe("writeLetterLocal", () => {
  it("stays on the facts and fills company/role", () => {
    const letter = writeLetterLocal(sampleResume(), SAMPLE_JD_EDITORIAL, "", "", "calm");
    assert.match(letter.company, /Acme/i);
    assert.match(letter.role, /Designer/i);
    assert.ok(letter.paragraphs.length >= 2);
    assert.doesNotMatch(letter.paragraphs.join(" "), /passionate|leverage|dynamic/i);
  });

  it("changes opening by tone", () => {
    const calm = writeLetterLocal(sampleResume(), SAMPLE_JD_EDITORIAL, "Acme", "Designer", "calm");
    const direct = writeLetterLocal(sampleResume(), SAMPLE_JD_EDITORIAL, "Acme", "Designer", "direct");
    const warm = writeLetterLocal(sampleResume(), SAMPLE_JD_EDITORIAL, "Acme", "Designer", "warm");
    assert.notEqual(calm.paragraphs[0], direct.paragraphs[0]);
    assert.notEqual(calm.greeting, warm.greeting);
  });
});

describe("export", () => {
  it("resumeAsText includes name and a bullet", () => {
    const t = resumeAsText(sampleResume());
    assert.match(t, /Avery Lang/);
    assert.match(t, /SELECTED WORK/);
  });

  it("resumeAsMarkdown has headings", () => {
    const t = resumeAsMarkdown(sampleResume());
    assert.match(t, /^# Avery Lang/m);
    assert.match(t, /## Selected work/);
  });

  it("letterAsText includes greeting", () => {
    const letter = writeLetterLocal(sampleResume(), SAMPLE_JD_EDITORIAL, "Acme", "Designer");
    const t = letterAsText(letter, "Avery Lang");
    assert.match(t, /Dear /);
    assert.match(t, /Avery/);
  });
});

describe("json pack", () => {
  it("round-trips a Chambers pack including tone and density", () => {
    const pack = makePack({
      resume: sampleResume(),
      templateId: "editorial",
      jobDescription: SAMPLE_JD_EDITORIAL,
      targetCompany: "Acme",
      targetRole: "Designer",
      letter: writeLetterLocal(sampleResume(), SAMPLE_JD_EDITORIAL, "Acme", "Designer"),
      notes: null,
      letterTone: "warm",
      density: "tight",
    });
    const parsed = parseChambersPack(JSON.parse(JSON.stringify(pack)));
    assert.ok(parsed);
    assert.equal(parsed?.resume.identity.name, "Avery Lang");
    assert.equal(parsed?.templateId, "editorial");
    assert.equal(parsed?.letterTone, "warm");
    assert.equal(parsed?.density, "tight");
  });

  it("imports JSON Resume basics + work", () => {
    const r = fromJsonResume({
      basics: { name: "Maya Chen", label: "Staff engineer", email: "maya@x.test", summary: "Ships systems." },
      work: [{ name: "Northwind", position: "Staff frontend", startDate: "2022-01-01", highlights: ["Led tokens."] }],
      skills: [{ name: "TypeScript" }],
    });
    assert.equal(r?.identity.name, "Maya Chen");
    assert.equal(r?.experience[0]?.org, "Northwind");
    assert.ok(r?.skills.includes("TypeScript"));
  });

  it("importAnyJson rejects garbage", () => {
    assert.equal(importAnyJson("not json"), null);
  });

  it("toJsonResume round-trips a name and a job", () => {
    const src = sampleResume();
    const jr = toJsonResume(src);
    const back = fromJsonResume(jr);
    assert.equal(back?.identity.name, src.identity.name);
    assert.equal(back?.experience[0]?.org, src.experience[0].org);
    assert.ok((back?.skills.length ?? 0) >= 1);
  });
});

describe("tidy", () => {
  it("drops empty bullets and blank extras without touching facts", () => {
    const r = sampleResume();
    r.experience[0].bullets.push("  ", "");
    r.extras.push({ id: "x", label: "  ", items: ["", " "] });
    const t = tidyResume(r);
    assert.equal(t.experience[0].bullets.includes(""), false);
    assert.ok(!t.extras.some((x) => !x.label && x.items.length === 0));
    assert.equal(t.identity.name, r.identity.name);
  });
});

describe("zip / docx", () => {
  it("crc32 is stable", () => {
    assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  });

  it("zip starts with PK and contains the file name", () => {
    const z = zipStore([{ name: "hello.txt", data: new TextEncoder().encode("hi") }]);
    assert.equal(z[0], 0x50);
    assert.equal(z[1], 0x4b);
    assert.ok(new TextDecoder().decode(z).includes("hello.txt"));
  });

  it("resumeDocx is a zip with document.xml", () => {
    const bytes = resumeDocx(sampleResume());
    const text = new TextDecoder().decode(bytes);
    assert.equal(bytes[0], 0x50);
    assert.ok(text.includes("word/document.xml"));
    assert.ok(text.includes("Avery Lang"));
  });

  it("letterDocx includes greeting", () => {
    const letter = writeLetterLocal(sampleResume(), SAMPLE_JD_EDITORIAL, "Acme", "Designer");
    const text = new TextDecoder().decode(letterDocx(letter, "Avery Lang"));
    assert.ok(text.includes("Dear"));
  });
});

describe("highlight + diff", () => {
  it("marks matching terms", () => {
    const parts = highlightTerms("Design tokens and print CSS", ["tokens", "print"]);
    assert.ok(parts.some((p) => p.hit && /tokens/i.test(p.text)));
  });

  it("detects a raised bullet", () => {
    const a = sampleResume();
    const b = sampleResume();
    const first = b.experience[0].bullets[0];
    b.experience[0].bullets = [b.experience[0].bullets[1], first, ...b.experience[0].bullets.slice(2)];
    const d = diffResumes(a, b);
    assert.ok(d.bullets.some((x) => x.kind === "raised"));
  });
});

describe("honestOpener (HF-1 launch hotfix)", () => {
  const cases: [string, string][] = [
    ["Responsible for cleaning patient-intake data in Excel and SQL", "Responsible for cleaning patient-intake data in Excel and SQL"],
    ["Responsible for resolving 30+ tickets per week", "Resolved 30+ tickets per week"],
    ["Responsible for debugging the parser", "Debugged the parser"],
    ["Responsible for managing a team of 4", "Managed a team of 4"],
    ["Responsible for building the onboarding flow", "Built the onboarding flow"],
    ["Responsible for studying churn drivers", "Responsible for studying churn drivers"],
    ["Responsible for creating weekly dashboards", "Responsible for creating weekly dashboards"],
    ["Responsible for leading standups", "Responsible for leading standups"],
    // v26 FR-HON-103: "Supported" was a verb the user never wrote. "Helped" is kept,
    // and openers that are already honest limited-scope verbs are left alone.
    ["Helped with onboarding new analysts", "Helped onboard new analysts"],
    ["Assisted with month-end close", "Assisted with month-end close"],
    ["Assisted in data migration", "Assisted in data migration"],
    ["Responsible for the quarterly budget", "Responsible for the quarterly budget"],
    ["Worked on the website redesign", "Worked on the website redesign"],
    ["Built a CI pipeline", "Built a CI pipeline"],
    ["Responsible for playing back test sessions", "Responsible for playing back test sessions"],
    ["Responsible for writing release notes", "Responsible for writing release notes"],
    ["Responsible for scheduling 12 volunteers", "Scheduled 12 volunteers"],
    ["Responsible for shipping weekly", "Responsible for shipping weekly"],
    ["Responsible for running A/B tests", "Ran A/B tests"],
    ["Responsible for reviewing vendor contracts", "Responsible for reviewing vendor contracts"],
  ];
  for (const [input, expected] of cases) {
    it(`${input} -> ${expected}`, () => assert.equal(honestOpener(input), expected));
  }
  it("never introduces leadership or delivery verbs absent from the input", () => {
    for (const [input] of cases) {
      const out = honestOpener(input);
      if (!/lead/i.test(input)) assert.ok(!/^Led\b/.test(out), out);
      assert.ok(!/^Delivered\b/.test(out), out);
    }
  });
  it("pastTense handles regular, silent-e, y and doubled stems", () => {
    assert.equal(pastTense("cleaning"), "cleaned");
    assert.equal(pastTense("resolving"), "resolved");
    assert.equal(pastTense("studying"), "studied");
    assert.equal(pastTense("shipping"), "shipped");
  });
  it("tools variants keep numbers and never say Led/Delivered", () => {
    const v = localVariants("Worked on resolving 30+ tickets per week");
    assert.ok(v.length >= 1);
    for (const x of v) {
      assert.ok(!/\b(Led|Delivered)\b/.test(x), x);
      assert.ok(x.includes("30+"), x);
    }
  });
});

describe("honestOpener classes (v26 FR-HON-103/104)", () => {
  // [input, expected output, class]
  const table: [string, string, OpenerOutcome][] = [
    // past-tense: regular
    ["Responsible for maintaining the wiki", "Maintained the wiki", "past-tense"],
    ["Responsible for reviewing 15 pull requests a week", "Reviewed 15 pull requests a week", "past-tense"],
    // past-tense: silent e
    ["Responsible for managing a team of 4", "Managed a team of 4", "past-tense"],
    ["Responsible for reducing cloud spend", "Responsible for reducing cloud spend", "ambiguous"],
    ["Responsible for analyzing survey data", "Responsible for analyzing survey data", "ambiguous"],
    // past-tense: doubled consonant
    ["Responsible for planning two offsites", "Responsible for planning two offsites", "ambiguous"],
    ["Responsible for mapping customer journeys", "Responsible for mapping customer journeys", "ambiguous"],
    ["Responsible for transferring 3 accounts", "Transferred 3 accounts", "past-tense"],
    // past-tense: optional doubling keeps the user's own spelling
    ["Responsible for cancelling stale orders", "Responsible for cancelling stale orders", "ambiguous"],
    ["Responsible for canceling stale orders", "Responsible for canceling stale orders", "ambiguous"],
    // past-tense: consonant + y, vowel + y, ie -> y
    ["Responsible for verifying invoices", "Responsible for verifying invoices", "ambiguous"],
    ["Responsible for deploying the API", "Deployed the API", "past-tense"],
    ["Responsible for tying out ledgers", "Responsible for tying out ledgers", "ambiguous"],
    // past-tense: irregular
    ["Responsible for overseeing the night shift", "Oversaw the night shift", "past-tense"],
    ["Responsible for troubleshooting printer faults", "Responsible for troubleshooting printer faults", "ambiguous"],
    ["Responsible for teaching maths to year 9", "Responsible for teaching maths to year 9", "ambiguous"],
    ["Responsible for teaching Year 9 maths", "Responsible for teaching Year 9 maths", "ambiguous"],
    ["Responsible for setting up the till", "Responsible for setting up the till", "ambiguous"],
    ["Responsible for doing the weekly stock count", "Did the weekly stock count", "past-tense"],
    // past-tense: duty openers, lead-ins, colon, lower case, trailing period
    ["Duties included answering customer emails.", "Duties included answering customer emails.", "ambiguous"],
    ["Duties included: managing and training 4 interns.", "Managed and trained 4 interns.", "past-tense"],
    ["Responsibilities included preparing month-end reports", "Responsibilities included preparing month-end reports", "ambiguous"],
    ["My main duties were tracking late shipments", "My main duties were tracking late shipments", "ambiguous"],
    ["I was responsible for creating rotas", "I was responsible for creating rotas", "ambiguous"],
    ["responsible for building, testing and shipping the app", "Built, tested and shipped the app", "past-tense"],
    // helped: the limiting verb stays, the user's verb goes to base form
    ["Helped with managing a team of 4", "Helped manage a team of 4", "helped"],
    ["Helped with shipping the v2 release", "Helped ship the v2 release", "helped"],
    ["Helped with studying churn drivers", "Helped with studying churn drivers", "ambiguous"],
    ["Helped with writing and editing the newsletter", "Helped write and edit the newsletter", "helped"],
    ["Helped in running 3 workshops", "Helped run 3 workshops", "helped"],
    // kept: already an honest verb of limited scope
    ["Assisted with managing a team of 4", "Assisted with managing a team of 4", "kept"],
    ["Participated in leading standups", "Participated in leading standups", "kept"],
    ["Contributed to building the design system", "Contributed to building the design system", "kept"],
    ["Involved in delivering the migration", "Involved in delivering the migration", "kept"],
    // no-verb: weak opener with no supported verb after it
    ["Responsible for the quarterly budget", "Responsible for the quarterly budget", "no-verb"],
    ["Duties included customer service", "Duties included customer service", "no-verb"],
    ["Helped with month-end close", "Helped with month-end close", "no-verb"],
    ["Responsible for the management of 4 stores", "Responsible for the management of 4 stores", "no-verb"],
    ["Worked on morning shift handoffs", "Worked on morning shift handoffs", "kept"],
    ["Responsible for existing accounts", "Responsible for existing accounts", "no-verb"],
    ["Worked on string parsing", "Worked on string parsing", "kept"],
    ["Worked on Bing ads", "Worked on Bing ads", "kept"],
    ["Responsible for successfully managing a team", "Responsible for successfully managing a team", "no-verb"],
    // ambiguous: a supported -ing word that may be a noun, or unclear grammar
    ["Responsible for building maintenance", "Responsible for building maintenance", "ambiguous"],
    ["Responsible for marketing campaigns", "Responsible for marketing campaigns", "ambiguous"],
    ["Worked on meeting minutes", "Worked on meeting minutes", "kept"],
    ["Responsible for shipping and receiving", "Responsible for shipping and receiving", "ambiguous"],
    ["Worked on shipping/receiving", "Worked on shipping/receiving", "kept"],
    ["Responsible for billing and collections", "Responsible for billing and collections", "ambiguous"],
    ["Responsible for testing.", "Responsible for testing.", "ambiguous"],
    [
      "Responsible for building dashboards and presenting findings",
      "Responsible for building dashboards and presenting findings",
      "ambiguous",
    ],
    // not-weak: left alone, including look-alikes
    ["Built a CI pipeline", "Built a CI pipeline", "not-weak"],
    ["Managed a team of 4", "Managed a team of 4", "not-weak"],
    ["Responsible forecasting for 3 regions", "Responsible forecasting for 3 regions", "not-weak"],
    ["Helped 30 customers a day", "Helped 30 customers a day", "not-weak"],
  ];

  it("covers at least 20 cases and every class", () => {
    assert.ok(table.length >= 20);
    const classes = new Set(table.map((row) => row[2]));
    for (const c of ["past-tense", "helped", "kept", "no-verb", "ambiguous", "not-weak"]) {
      assert.ok(classes.has(c as OpenerOutcome), c);
    }
  });

  for (const [input, expected, outcome] of table) {
    it(`[${outcome}] ${input} -> ${expected}`, () => {
      const result = rewriteOpener(input);
      assert.equal(result.text, expected);
      assert.equal(result.outcome, outcome);
      assert.equal(result.changed, input !== expected);
      assert.equal(honestOpener(input), expected);
    });
  }

  it("only the two rewriting classes ever change a bullet", () => {
    for (const [input, , outcome] of table) {
      const changed = honestOpener(input) !== input;
      assert.equal(changed, outcome === "past-tense" || outcome === "helped", input);
    }
  });

  it("the new opener is built only from verbs already in the bullet", () => {
    for (const [input] of table) {
      const result = rewriteOpener(input);
      if (!result.changed) continue;
      const gerunds = (result.before ?? "").toLowerCase().match(/[a-z]+ing\b/g) ?? [];
      const allowed = new Set<string>(["helped", "and", "or"]);
      for (const g of gerunds) {
        allowed.add(pastTense(g));
        allowed.add(baseForm(g) ?? "");
      }
      for (const word of (result.after ?? "").toLowerCase().match(/[a-z]+/g) ?? []) {
        assert.ok(allowed.has(word), `${input} -> "${result.after}" introduced "${word}"`);
      }
      // Everything after the opener is the user's text, untouched.
      const tail = result.text.slice((result.after ?? "").length);
      assert.ok(input.endsWith(tail), input);
    }
  });

  it("never adds a scope verb the user did not write", () => {
    const scope = /\b(led|managed|delivered|spearheaded|drove|owned|supported|oversaw|directed|headed)\b/gi;
    for (const [input] of table) {
      const out = honestOpener(input);
      for (const verb of out.match(scope) ?? []) {
        const v = verb.toLowerCase();
        const inInput = new RegExp(`\\b${v}\\b`, "i").test(input);
        const fromGerund = (input.toLowerCase().match(/[a-z]+ing\b/g) ?? []).some((g) => pastTense(g) === v);
        assert.ok(inInput || fromGerund, `${input} -> ${out}`);
      }
    }
  });

  it("never turns helping into doing", () => {
    for (const opener of ["Helped with", "Assisted with", "Assisted in", "Involved in", "Contributed to"]) {
      const out = honestOpener(`${opener} managing a team of 4`);
      assert.doesNotMatch(out, /^Managed\b/, out);
      assert.doesNotMatch(out, /^Led\b/, out);
    }
  });

  it("never adds, drops or changes a number", () => {
    for (const [input] of table) {
      assert.deepEqual(numbersIn(honestOpener(input)), numbersIn(input), input);
    }
  });

  it("spells past tense and base form for each rule", () => {
    const forms: [string, string, string][] = [
      ["cleaning", "cleaned", "clean"],
      ["managing", "managed", "manage"],
      ["shipping", "shipped", "ship"],
      ["debugging", "debugged", "debug"],
      ["referring", "referred", "refer"],
      ["studying", "studied", "study"],
      ["playing", "played", "play"],
      ["tying", "tied", "tie"],
      ["agreeing", "agreed", "agree"],
      ["labelling", "labelled", "label"],
      ["labeling", "labeled", "label"],
      ["running", "ran", "run"],
      ["writing", "wrote", "write"],
      ["building", "built", "build"],
      ["leading", "led", "lead"],
      ["forecasting", "forecast", "forecast"],
      ["upselling", "upsold", "upsell"],
      ["proofreading", "proofread", "proofread"],
      ["offering", "offered", "offer"],
      ["editing", "edited", "edit"],
      ["developing", "developed", "develop"],
    ];
    for (const [gerund, past, base] of forms) {
      assert.equal(pastTense(gerund), past, gerund);
      assert.equal(baseForm(gerund), base, gerund);
    }
    assert.equal(baseForm("morning"), null);
    assert.equal(baseForm("existing"), null);
  });

  it("WEAK_OPENER recognises every weak class and nothing else in the table", () => {
    for (const [input, , outcome] of table) {
      assert.equal(WEAK_OPENER.test(input), outcome !== "not-weak", input);
    }
  });

  it("local variants never offer a verb the user did not write", () => {
    for (const v of localVariants("Helped with managing a team of 4 in order to hit launch")) {
      assert.doesNotMatch(v, /^(Managed|Led|Supported|Delivered)\b/, v);
      assert.ok(v.includes("4"), v);
    }
  });
});

describe("tailor notes are neutral and accurate (v26 FR-HON-105)", () => {
  const allNotes = (n: { summary: string; moved: string[]; rewrote: string[] }) =>
    [n.summary, ...n.moved, ...n.rewrote].join("\n");

  it("never claims the resume was improved", () => {
    for (const jd of [SAMPLE_JD_EDITORIAL, JD_PLATFORM, ""]) {
      for (const src of [sampleResume(), thinInternResume(), emptyResume()]) {
        const { notes } = tailorLocal(src, jd);
        assert.doesNotMatch(allNotes(notes), IMPROVEMENT_CLAIMS);
        assert.doesNotMatch(allNotes(notes), /coverage is already/i);
      }
    }
  });

  it("reports no changes when nothing changed", () => {
    const src = sampleResume();
    const { resume, notes } = tailorLocal(src, "");
    assert.deepEqual(resume, src);
    assert.deepEqual(notes.moved, []);
    assert.deepEqual(notes.rewrote, []);
    assert.deepEqual(notes.missing, []);
    assert.match(notes.summary, /^No changes made\./);
    assert.doesNotMatch(notes.summary, /reordered/i);
  });

  it("does not claim a reorder when the posting shares no words with the sheet", () => {
    const src = sampleResume();
    const { resume, notes } = tailorLocal(src, "Forklift operator wanted. Pallet jack licence essential.");
    assert.deepEqual(resume, src);
    assert.deepEqual(notes.moved, []);
    assert.match(notes.summary, /^No changes made/);
    assert.ok(notes.missing.length > 0);
    assert.match(notes.summary, /not in your resume and were not added/);
  });

  it("says a skill moved up only when it did, and names posting words that exist", () => {
    const src = thinInternResume();
    const { resume, notes } = tailorLocal(src, JD_PLATFORM);
    const posting = new Set(tokenize(JD_PLATFORM));
    const skillNotes = notes.moved.filter((m) => m.startsWith("Moved skill"));
    assert.ok(skillNotes.length >= 1);
    for (const note of skillNotes) {
      const m = note.match(/^Moved skill “(.+?)” up because the posting uses (.+)\.$/);
      assert.ok(m, note);
      const skill = m[1];
      assert.ok(resume.skills.indexOf(skill) < src.skills.indexOf(skill), note);
      for (const w of m[2].match(/“(.+?)”/g) ?? []) {
        const word = w.slice(1, -1);
        assert.ok(posting.has(word), note);
        assert.ok(tokenize(skill).includes(word), note);
      }
    }
    // JavaScript did not move because of the posting's "Java".
    assert.ok(!skillNotes.some((n) => n.includes("JavaScript")));
  });

  it("quotes exactly what an opener rewrite replaced", () => {
    const src = thinInternResume();
    const { resume, notes } = tailorLocal(src, JD_PLATFORM);
    assert.equal(notes.rewrote.length, 2);
    assert.ok(
      notes.rewrote.includes(
        "Rewrote a bullet opener under Intern at Northwind Hosting: “Responsible for updating” became “Updated”. The verb is the one you wrote.",
      ),
    );
    assert.ok(notes.rewrote.some((n) => n.includes("“Helped with answering” became “Helped answer”")));
    assert.ok(resume.experience.flatMap((j) => j.bullets).includes("Updated the deployment scripts for the build server."));
    assert.match(notes.summary, /rewrote 2 bullet openers using your own verbs|Rewrote 2 bullet openers using your own verbs/);
  });

  it("notes every reorder it makes, not just a changed first item", () => {
    const src = sampleResume();
    // Make the second role the closest in wording so roles are reordered.
    const { resume, notes } = tailorLocal(src, src.experience[1].bullets.join(" "));
    assert.notEqual(resume.experience[0].id, src.experience[0].id);
    assert.ok(notes.moved.some((m) => m.startsWith("Reordered your roles") && m.includes(resume.experience[0].org)));
    for (const job of resume.experience) {
      const before = src.experience.find((j) => j.id === job.id);
      const reordered = job.bullets.some((b, i) => honestOpener(before?.bullets[i] ?? "") !== b);
      const noted = notes.moved.some((m) => m.startsWith("Reordered bullets under") && m.includes(job.org));
      assert.equal(noted, reordered, job.org);
    }
  });

  it("counts missing terms truthfully and lists all of them", () => {
    const { resume, notes } = tailorLocal(thinInternResume(), JD_PLATFORM);
    const plain = resumePlainText(resume);
    for (const term of notes.missing) assert.ok(!evidencedIn(plain, term), term);
    const m = notes.summary.match(/(\d+) of (\d+) posting terms checked are not in your resume/);
    assert.ok(m, notes.summary);
    assert.equal(Number(m[1]), notes.missing.length);
  });
});

describe("local-path honesty fixtures (v26 FR-HON-106)", () => {
  const src = thinInternResume();
  const { resume: out, notes } = tailorLocal(src, JD_PLATFORM);
  const letterBody = (l: { greeting: string; paragraphs: string[]; closing: string; signoff: string }) =>
    [l.greeting, ...l.paragraphs, l.closing, l.signoff].join("\n");
  const bodyOf = (r: typeof src) =>
    [r.summary, ...r.experience.flatMap((j) => [j.role, j.org, ...j.bullets]), ...r.skills].join("\n");

  it("(a) a tool the posting asks for but the sheet lacks is never added, and is reported missing", () => {
    assert.doesNotMatch(out.summary, /kubernetes/i);
    assert.doesNotMatch(out.experience.flatMap((j) => j.bullets).join("\n"), /kubernetes/i);
    assert.doesNotMatch(out.skills.join("\n"), /kubernetes/i);
    assert.doesNotMatch(JSON.stringify(out), /kubernetes/i);
    assert.ok(notes.missing.some((k) => k.toLowerCase() === "kubernetes"), notes.missing.join(", "));
    // Notes mention it only in the missing list, never as something done.
    assert.doesNotMatch([notes.summary, ...notes.moved, ...notes.rewrote].join("\n"), /kubernetes/i);
  });

  it("(a) the same holds for the local summary and letter", () => {
    assert.doesNotMatch(writeSummaryLocal(src, JD_PLATFORM), /kubernetes/i);
    assert.doesNotMatch(writeSummaryLocal(out, JD_PLATFORM), /kubernetes/i);
    for (const tone of ["calm", "direct", "warm"] as const) {
      const letter = writeLetterLocal(out, JD_PLATFORM, "", "", tone);
      assert.doesNotMatch(letterBody(letter), /kubernetes/i, tone);
    }
  });

  it("(a) a near-miss is not counted as evidence: JavaScript does not cover Java", () => {
    assert.ok(notes.missing.includes("java"), notes.missing.join(", "));
    assert.equal(evidencedIn("JavaScript, Linux", "java"), false);
    assert.equal(evidencedIn("Java, Linux", "java"), true);
    assert.equal(evidencedIn("Built dashboards in Tableau", "dashboard"), true);
    assert.equal(evidencedIn("C++ and C#", "c"), false);
    assert.doesNotMatch(writeSummaryLocal(src, JD_PLATFORM), /\bjava\b/i);
    const letter = writeLetterLocal(src, JD_PLATFORM, "", "", "calm");
    assert.doesNotMatch(letter.paragraphs.join(" "), /\bjava\b/i);
  });

  it("(a) a term at the end of a sentence is still matched and reported cleanly", () => {
    const { notes: n } = tailorLocal(src, "We use Docker and Kubernetes.");
    assert.ok(n.missing.includes("kubernetes"), n.missing.join(", "));
    assert.ok(!n.missing.some((k) => /docker/i.test(k)), n.missing.join(", "));
  });

  it("(b) a bullet with no numbers never gains a number", () => {
    for (const job of out.experience) {
      const before = src.experience.find((j) => j.id === job.id);
      assert.ok(before);
      assert.deepEqual(numbersIn(job.bullets.join("\n")), numbersIn(before.bullets.join("\n")), job.org);
      for (const bullet of job.bullets) {
        const origin: string | undefined = before.bullets.find((b) => b === bullet || honestOpener(b) === bullet);
        assert.ok(origin, bullet);
        assert.deepEqual(numbersIn(bullet), numbersIn(origin), bullet);
      }
    }
    // The posting's own figures ("40+ teams", "3+ years") never reach the sheet.
    assert.deepEqual(numbersIn(bodyOf(out)), numbersIn(bodyOf(src)));
    assert.deepEqual(numbersIn(writeSummaryLocal(out, JD_PLATFORM)), []);
  });

  it("(b) the letter carries no number that is not in the sheet", () => {
    const sheetNumbers = new Set(numbersIn(resumePlainText(out)));
    for (const tone of ["calm", "direct", "warm"] as const) {
      const letter = writeLetterLocal(out, JD_PLATFORM, "", "", tone);
      for (const n of numbersIn(letterBody(letter))) assert.ok(sheetNumbers.has(n), `${tone}: ${n}`);
    }
  });

  it("(c) a title is never upgraded", () => {
    assert.equal(out.identity.title, "Intern");
    assert.deepEqual(
      out.experience.map((j) => [j.id, j.role]).sort(),
      src.experience.map((j) => [j.id, j.role]).sort(),
    );
    const upgraded = /\b(senior|lead|manager|engineer|specialist|associate|junior|head|principal|staff)\b/i;
    assert.doesNotMatch(out.experience.map((j) => j.role).join("\n"), upgraded);
    const summary = writeSummaryLocal(out, JD_PLATFORM);
    assert.match(summary, /^Intern\b/);
    assert.doesNotMatch(summary, upgraded);
    for (const tone of ["calm", "direct", "warm"] as const) {
      const letter = writeLetterLocal(out, "", "Harbor Cloud", "Platform role", tone);
      const text = letter.paragraphs.join(" ");
      assert.match(text, /\bIntern\b/, tone);
      assert.doesNotMatch(text, upgraded, tone);
    }
  });

  it("(d) a thin role is not padded", () => {
    for (const job of out.experience) {
      const before = src.experience.find((j) => j.id === job.id);
      assert.ok(before);
      assert.equal(job.bullets.length, before.bullets.length, job.org);
      for (const bullet of job.bullets) {
        // No bullet got longer, and none borrowed words from the posting.
        const origin: string | undefined = before.bullets.find((b) => b === bullet || honestOpener(b) === bullet);
        assert.ok(origin, bullet);
        assert.ok(bullet.length <= origin.length, bullet);
      }
    }
    assert.equal(out.experience.find((j) => j.id === "exp-intern")?.bullets.length, 1);
    assert.equal(out.experience.length, src.experience.length);
  });

  it("changes nothing except order and openers", () => {
    assert.deepEqual(out.identity, src.identity);
    assert.equal(out.summary, src.summary);
    assert.deepEqual(out.education, src.education);
    assert.deepEqual(out.extras, src.extras);
    assert.deepEqual([...out.skills].sort(), [...src.skills].sort());
    for (const job of out.experience) {
      const before = src.experience.find((j) => j.id === job.id);
      assert.ok(before);
      const { bullets: _a, ...restAfter } = job;
      const { bullets: _b, ...restBefore } = before;
      assert.deepEqual(restAfter, restBefore);
    }
    // Every word in the output was in the source, apart from re-tensed verbs.
    const sourceWords = new Set(tokenize(bodyOf(src)));
    const added = tokenize(bodyOf(out)).filter((w) => !sourceWords.has(w));
    assert.deepEqual(added.sort(), ["answer", "updated"]);
  });

  it("does not mutate the sheet it was given", () => {
    const fresh = thinInternResume();
    tailorLocal(fresh, JD_PLATFORM);
    assert.deepEqual(fresh, thinInternResume());
  });

  it("is stable when run twice", () => {
    const again = tailorLocal(out, JD_PLATFORM);
    assert.deepEqual(again.resume, out);
    assert.deepEqual(again.notes.rewrote, []);
  });
});

describe("local letter and summary claim nothing the sheet lacks (v26 FR-HON-107)", () => {
  const tones = ["calm", "direct", "warm"] as const;
  const sheets = { sample: sampleResume(), thin: thinInternResume(), empty: emptyResume() };
  const postings = [SAMPLE_JD_EDITORIAL, JD_PLATFORM, ""];

  /** Template text only: the output with every piece of the user's own text removed. */
  const templateOnly = (text: string, sheet: typeof sheets.sample, jd: string, extra: string[] = []) => {
    const own = [
      sheet.identity.name,
      sheet.identity.title.split("·")[0]?.trim() ?? "",
      sheet.summary,
      ...sheet.experience.flatMap((j) => [j.role, j.org, ...j.bullets, ...j.bullets.map((b) => b.replace(/\.$/, ""))]),
      ...sheet.skills,
      ...extra,
    ]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    let rest = text;
    for (const piece of own) {
      rest = rest.split(piece).join(" ");
      const lowered = piece.charAt(0).toLowerCase() + piece.slice(1);
      rest = rest.split(lowered).join(" ");
    }
    void jd;
    return rest;
  };

  it("letter template text has no claim verbs or stock phrases", () => {
    for (const [label, sheet] of Object.entries(sheets)) {
      for (const jd of postings) {
        for (const tone of tones) {
          const letter = writeLetterLocal(sheet, jd, "", "", tone);
          const text = [...letter.paragraphs, letter.closing].join(" ");
          const template = templateOnly(text, sheet, jd, [letter.company, letter.role]);
          assert.doesNotMatch(template, UNGROUNDED_CLAIMS, `${label}/${tone}: ${template}`);
        }
      }
    }
  });

  it("summary template text has no claim verbs or stock phrases", () => {
    for (const [label, sheet] of Object.entries(sheets)) {
      for (const jd of postings) {
        const summary = writeSummaryLocal(sheet, jd);
        assert.doesNotMatch(templateOnly(summary, sheet, jd), UNGROUNDED_CLAIMS, `${label}: ${summary}`);
      }
    }
  });

  it("an empty sheet gets no invented experience", () => {
    for (const tone of tones) {
      const letter = writeLetterLocal(emptyResume(), JD_PLATFORM, "", "", tone);
      assert.equal(letter.paragraphs.length, 1, letter.paragraphs.join(" | "));
      assert.match(letter.paragraphs[0], /Platform Engineer/);
      assert.doesNotMatch(letter.paragraphs.join(" "), /work|shipp|recent|experience|practitioner|candidate/i);
      assert.equal(letter.signoff, "Sincerely");
    }
    assert.equal(writeSummaryLocal(emptyResume(), JD_PLATFORM), "");
    assert.equal(writeSummaryLocal(emptyResume(), ""), "");
  });

  it("with no evidenced posting terms the letter does not claim a match", () => {
    const letter = writeLetterLocal(sampleResume(), "Forklift driver wanted. Pallet jack licence essential.", "Depot", "Forklift driver", "direct");
    const text = letter.paragraphs.join(" ");
    assert.doesNotMatch(text, /matches|not stretching|already/i);
    assert.equal(letter.paragraphs.length, 2);
  });

  it("an existing summary is kept when there is nothing to build from", () => {
    const sheet = emptyResume();
    sheet.summary = "Returning to work after a career break.";
    assert.equal(writeSummaryLocal(sheet, JD_PLATFORM), "Returning to work after a career break.");
    const letter = writeLetterLocal(sheet, "", "Depot", "Clerk", "calm");
    assert.deepEqual(letter.paragraphs, [
      "I’m applying for the Clerk role at Depot.",
      "Returning to work after a career break.",
    ]);
  });

  it("no placeholder leaks into the letter when the target is unknown", () => {
    for (const tone of tones) {
      const letter = writeLetterLocal(thinInternResume(), "", "", "", tone);
      const text = [letter.greeting, ...letter.paragraphs].join(" ");
      assert.doesNotMatch(text, /this role role|at your team|a the /i, text);
    }
  });

  it("quotes the bullet as written and ties it to the role it came from", () => {
    const sheet = thinInternResume();
    sheet.experience[0].bullets = ["SQL reporting for the ops team."];
    for (const tone of tones) {
      const letter = writeLetterLocal(sheet, JD_PLATFORM, "", "", tone);
      assert.ok(
        letter.paragraphs.includes("From my time as Intern at Northwind Hosting: SQL reporting for the ops team."),
        letter.paragraphs.join(" | "),
      );
    }
    assert.equal(
      writeSummaryLocal(sheet, ""),
      "Intern. SQL reporting for the ops team. Skills: JavaScript, Linux, Bash, Docker.",
    );
  });

  it("does not call a role most recent, or describe a past role as the present one", () => {
    // Tailoring can move an older role to the top.
    const sheet = sampleResume();
    sheet.identity.title = "";
    const { resume } = tailorLocal(sheet, sheet.experience[1].bullets.join(" "));
    assert.notEqual(resume.experience[0].id, sheet.experience[0].id);
    for (const tone of tones) {
      const text = writeLetterLocal(resume, "", "Depot", "Producer", tone).paragraphs.join(" ");
      assert.doesNotMatch(text, /most recent|currently|I’m an? /i, text);
      assert.match(text, new RegExp(`From my time as ${resume.experience[0].role} at`));
    }
  });

  it("every number in the letter and summary comes from the sheet", () => {
    for (const [label, sheet] of Object.entries(sheets)) {
      const allowed = new Set(numbersIn(resumePlainText(sheet)));
      for (const jd of postings) {
        for (const n of numbersIn(writeSummaryLocal(sheet, jd))) assert.ok(allowed.has(n), `${label} summary ${n}`);
        for (const tone of tones) {
          const letter = writeLetterLocal(sheet, jd, "Depot", "Clerk", tone);
          for (const n of numbersIn(letter.paragraphs.join(" "))) assert.ok(allowed.has(n), `${label} letter ${n}`);
        }
      }
    }
  });

  it("only names posting terms that are whole words in the sheet, in the user's casing", () => {
    const sheet = sampleResume();
    const plain = resumePlainText(sheet);
    const letter = writeLetterLocal(sheet, SAMPLE_JD_EDITORIAL, "", "", "calm");
    const line = letter.paragraphs.find((p) => p.startsWith("The posting asks for"));
    assert.ok(line);
    const named = line.replace("The posting asks for ", "").split(". ")[0].split(/, | and /);
    assert.ok(named.length >= 1);
    for (const term of named) assert.ok(plain.includes(term), term);
    const summary = writeSummaryLocal(sheet, SAMPLE_JD_EDITORIAL);
    const bg = summary.match(/Background includes (.+)\.$/);
    assert.ok(bg, summary);
    for (const term of bg[1].split(", ")) assert.ok(plain.includes(term), term);
  });

  it("the summary pairs a bullet only with the role it was written under", () => {
    const sheet = thinInternResume();
    sheet.identity.title = "Aspiring platform engineer";
    sheet.experience[0].bullets = [""];
    sheet.experience[1].bullets = ["Built 12 lab images each term."];
    const summary = writeSummaryLocal(sheet, "");
    assert.match(summary, /^Lab assistant who built 12 lab images each term\./);
    assert.doesNotMatch(summary, /Aspiring|Intern/);
  });
});


it("openers that describe an assignment are never turned into outcomes (review B1)", () => {
  const unchanged = [
    "Tasked with reducing ticket backlog by 40%",
    "Worked on leading the Zendesk migration",
    "Worked on winning the Google account (lost)",
    "Worked on getting promoted",
    "Tasked with founding a startup",
    "Accountable for delivering $2M in savings",
    "In charge of hiring 10 engineers",
    "Charged with reducing cloud spend",
    "Responsible for raising $5M (round failed)",
    "Responsible for reducing churn by 20% (target not met)",
    "Responsible for building security badge audits",
    "Responsible for building security",
    "Responsible for Managing Director relations",
    "Responsible for leading indicators dashboard",
    "Responsible for founding team onboarding",
    "Responsible for learning management system upkeep",
    "Responsible for engineering management",
    "Responsible for training data quality",
    "Responsible for spending analysis",
    "Responsible for holding company filings",
  ];
  for (const b of unchanged) assert.equal(honestOpener(b), b);
});

it("noun-like -ing words and qualified outcomes are left as written (review B1, round 2)", () => {
  const unchanged = [
    "Responsible for marketing emails",
    "Responsible for shipping labels",
    "Responsible for building permits and inspections",
    "Responsible for purchasing orders for 3 sites",
    "Responsible for running water supply checks",
    "Responsible for operating theatre sanitation",
    "Responsible for leading zeros cleanup in CSVs",
    "Responsible for managing partner relations",
    "Responsible for supporting documents intake",
    "Responsible for developing countries portfolio",
    "Responsible for assisting managing partners",
    "Responsible for hiring 10 engineers; hired 2",
    "Responsible for increasing sales by 30% but fell short",
    "Responsible for raising $5M, which didn't happen",
    "Responsible for delivering the project, which was shelved",
    "Responsible for launching the app before it was scrapped",
    "Responsible for closing deals worth $1M (closed none)",
    "Responsible for reducing churn, without success",
  ];
  for (const b of unchanged) assert.equal(honestOpener(b), b);
  assert.equal(honestOpener("Responsible for managing a team of 4"), "Managed a team of 4");
  assert.equal(honestOpener("Responsible for training 5 new hires"), "Trained 5 new hires");
});
