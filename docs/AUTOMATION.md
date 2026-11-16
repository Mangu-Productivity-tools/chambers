# Story-to-ship automation (Chambers)
1. A story moves to **Active** in Azure Boards (area = domain, iteration = version).
2. The assigned Claude Code seat is given the story id + its FR rows from the BRD/RTM, works on `feature/AB#<id>-<slug>`, and opens a PR containing `AB#<id>` (Azure Boards links it automatically).
3. Pipeline Gate -> E2E run on the PR. Grok reviews the PR; honesty/redaction/auth/billing paths get a second-model review.
4. Branch policy on main (required: Gate + E2E, 1 reviewer, linked work item) blocks merge until green.
5. Merge to main -> Release stage waits for approval on environment `production`, then Vercel ships; the story auto-closes on merge.
Tests are added per story from its Given/When/Then ACs; the E2E suite grows each release and is the regression pack for every later version.
