# Builder protocol

For every builder, human or AI, working on Chambers. Several AI builder streams work in parallel; a second model reviews honesty, redaction, auth and billing paths. The system of record is Azure DevOps (org `mangu-publishers-chambers`, project `Chambers`).

## Before you start

- You have one work item. Its id is your `AB#<id>`. No work item, no branch.
- Read the FRs on the work item. Build that scope and nothing else.
- Work in your own clone or worktree. Do not touch another stream's branch.

## Branches

- `feature/AB#<id>-short-slug`, branched from `main`. Quote it in a shell: `git checkout -b 'feature/AB#123-docx-import'`.
- Hotfixes: `hotfix/vNN.M-<slug>`.
- Never push to `main`. Never force-push a shared branch.

## Pull requests

Title: `AB#<id> <what changed>`. Body lists the FR ids.

Checklist, all must be true:

- [ ] References `AB#<id>` and the FR ids
- [ ] Scope matches the work item; unrelated changes removed
- [ ] `npm run test:resume` and `npm run typecheck` pass locally
- [ ] New behaviour has a test; a bug fix has a test that failed before the fix
- [ ] No new network call carries user content (see Privacy)
- [ ] No generated text adds facts the user did not write (see Honesty)
- [ ] User-facing copy changed? `docs/CLAIMS.md` updated in the same PR
- [ ] Feature changed? `FEATURES.md` and `CHANGELOG.md` (`[Unreleased]`) updated
- [ ] Guessed anything? Row added to `docs/ASSUMPTIONS.md`, and the PR body says `ASSUMPTION A-nnn`
- [ ] No secrets, no real personal data in code, tests, fixtures or screenshots
- [ ] Unfinished work is behind a flag that defaults to off

## Required checks

`main` is protected: one reviewer, a linked work item, all comments resolved, and build validation.

- "Chambers CI" pipeline: **Gate**, then **Playwright E2E**. Both must be green. **Release** needs the `production` environment approval and is not part of PR validation.
- Second-model review is required when a PR touches: tailor / letter / bullet / summary generation, anything under `src/lib/ai`, redaction, auth, billing.
- A human merges. Builders do not approve their own PRs.

In this repo today the only CI file is `.github/workflows/ci.yml` (`test:resume` + `typecheck`); the Azure pipeline files are not on this branch yet (ASSUMPTIONS A-005).

## Honesty rules

- Generated or rewritten resume text must not add an employer, date, degree, tool, metric or verb the user did not write. Reordering and tightening are allowed.
- If no honest rewrite exists, leave the text unchanged.
- Posting phrases that are not evidenced are shown as missing. Never insert them.
- The readiness scorer is deterministic. No LLM in the scorer.
- Public copy only claims what the build does. Every claim has a row in `docs/CLAIMS.md` with evidence. If you cannot prove it, do not write it.
- Mark a feature done only when it is done. Use "unverified" when you have not checked.

## Privacy rules

- Local-first. Resume and posting text stay in the browser unless the user explicitly presses an Assist control, and Assist is off (`VITE_ASSIST_ENABLED` unset) until Band C ships.
- Do not add analytics, error reporting, fonts, scripts or any third-party request without a work item that says so.
- Do not log user content, in the browser console or on the server.
- Secrets are server-side environment variables. Nothing secret goes in a `VITE_` variable.

## ASSUMPTION rows

When the work item does not answer a question and you must pick something to proceed: pick the safest option, add a row to `docs/ASSUMPTIONS.md` (id, date, assumption, where in code, decision needed), and write `ASSUMPTION A-nnn` in the PR body. Do not guess silently. Do not close a row yourself.

## Running tests

Node 22 or newer.

```bash
npm ci
npm run test:resume   # resume unit tests (60 at v25.4-hf.1)
npm run typecheck
npm run build         # production build
npm run lint
```

`npm test` also runs the `scripts/` tests and currently fails on 4 leftover platform tests; because the command chains with `&&`, the suites after them do not run. Use `test:resume` until that is cleaned up.

Playwright E2E runs in the pipeline. There is no `e2e/` directory on this branch yet.
