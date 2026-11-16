# Chambers

**Chambers Beta — free, on this device, AI off.**

Letter-width resume and cover letter studio. Paste what you have, put it on paper, tailor it to one posting. The local tailor reorders and tightens; it does not add facts.

Current release: v25.4 (public beta, 16 Nov 2026) plus hotfix v25.4-hf.1. See [CHANGELOG.md](CHANGELOG.md).

Live: [chambers-app.vercel.app](https://chambers-app.vercel.app)

Source mirror: [github.com/Mangu-Productivity-tools/chambers](https://github.com/Mangu-Productivity-tools/chambers). Work items, PRs and the release pipeline live in Azure DevOps (org `mangu-publishers-chambers`, project `Chambers`).

## Product

| Surface | What it does |
|---|---|
| Start | Paste, `.txt` / `.md` / `.json` (Chambers pack or JSON Resume), blank sheet, or a sample |
| Studio | Live 816px sheet, editor, readiness check, keyword highlight |
| Tailor | Local reorder against one posting. Notes. Compare original. Save a version |
| Letter | Local draft in Measured / Short / Human tones, print |
| Paper | Letter, Compact, Executive, Editorial, Sidebar, Classic |
| Versions | Up to 20 named snapshots on this device |
| Export | Print / PDF, Word `.docx`, Markdown, plain text, JSON Resume, Chambers pack |
| Tools | Readiness score, bullet variants, summary, keyword fit |

There is no account and no database in this build. Everything persists in the browser's `localStorage` (key `chambers-studio`). Clearing site data deletes it.

The readiness ("ATS") score is a deterministic checklist plus phrase overlap with the posting you paste (`src/lib/resume/ats.ts`). No LLM is involved. It is not a simulation of any vendor's applicant tracking system and does not predict interviews.

## AI is off

AI assist is not shipped. The server functions in `src/lib/ai/resume-ai.ts` exist, but every call site is gated by `VITE_ASSIST_ENABLED`, which is unset in production. With the flag off, resume text is not sent to any server. Do not set the flag before the Band C Assist engine ships.

## Honesty rule

The tailor may reorder and tighten. It must not invent employers, dates, degrees, tools, or metrics. Posting phrases that are not evidenced stay listed as missing. Keyword fit only adds a phrase to skills if it already appears on the sheet.

## Run

Node 22 or newer.

```bash
npm ci
npm run dev        # http://localhost:8080
npm run build      # production build (Nitro, Vercel preset)
```

## Tests

```bash
npm run test:resume
npm run typecheck
```

## Deploy

Vercel Git integration deploys `main` to production. Release and rollback: [docs/RELEASING.md](docs/RELEASING.md), [docs/RUNBOOK.md](docs/RUNBOOK.md).

## Docs

- [CHANGELOG.md](CHANGELOG.md) — what shipped
- [FEATURES.md](FEATURES.md) — feature list checked against the source
- [docs/CLAIMS.md](docs/CLAIMS.md) — register of public claims and their evidence
- [docs/PLAN.md](docs/PLAN.md) — builder protocol
- [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) — assumptions awaiting an owner decision

License: not yet decided (OD-101). Until it is, no license is granted.
