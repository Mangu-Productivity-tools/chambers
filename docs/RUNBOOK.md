# Rollback runbook

Production is the Vercel project behind `chambers-app.vercel.app`, deployed from `main` by the Vercel Git integration. User data lives only in each user's browser, so a rollback cannot lose server data; there is none.

## Who decides

- The product owner decides to roll back, flip the kill switch, or take the site private.
- If the owner cannot be reached in 15 minutes and users are being harmed (private data leaving the device, invented resume content, site down), the release approver acts and tells the owner afterwards.
- Builders, human or AI, do not roll back or change production settings on their own. They report and prepare the fix.

Named people are not yet recorded (ASSUMPTIONS A-007).

## 1. Roll back: promote the previous deployment

Use when the latest production deployment is bad.

1. Vercel dashboard, project, **Deployments**.
2. Find the last known good production deployment (match its commit to the last good tag in `CHANGELOG.md`).
3. Open its menu and choose **Instant Rollback** or **Promote to Production**.
4. Load the live site and confirm the old build is serving.
5. A rollback does not change `main`. Revert or fix the bad commit by PR, or the next push will redeploy it.

CLI equivalent: `vercel rollback <deployment-url>` or `vercel promote <deployment-url>`.

## 2. Kill switch: AI off

AI assist is off when `VITE_ASSIST_ENABLED` is unset. Use this if it was ever turned on and must be stopped.

1. Vercel, project, **Settings**, **Environment Variables**: delete `VITE_ASSIST_ENABLED` for Production (and Preview).
2. **Redeploy** production. The flag is read at build time; removing the variable does nothing until a new build is live.
3. Faster stop while the build runs: revoke the AI provider key at the provider (takes effect at once), or promote the last deployment that was built with the flag off (section 1). Changing a Vercel environment variable alone does not affect deployments that are already live.
4. Verify: on the live site, paste a resume on `/start` and tailor on `/tailor` with browser dev tools open. No request should carry resume text.

## 3. Take the site private: Deployment Protection

Use when the site must not be publicly reachable while a fix is prepared.

1. Vercel, project, **Settings**, **Deployment Protection**.
2. Turn on Vercel Authentication (or Password Protection) and include production deployments. Which options are available depends on the Vercel plan; check before an incident.
3. Verify from a signed-out browser that the site asks for access.
4. Turn it off when the fix is live.

## After any of the above

- Tell the owner what was done and when.
- Open an Azure DevOps bug linked to the release work item.
- Fix forward as a hotfix (`vNN.M-hf.N`), see [RELEASING.md](RELEASING.md).
- Write the post-incident note within two working days.

## Post-incident note template

```
# Incident: <one line>

Date / time (ET):
Release affected (tag, commit):
Detected by:
Decided by:

## What users saw

## Impact
Who was affected, for how long. Did any resume text leave a device? Was any invented content shown?

## Timeline
- hh:mm detected
- hh:mm decision
- hh:mm rollback / kill switch / protection applied
- hh:mm verified

## Cause

## What we did

## What we will change
- [ ] action, owner, AB#<id>

## Claims check
Did this make any row in docs/CLAIMS.md false? Which, and is the copy corrected?
```
