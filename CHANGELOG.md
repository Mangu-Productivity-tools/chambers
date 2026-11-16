# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are `MAJOR.MINOR`; hotfixes are `vNN.M-hf.N`. See [docs/RELEASING.md](docs/RELEASING.md).

## [Unreleased]

### Added
- CHANGELOG, release, rollback, builder-protocol, assumptions and claims documents (v26 docs work).

### Changed
- README and FEATURES.md corrected to match the build: AI rows marked not shipped, unconfirmed rows marked unverified.
- `design/migration-mockups/` moved to `archive/migration-mockups/` (unrelated historical deck).

## [v25.4-hf.1] — 2026-11-16

Launch hotfix. Commit `6e22abf` on `hotfix/v25.4-launch`. Not yet merged to `main` or tagged at the time of writing.

### Fixed
- Honesty: the local tailor and the Tools bullet variants no longer rewrite weak openers as "Led" or "Delivered". "Responsible for cleaning X" becomes "Cleaned X", "Helped with X" becomes "Supported X", and bullets with no honest rewrite are left unchanged (`src/lib/resume/honest-opener.ts`). 23 new table tests.
- Privacy: server AI calls on Start, Tailor, Letter and Tools are gated behind `VITE_ASSIST_ENABLED`, default off. Before this fix, pasted resume text and tailor input were sent to the server AI function automatically.
- `package-lock.json` re-synced so `npm ci` works again.

### Removed
- Grok PWA Vite plugin and its tests (`scripts/grok-pwa-plugin.mjs`).
- Nitro middleware that injected a `grok.com` script into every page (`server/middleware/grok-pwa.ts`).
- Preview host bridge mount and `/__grok` manifest links from the root route.

### Known issues
- `npm test` fails on 4 leftover platform skill-doc tests under `scripts/`. `npm run test:resume` (60 tests) and `npm run typecheck` pass. Cleanup is planned for v26.

## [v25.4] — 2026-11-16

Public beta launch. Code baseline is commit `f30ee41` (17 Sep 2026); no code changed between that commit and launch.

### Added
- Resume studio: Start, Studio, Tailor, Letter, Paper, Versions, Export and Tools routes.
- Import from pasted text, `.txt` / `.md`, Chambers JSON pack, JSON Resume, blank sheet, two samples.
- Six paper templates at 816px letter width, with print stylesheet.
- Local tailor (reorder by overlap with the posting), tailor notes, undo, compare with original.
- Deterministic readiness ("ATS") score with nine checks and missing-phrase list.
- Keyword fit that only promotes phrases already on the sheet.
- Local cover letter in three tones.
- Up to 20 named versions, stored in the browser.
- Export: print / PDF, Word `.docx`, Markdown, plain text, JSON Resume, Chambers pack.
- Persistence in `localStorage` only. No account.

### Known issues (fixed in v25.4-hf.1)
- Weak bullet openers were rewritten with verbs the user did not write.
- Resume text was sent to a server AI function without an explicit user action.
- A third-party `grok.com` script was injected into every page.

### Earlier history
Commits before the studio (Aug 2026) are design tokens, HTML drops and an unrelated mockup deck. They were never released under a version number.
