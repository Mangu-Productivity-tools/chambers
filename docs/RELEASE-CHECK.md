# Release check (post-deploy)

Run after every production deploy. Ten minutes. If any step fails, roll back first (step 6), then investigate.

Launch posture being verified: local-first, AI off, no third-party scripts, resume text never leaves the browser.

`PROD` below is the deployed origin, e.g. `https://chambers-app.vercel.app` (no trailing slash).

## 1. Route smoke (FR-TST-103)

```bash
BASE_URL=$PROD npm run e2e:smoke
```

Setting `BASE_URL` skips the local build and preview and runs against the deployment. Covers `/`, `/start`, `/studio`, `/tailor`, `/letter`, `/templates`, `/tools`, `/versions`, `/export` and a 404 path: status < 400, no uncaught page error, no console error, content region visible, no off-origin request.

Pass: 0 failed. Skipped tests are known gaps listed in `e2e/routes.smoke.spec.ts` (`/settings` not built, missing `<main>` landmarks, soft 404); a skip count that grows is a failure.

## 2. Privacy invariant (FR-TST-105)

```bash
BASE_URL=$PROD npm run e2e -- privacy
```

Pastes a synthetic resume and posting, tailors, drafts the letter, exports. Fails if any request goes to another host, carries a resume marker in URL or body, or targets `grok.com` / `x.ai`. It also fails on any non-GET request during the loop.

Pass: 2 passed. Never run this check with a real resume.

## 3. AI is off

- Vercel project → Settings → Environment Variables: `VITE_ASSIST_ENABLED` is unset or `false` for Production. It is a build-time flag; changing it needs a redeploy.
- In the browser on `$PROD/start`: paste any text, press **Build the sheet**. The toast reads "On paper. Stays on this device." and DevTools → Network shows no `POST /_serverFn/…`.
- Step 2 enforces the same thing automatically (toast copy plus zero non-GET requests).

## 4. No third-party scripts

```bash
curl -s $PROD/ | grep -Eo '(src|href)="https?://[^"]+"' | grep -v "$PROD" || echo "clean"
```

Expect `clean`. Step 1 also asserts, per route, that every script, stylesheet, frame, image and preload tag is same-origin and that the page contacts no other host. Analytics, fonts, tag managers and error-reporting SDKs all count as third party.

## 5. Offline spot check (FR-TST-102 groundwork)

```bash
BASE_URL=$PROD npm run e2e -- offline
```

Pass: 1 passed, 1 skipped. The skipped "cold" case is the open FR-TST-102 gap (no precached app shell); `E2E_OFFLINE_COLD=1` runs it.

## 6. Rollback

Promote the previous deployment: Vercel dashboard → the project → **Deployments** → the last known-good production deployment → **⋯** → **Promote to Production** (labelled **Instant Rollback** on some plans). CLI equivalent: `vercel rollback <deployment-url>`.

Then:

1. Re-run steps 1 and 2 against `$PROD` to confirm the previous build is serving.
2. Note the bad deployment URL and the failing step in the release thread.
3. Do not redeploy `main` until the fix has passed `npm run e2e` locally or in CI.

Rollback does not touch user data: resumes live in each browser's `localStorage` (`chambers-studio`), not on the server.

## Running the suite locally or in CI

```bash
npm ci
npx playwright install --with-deps chromium   # CI agents only
npm run e2e                                   # builds, serves on http://127.0.0.1:8081, runs everything
npm run e2e:report                            # open the HTML report (e2e/playwright-report)
```

The runner is the `playwright` devDependency (`playwright/test`); there is no separate `@playwright/test` package. JUnit output is written to `e2e/test-results/junit.xml`.
