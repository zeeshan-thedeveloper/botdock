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

**PASS.** The embed loop works end to end, confirmed live in a real (headless) Chrome browser against the local Docker stack. No code changes were made.

### Setup
- The running local `botdock/api:local` image predated commit `3548ccc` ("Serve the widget bundle at /widget.js in production"), so `/widget.js` 404'd before this task even started. Rebuilt the image from current `main` (`docker compose build api && docker compose up -d api`) — this is local image staleness, not a code defect; current `infrastructure/docker/api.Dockerfile` correctly bakes `apps/widget/dist/v1/botdock-widget.js` into `./public/widget.js`.
- Used the already-seeded bot `seed-botdock-docs-assistant` (org `local-botdock-labs`), which has an `ACTIVE` OpenAI `ProviderCredential`. Created a throwaway `auth_sessions` row and an `allowed_domains` row (`localhost`) purely as local test scaffolding, called the real `POST /organisations/:orgId/bots/:id/publish` endpoint to publish it, then `GET .../deployment` to obtain the actual, API-generated embed snippet:
  `<script src="http://localhost:4000/widget.js" data-deployment-id="dep_0c70b3cf-de3b-40ca-be78-e0d660e8944d" defer></script>`
- Dropped that exact snippet into a bare HTML file (no other markup/JS), served it from a plain static file server on `http://localhost:5500` (a real HTTP origin, not `file://`, since the origin-check guard rejects null/missing origins by design).
- Opened it in a real, unmodified Chrome (`Chrome/151.0.7922.138`, headless) and drove it over the Chrome DevTools Protocol (typed into the composer, clicked send, captured network traffic, console, and screenshots) — not a mock or simulated DOM.

### What was observed
- The `<script>` tag loaded `/widget.js` (200), the widget mounted its shadow-DOM host, and the launcher button opened the chat panel.
- **Streaming path with strict-knowledge fallback**: with the bot's original `strictKnowledge: true` and 0 indexed knowledge sources, asking "What is BotDock?" correctly returned the server-side fallback message ("I don't have information about that yet...") via the same streaming fetch path — confirms the full transport (widget → SDK client → `POST /public/bots/:deploymentId/messages`, CORS preflight 204 then fetch 200) works even when no LLM call is made.
- **Streaming path with a real LLM call**: temporarily set `strictKnowledge: false` on the same bot and re-published (same `deploymentId`, version bumped to 2 — publishing is idempotent on deployment identity). Asked "In one short sentence, what color is the sky on a clear day?" and received a genuine OpenAI-generated response — "The sky on a clear day is blue." — rendered token-by-token into the widget's assistant bubble, confirmed both via the DOM snapshot and a screenshot of the live browser window showing the full conversation in the chat panel.
- Network trace for the live test: `200 Document`, `200 Script /widget.js`, `204 Preflight`, `200 Fetch /public/bots/dep_.../messages` — no errors, no console errors.

### Cleanup
Restored `strictKnowledge` to `true` and re-published once more (back to the bot's original configuration), then deleted the test `auth_sessions` row, the test `allowed_domains` row, and the conversations/messages created during this test. No other data or code was touched.

### Conclusion
The embed → widget → API → provider round trip is real and functional as of this commit on `main`. No new task filed; proceeding to Task 02.
