# Task 01: Verify the embed loop works end to end

## Goal
Confirm, in a real browser, that a bot's generated embed snippet actually
streams a chat message back from the deployed widget/API path.

## Why (cite the audit finding)
`docs/audit/architecture-findings.md`, section 5 ("Widget Deployment
Status") and `DeploymentService.buildEmbedSnippet`
(`apps/api/src/modules/deployment/deployment.service.ts`): the generated
embed snippet points at `${API_PUBLIC_URL}/widget.js`, which
`infrastructure/docker/api.Dockerfile` builds from `apps/widget` and serves
out of the API container's `public/widget.js`. Nothing in the audit or the
codebase confirms this path has ever been exercised live in a real browser
— CI only lints/typechecks/tests/builds, it doesn't smoke-test the embed.

## Files likely involved
- None expected to change. This is a verification task: take a real bot's
  generated embed snippet, drop it into a bare HTML file, open it in a
  browser, and observe. If a throwaway local HTML fixture is needed to hold
  the snippet, it belongs outside the tracked source tree (e.g. under the
  scratchpad), not committed to the repo.

## Acceptance criteria
- A real bot is published/deployed (locally or against the live droplet —
  whichever gives a real `API_PUBLIC_URL` and a real `deploymentId`).
- Its generated embed snippet is copied into a bare HTML file and opened in
  an actual browser.
- A message is sent through the widget UI and observed to stream back a
  response (or fail to).
- The Result section below records pass/fail and exactly what was observed:
  console errors, network requests, response behavior, screenshots/output
  if useful.

## Out of scope
Do not fix anything found broken here. If the embed loop is broken, file it
as a new task (append a new numbered task file) and stop — do not proceed
to Task 02. See the stop condition in the governing prompt.

## Result
_(filled in during Step 2)_
