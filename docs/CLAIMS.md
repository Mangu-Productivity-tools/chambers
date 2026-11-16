# Claims register

Every public claim found in the landing copy, meta description, in-app copy, README and FEATURES.md, checked against the source at v25.4-hf.1 (commit `6e22abf`, 16 Nov 2026) with AI off (`VITE_ASSIST_ENABLED` unset).

Status: **True** (evidence cited), **False**, **Unprovable** (nothing in the repo can show it), **Misleading** (literally defensible, but implies something that is not there).

Rule: a PR that changes user-facing copy updates this file. A claim with no evidence does not ship. Tests named below are in `src/lib/resume/resume.test.ts`.

## Needs action

These are listed, not fixed: source copy is outside the scope of the docs work.

| # | Claim | Source | Status | Why | Suggested fix |
|---|---|---|---|---|---|
| C-01 | "Rewrites use the assistant when it is available" | `src/routes/tools.tsx:39` | False | AI is not shipped; the assistant is never available. Rewrites are local only. | Remove the sentence. |
| C-02 | "Instant local reorder, then an optional refine." | `src/routes/tailor.tsx:162` | False | There is no refine step with the flag off. | Drop "then an optional refine". |
| C-03 | "Instant local draft, then an optional refine." | `src/routes/letter.tsx:106` | False | Same as C-02. | Drop "then an optional refine". |
| C-04 | "Sheet updated. Checking the assistant…" / "Refining…" button state | `src/routes/tailor.tsx:241,264`; `src/routes/letter.tsx:180` | False | No assistant is checked. Shown only for an instant with the flag off, but it is still untrue. | Do not enter the "refine" state when the flag is off. |
| C-05 | "Local draft — assistant unavailable." | `src/routes/letter.tsx:91` | Misleading | Implies an assistant exists and is temporarily down. | "Drafted on this device." |
| C-06 | "instant ATS match" (meta description) | `src/routes/__root.tsx:18` | Misleading | The score is phrase overlap plus nine checklist rules (`src/lib/resume/ats.ts`). It is not a match against any applicant tracking system. | "readiness check" or "keyword match against the posting". |
| C-07 | "Instant ATS match against the posting you paste." | `src/routes/index.tsx:148` | Misleading | Same as C-06. | Same as C-06. |
| C-08 | Score label "Interview-ready" (score 85+) | `src/lib/resume/ats.ts:117` | Unprovable | No evidence links the score to interviews. | Neutral label, e.g. "High overlap". |
| C-09 | Score labels "Strong match", "Rewrite against the posting" | `src/lib/resume/ats.ts:118-120` | Unprovable | Thresholds are arbitrary; "Rewrite" also sits badly with "never invent". | Neutral labels. |
| C-10 | Template rating "ATS high / medium" | `src/lib/resume/templates.ts` (`ats` field); shown at `src/routes/templates.tsx:99` | Unprovable | Hand-set labels. No template has been run through a parser. | Remove, or back with a parse round-trip test. |
| C-11 | "nothing a parser can trip on" (Compact) | `src/lib/resume/templates.ts:15` | Unprovable | Same as C-10. | Remove. |
| C-12 | "Recruiter-native." (Classic) | `src/lib/resume/templates.ts:47` | Unprovable | No evidence. | Remove. |
| C-13 | "parsers love it more than prose"; "so the parser has a place for the role" | `src/lib/resume/ats.ts:78,46` | Unprovable | Statements about third-party parsers with no source. | Plain advice without the parser claim. |
| C-14 | "One-to-two pages" check: "Density is in the sweet spot for letter paper." | `src/lib/resume/ats.ts:62-69` | Misleading | The check counts bullets (6 to 18). It does not measure pages. | Rename to "Bullet count". |
| C-15 | "never invent a fact" (whole product) | `src/routes/index.tsx:46-47` | True for the tailor; unprovable for the letter | The tailor is tested (C-30). The local letter writes fixed sentences on the user's behalf, e.g. "work I have already shipped" (`src/lib/resume/letter-local.ts:35-48`), which the user's resume may not support. The only letter test checks company and role are filled. | Reword the letter templates to quote the user's own lines, add a test, or scope the claim to the tailor. |
| C-16 | "Step n of 3 · about a minute" | `src/routes/start.tsx:133` | Unprovable | No timing measured. | Drop "about a minute". |
| C-17 | "Skip link + 44px tap targets" | Old `FEATURES.md` (corrected in this change) | False as a blanket claim | Skip link exists (`src/components/layout/nav.tsx:22-27`). Several controls are 32px (`h-8`): `src/routes/studio.tsx:98,151`, `src/routes/tailor.tsx:63`, `src/components/ats/keywords-card.tsx:41`. | Now "unverified" in FEATURES.md. Fix controls or keep the claim out. |
| C-18 | "AI: parse / tailor / letter / bullet / summary via grok-4.5"; "Optional `XAI_API_KEY` … for assistant refine" | Old `FEATURES.md`, old `README.md` (corrected in this change) | False for the shipped posture | All AI call sites are gated off. | Corrected: rows now read "not shipped (Band C)". |
| C-19 | "`src/lib/ai/resume-ai.ts` is a stub that returns 'not available'" | Old `docs/STUDIO.md` (corrected in this change) | False | The file makes real xAI calls when a key is set and the flag is on. | Corrected. |
| C-20 | "`[x]` done + tested + browser-verified" (legend for every tick) | Old `FEATURES.md` (corrected in this change) | Unprovable | No browser test record or E2E suite is in the repo. | Legend now says "confirmed by reading the code path". |

## True as built

| # | Claim | Source | Evidence |
|---|---|---|---|
| C-30 | Tailor does not invent employers, dates, degrees, tools or metrics; "No invented jobs"; "One honest version" | `src/routes/index.tsx:85,152`; `README.md:5,36`; `FEATURES.md:21` | `src/lib/resume/tailor-local.ts` only sorts and calls `honestOpener`. Tests: "does not invent a new employer", "tightens weak openers honestly (HF-1: never inserts Led)", "never introduces leadership or delivery verbs absent from the input", "tools variants keep numbers and never say Led/Delivered". |
| C-31 | "Missing keywords stay listed — never fabricated"; "Missing ones stay missing" | `src/routes/index.tsx:85`; `src/routes/tailor.tsx:162`; `src/components/ats/keywords-card.tsx:28` | `tailorLocal` returns `notes.missing`; `scoreAts` returns `missing`. Keyword promote is blocked unless evidenced: `canPromote` in `src/lib/resume/keywords.ts`. Tests: "will not promote a phrase that is not evidenced", "will promote a phrase already in the work". |
| C-32 | "Free on this device. No account." | `src/routes/index.tsx:59,152`; `README.md:3,26`; `src/lib/og/site.json:3` | No payment code. No sign-in route under `src/routes/`. `.env.example`: `VITE_AUTH_ENABLED=false`. Caveat: unused auth and database scaffolding is still in `src/lib/auth`, `src/lib/db.ts`. |
| C-33 | "No watermark." | `src/routes/index.tsx:59,152`; `FEATURES.md:111` | No watermark code in `src/` (`grep -ri watermark src` finds only this copy). `src/lib/resume/export-docx.ts` writes only resume content. Tests: "resumeDocx is a zip with document.xml". |
| C-34 | "Private by default. Stored in this browser, not on a server."; "Your file stays on this device"; "Stays on this device." | `src/routes/index.tsx:145`; `src/routes/start.tsx:75,218`; `src/components/layout/nav.tsx:98,102`; `src/routes/export.tsx:197`; `README.md:26,32` | Persistence is `localStorage` only (`src/lib/resume/store.ts`, key `chambers-studio`). The only code that sends user content is `src/lib/ai/resume-ai.ts`, and all five call sites are behind `ASSIST_ENABLED` (`src/lib/ai/assist-flag.ts:7`). No analytics or third-party scripts in `src/`. Caveat: true only while the flag is unset; no automated test asserts "no network egress". An E2E check should be added. |
| C-35 | "ATS scoring is local and free"; readiness score is deterministic, no LLM | `src/routes/tools.tsx:39`; `README.md:28`; `FEATURES.md:73` | `src/lib/resume/ats.ts` is pure functions with no network or model call. Tests: `scoreAts` suite (3 tests). The word "ATS" itself is covered by C-06. |
| C-36 | "Letter-width paper"; "print stylesheet, PDF from the browser" | `src/routes/index.tsx:90`; `src/routes/__root.tsx:18`; `src/lib/og/site.json:3` | 816px sheet (`src/styles.css:46,136`), `@page { size: letter }` (`src/styles.css:200`). PDF is the browser's own print dialog; the app does not generate PDF files. |
| C-37 | "Six sheets" | `src/routes/index.tsx:115,153` | Six entries in `src/lib/resume/templates.ts`. |
| C-38 | "Up to 20 named snapshots on this device" | `src/routes/versions.tsx:44`; `README.md:22` | `VERSION_CAP = 20` (`src/lib/resume/store.ts:24`). |
| C-39 | Export: Word `.docx`, Markdown, plain text, JSON Resume, Chambers pack | `src/routes/export.tsx:33`; `README.md:23` | `src/routes/export.tsx:97-206`. Tests: "export" suite, "json pack" suite, "zip / docx" suite. |
| C-40 | Import: paste, `.txt` / `.md` / `.json`, JSON Resume, Chambers pack, blank, samples | `README.md:19` | `src/routes/start.tsx` (`onFile`, `ingest`); `src/lib/resume/ingest.ts`. Tests: "ingestResumeInput" suite, "parseResumeText" suite. |
| C-41 | "Cover letter in the same voice as the resume"; tones Measured / Short / Human | `src/routes/index.tsx:90,154`; `README.md:20` | Three tones in `src/lib/resume/letter-local.ts`. Test: "changes opening by tone". "Same voice" is a style statement, not testable; see C-15 for the letter's honesty gap. |
| C-42 | "land on paper in seconds"; "Local tailor in a blink" | `src/routes/index.tsx:80,148` | Parse and tailor are synchronous local functions with no network call. Not benchmarked; acceptable as description, not as a measured claim. |
| C-43 | Samples are "both print-ready, both honest" | `src/routes/start.tsx:198` | Samples are fictional people in `src/lib/resume/sample.ts`. Harmless, but they are invented examples and the copy should not suggest otherwise. |
| C-44 | "AI off"; "AI assist is not shipped" | `README.md:3,32`; `FEATURES.md:23` | `src/lib/ai/assist-flag.ts:7`; gated call sites at `src/routes/start.tsx:77`, `tailor.tsx:114,135`, `letter.tsx:76`, `tools.tsx:113,198`. |

## Not public, noted for completeness

- `archive/migration-mockups/` contains placeholder stats and testimonials for a different product. It is archived and its README says the contents are not claims.
- `docs/PROSPERITY.md`, `docs/PRD.md`, `docs/COMPETITORS.md`, `PROGRESS.md`, `RESUME.md` are internal and historical. `PROGRESS.md` and `RESUME.md` describe the September build session ("37 tests", "production smoke passed") and are out of date; they were not rewritten.
