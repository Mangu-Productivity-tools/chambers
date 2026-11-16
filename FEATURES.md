# Chambers — feature list

Checked against the source at v25.4-hf.1 (commit `6e22abf`).

- `[x]` confirmed by reading the code path. "(test)" means `src/lib/resume/resume.test.ts` also covers it.
- `[ ] unverified` could not be confirmed from the source alone (needs a browser or device check).
- `[ ] not shipped` is not in this build.

A tick here means the code exists. It does not mean the feature was browser-tested for this release; there is no E2E suite in this repo yet.

## Core product

- [x] Landing — paper preview, six thumbs, import / studio CTAs (`src/routes/index.tsx`)
- [x] Start — paste, `.txt` / `.md` / `.json` upload, clipboard, blank, Avery / Maya samples (`src/routes/start.tsx`)
- [x] Studio — live 816px sheet, editor, readiness check, print (`src/routes/studio.tsx`)
- [x] Tailor — paste posting, local reorder, notes, original / tailored (`src/routes/tailor.tsx`)
- [x] Letter — local draft, same paper, print, tones (`src/routes/letter.tsx`)
- [x] Paper library — six templates, filter, select + use (`src/routes/templates.tsx`)
- [x] Tools — readiness score, bullet variants, summary, keyword fit, all local (`src/routes/tools.tsx`)
- [x] Persistence — `localStorage` key `chambers-studio`, 400ms debounce (`src/lib/resume/store.ts`)
- [x] Honesty rule, local tailor — reorders and tightens openers, adds no employers, dates, degrees or metrics (`tailor-local.ts`, `honest-opener.ts`) (test)
- [x] No account, no database in use — no auth or API routes are mounted; `VITE_AUTH_ENABLED=false`. Unused auth / database scaffolding remains in `src/lib/auth`, `src/lib/db.ts`, `migrations/`
- [x] No server AI calls by default — gated by `VITE_ASSIST_ENABLED` (`src/lib/ai/assist-flag.ts`)

## Import

- [x] Paste messy resume text (`parse.ts`) (test)
- [x] Upload `.txt` / `.md` / `.json`
- [x] Clipboard paste
- [x] Sample resumes (editorial + engineer)
- [x] JSON Chambers pack import (test)
- [x] JSON Resume schema import (test)
- [x] Blank sheet start
- [x] LinkedIn-style paste (Company · Full-time, dated roles) (test)
- [x] Certifications / languages as extras (certifications tested)
- [ ] not shipped — PDF import (Band B)
- [ ] not shipped — DOCX import (Band B)

## Editor

- [x] Identity, summary, skills
- [x] Experience add / remove / duplicate / reorder
- [x] Bullet add / remove / reorder
- [x] Bullet quality hints: verb, metric, length (`quality.ts`) (test)
- [x] Education add / remove / reorder
- [x] Extra sections add / remove / reorder
- [x] Skill chips with add / remove
- [x] Tidy empty lines (`tidy.ts`) (test)
- [x] Word count on summary
- [x] Density: regular / tight
- [x] Email format hint (test)
- [x] Website / LinkedIn protocol strip (test)
- [ ] not shipped — drag-and-drop reorder (button reorder only)

## Paper

- [x] Letter, Compact, Executive, Editorial, Sidebar, Classic (`templates.ts`)
- [x] Fit / 100% stage
- [x] Page-2 overflow marker
- [x] Print CSS `@page { size: letter }` (`src/styles.css`)
- [x] Keyword highlight against posting (test)
- [x] Copy / download plain text
- [x] Empty sheet still fills a letter page (min-height 1056px)
- [ ] unverified — the per-template "ATS high / medium" rating shown in the Paper library. It is a hand-set label in `templates.ts`; no parser test backs it

## Tailor / readiness

- [x] Local tailor: reorder roles, bullets and skills by overlap with the posting (test)
- [x] Honest openers: "Responsible for cleaning X" becomes "Cleaned X"; never inserts "Led" / "Delivered" (v25.4-hf.1) (test)
- [x] Infer company / role from posting (`infer.ts`) (test)
- [x] Sample postings (editorial + engineering)
- [x] Paste posting from clipboard
- [x] Readiness score + checks + missing phrases — deterministic, no LLM (`ats.ts`) (test)
- [x] Copy readiness notes as text (test)
- [x] Checks: contact, summary, verbs, metrics, length, skills, dates, education, keywords
- [x] What changed notes
- [x] Undo last tailor
- [x] Compare current vs original sheet
- [x] Bullet-level diff list (`diff.ts`) (test)
- [x] Keyword fit: promote only phrases already on the sheet (`keywords.ts`) (test)
- [x] Save this version after a tailor
- [ ] unverified — that the score correlates with any real applicant tracking system, or that "Interview-ready" (score 85+) means what it says. See docs/CLAIMS.md

## Cover letter

- [x] Local letter from resume facts (`letter-local.ts`) (test)
- [x] Greeting / body / closing editable
- [x] Tones: calm (Measured), direct (Short), warm (Human) (test)
- [x] Word count
- [x] Print / copy / `.txt`
- [x] Draft from Tailor uses selected tone

## Versions

- [x] Save named version (resume + paper + posting + letter)
- [x] Named save field on Versions page
- [x] Load / rename / delete / duplicate
- [x] Diff vs current sheet
- [x] Cap 20, stored locally (`VERSION_CAP` in `store.ts`)
- [x] Versions page
- [x] ⌘S / Ctrl+S from Studio (`src/components/layout/hotkeys.tsx`)

## Export

- [x] Browser Print / PDF
- [x] Plain text `.txt` (resume + letter) (test)
- [x] Markdown `.md` (test)
- [x] JSON Resume (test)
- [x] Chambers JSON pack, includes tone + density (test)
- [x] Word `.docx` (resume + letter) (`export-docx.ts`) (test)
- [x] No watermark in any export (no watermark code exists)
- [x] Export page
- [x] Ready-to-send checklist

## AI

- [ ] not shipped (Band C) — AI parse
- [ ] not shipped (Band C) — AI tailor
- [ ] not shipped (Band C) — AI cover letter
- [ ] not shipped (Band C) — AI bullet rewrite
- [ ] not shipped (Band C) — AI summary

Server functions for these exist in `src/lib/ai/resume-ai.ts` (xAI `grok-4.5`, needs `XAI_API_KEY`), but every call site is off unless `VITE_ASSIST_ENABLED=true`. The flag is unset in production. Local parse, tailor, letter, variants and summary are the only paths that run.

## Quality

- [x] Loading skeletons
- [x] Empty letter / empty readiness states
- [x] Error boundary (`src/router.tsx`)
- [x] 404 page
- [x] Skip link
- [ ] unverified — 44px tap targets everywhere. Several controls are 32px (`h-8` / `min-h-8`), e.g. tone and density toggles, keyword chips
- [x] Mobile studio tabs
- [x] Keyboard in Studio: save version, undo tailor, open export
- [x] Reduced-motion media query
- [x] Unit tests for parse, readiness, tailor, infer, letter, export, keywords, ingest — 60 pass (`npm run test:resume`)
- [x] Production build succeeds (`npm run build`, checked 16 Nov 2026)
- [ ] unverified — accessibility audit (no audit record in the repo)
- [ ] unverified — browser smoke of the production build for this release
- [ ] not shipped — Playwright E2E suite in this repo

## Not in this build

- Accounts, cloud sync, payments (planned for Band D; nothing exists today)
- Job tracker
- Subscription or watermark
- Anything that invents facts
