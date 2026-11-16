# Assumptions

Things the build assumes that the owner has not yet decided. Builders add a row whenever they have to guess; mark the PR description with the word `ASSUMPTION` and the row id. A row is closed by an owner decision, not by a builder.

| Id | Date | Assumption | Where in code | Owner decision needed |
|---|---|---|---|---|
| A-001 | 2026-11-16 | The AI assist flag is named `VITE_ASSIST_ENABLED`. Only the exact string `true` turns it on; unset means off. It is build-time, so a change needs a redeploy. | `src/lib/ai/assist-flag.ts:7`; call sites in `src/routes/start.tsx`, `tailor.tsx`, `letter.tsx`, `tools.tsx` | Confirm the name, and who may set it in Vercel. |
| A-002 | 2026-11-16 | Feedback channel default (OD-107). No feedback link, form or address exists in the app today. | None in `src/` | Choose the channel (OD-107). Until then no feedback link ships. |
| A-003 | 2026-11-16 | License pending (OD-101). No `LICENSE` file; `package.json` is `"private": true`. The repo is public, so "no license" means all rights reserved. | Repo root (no file); `README.md` last line | Choose a license or confirm proprietary (OD-101). |
| A-004 | 2026-11-16 | Domain pending (OD-106). The only public URL is `chambers-app.vercel.app`. No domain is hard-coded in `src/`. | `README.md` | Choose the production domain (OD-106). |
| A-005 | 2026-11-16 | The release pipeline (`azure-pipelines.yml`, `e2e/`) lives in the Azure Repos copy and is not in this branch. Docs describe the pipeline as specified, not as verified here. | `.github/workflows/ci.yml` is the only CI file in this repo | Confirm when the pipeline files and the hotfix land on `main` in Azure Repos. |
| A-006 | 2026-11-16 | The dormant AI code calls xAI (`grok-4.5`, `XAI_API_KEY`). The Band C provider is not decided in this repo. | `src/lib/ai/resume-ai.ts:10-11` | Confirm the Band C provider and whether the xAI code is removed or replaced. |
| A-007 | 2026-11-16 | Rollback and kill-switch decisions are made by "the owner" and "the release approver". No named people are recorded in the repo. | `docs/RUNBOOK.md` | Name the incident decider and a backup. |
| A-008 | 2026-11-16 | The `v25.4` tag will point at `f30ee41` and `v25.4-hf.1` at the commit that lands the hotfix on `main`. No tags exist yet. | `docs/RELEASING.md` | Confirm, then create the tags. |
