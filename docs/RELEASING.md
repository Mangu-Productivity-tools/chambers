# Releasing

## Versions

- `MAJOR.MINOR`, waterfall, released in numeric order from v25.4 to v102.4.
- `x.4` is the hardened exit minor of each major.
- Hotfixes are `vNN.M-hf.N`, numbered from 1 per minor.

## Tags

Every release gets an annotated tag on `main`:

```bash
git tag -a v26.0 -m "v26.0" <commit-on-main>
git tag -a v25.4-hf.1 -m "v25.4-hf.1: launch hotfix" <commit-on-main>
git push origin v26.0
```

- One tag per minor (`vNN.M`), one per hotfix (`vNN.M-hf.N`).
- Tags are never moved or deleted. A bad release is fixed by a new hotfix tag.
- Tag only commits that are on `main`.

## Release steps

1. All PRs for the version are merged to `main`. Each references its work item (`AB#<id>`) and FR ids.
2. `CHANGELOG.md` has a dated section for the version. Move items out of `[Unreleased]`.
3. The "Chambers CI" pipeline is green on the release commit: Gate, then Playwright E2E.
4. The approver approves the `production` environment in Azure DevOps. No approval, no release.
5. Vercel deploys `main` through its Git integration. Confirm the production deployment is the release commit.
6. Create and push the annotated tag on that commit.
7. Smoke the live site: load `/`, paste a sample on `/start`, tailor, export `.docx`. Confirm no AI network calls (flag off).

Never release from a feature or hotfix branch. A hotfix branch is merged to `main` by PR, then released from `main` by the same steps.

## Hotfixes

1. Branch `hotfix/vNN.M-<slug>` from the released tag (or from `main` if nothing else has landed).
2. Smallest possible change, with tests.
3. PR to `main`, same checks and approval.
4. Tag `vNN.M-hf.N`, add a CHANGELOG section.

## Current state (16 Nov 2026)

- No tags exist yet. `v25.4` should be created on `f30ee41`; `v25.4-hf.1` on the commit that lands the hotfix on `main`.
- The hotfix (`6e22abf`) is on `hotfix/v25.4-launch`, not yet on `main`.
- `azure-pipelines.yml` and the `e2e/` suite are in the Azure Repos copy, not yet in this branch. Here, `.github/workflows/ci.yml` runs `npm ci`, `npm run test:resume` and `npm run typecheck`.

Rollback: see [RUNBOOK.md](RUNBOOK.md).
