# Demo Site Deployment Plan

Audit and plan only. No files changed, no deploys run, no dependencies added
beyond this document.

## 1. What's missing (confirmed, with evidence)

### No documented (or scripted) way to get a production deploymentId + allowed-domain entry for a demo bot

- `packages/database/prisma/seed.ts` (63 lines total) creates a `User`
  (lines 6-10), an `Organisation` (lines 12-16), an `OrganisationMember`
  (lines 18-29), and a `Bot` (lines 31-59) — and stops there. It never
  creates a `BotDeployment` (i.e. never publishes the bot) and never creates
  an `AllowedDomain` row. The seeded bot is left in `DRAFT` status with no
  `providerCredentialId` set.
- This seed only runs locally: README.md's "Local Setup" section (lines
  78-87) lists `pnpm db:seed` as a local step. `.github/workflows/deploy-api.yml`
  (the only thing that touches the production droplet) has no seed step —
  its `Deploy to droplet` step (lines 65-72) only runs `docker compose ...
  pull` / `up -d --force-recreate`.
- No file under `docs/` mentions "allowed domain," "deploymentId," or "demo
  bot" as an operational runbook step. The only places `allowed domain` /
  `deploymentId` appear in `docs/` are architecture descriptions of the
  mechanism itself (`docs/architecture/widget-integration.md`,
  `docs/architecture/chat-runtime.md`, `docs/decisions/origin-enforcement.md`,
  `docs/audit/architecture-findings.md`) or task-tracking notes from a prior
  audit pass that describe *ad hoc, local, throwaway* scaffolding I created
  for a one-off verification (`docs/tasks/01-verify-embed-loop.md`, lines
  26 and 46-58) — explicitly not a reusable or production process.
- **Conclusion: this operational step is entirely undocumented and
  unscripted.** Getting a real, published, production `deploymentId` with a
  registered allowed domain today requires a human to sign in to the
  dashboard, publish a bot via its Deployments tab (backed by
  `DeploymentController`, `apps/api/src/modules/deployment/deployment.controller.ts`,
  lines 15-55: `GET/POST allowed-domains`, `GET deployment`), and manually
  add the domain. Nothing does this for you.
- **Notable local lead, not a production fact**: an untracked, gitignored
  `apps/demo-site/.env` file already exists on this machine (confirmed via
  `.gitignore` lines 8-10: `.env`, `.env.*`, `!.env.example` — so this file
  was never committed) pointing at a *real* production deployment:
  `VITE_BOTDOCK_DEPLOYMENT_ID=dep_349d686e-b166-49e1-b099-09fce997067b`
  against `https://botdock-api.zeeshanahmed.app`. This suggests a real bot
  was published in production at some point for exactly this kind of
  testing. **I could not verify whether this deployment is still active** —
  a live probe against it was blocked by this environment's own
  permission guard before I could attempt it, and there is no read-only way
  to check deployment status from the repo alone (the only relevant public
  endpoint, `POST /public/bots/:deploymentId/messages`, would need to
  actually be called to get a signal, which I did not do). Treat this as an
  open question, not a confirmed asset — see §4.

### No deploy target for `apps/demo-site`

- Confirmed no `vercel.json` or `netlify.toml` exists anywhere in the repo
  (workspace-wide search, zero matches outside `node_modules`).
- Confirmed `.github/workflows/` contains exactly two files: `ci.yml` and
  `deploy-api.yml`. Neither references `demo-site`. `deploy-api.yml`'s
  `IMAGE_NAME` (line 15) and `Sync compose file to droplet` step (lines
  60-63) are hardcoded to `botdock-api` / `docker-compose.api.prod.yml`.
- `docker-compose.api.prod.yml` (the only prod compose file) defines exactly
  two services, `api` and `redis` (lines 8, 26) — no `demo-site` service.
- `infrastructure/docker/demo-site.Dockerfile` exists and is fully
  functional (multi-stage Node build → nginx runner, lines 1-19) but is
  wired up only in the **local** `docker-compose.yml` (lines 77-90,
  `botdock/demo-site:local`, port `5174`) — nothing references it for
  production.
- README.md states this gap explicitly and accurately: line 70 ("...a
  production hosting pipeline for the embeddable widget itself... but
  `apps/widget`/`apps/demo-site` don't deploy anywhere yet") and line 76
  ("Widget/demo-site: not deployed anywhere yet.").

### `.env.example` does not document the three `VITE_BOTDOCK_*` vars

- Confirmed: `.env.example` (23 lines) contains API/web/database/auth/OAuth/
  MinIO variables only. It has zero `VITE_BOTDOCK_*` entries.
- The three vars demo-site actually reads —
  `VITE_BOTDOCK_WIDGET_URL`, `VITE_BOTDOCK_API_BASE_URL`,
  `VITE_BOTDOCK_DEPLOYMENT_ID` — are defined in `apps/demo-site/src/main.ts`
  lines 3-5, with only the first two ever set anywhere in tracked config
  (`docker-compose.yml` lines 82-83, and the `ARG`/`ENV` pairs in
  `infrastructure/docker/demo-site.Dockerfile` lines 2-5). **Nothing tracked
  in git sets `VITE_BOTDOCK_DEPLOYMENT_ID` at all** — every tracked build
  path (local docker compose, the demo-site Dockerfile) currently embeds the
  widget with an empty deployment id (`main.ts` line 5's `?? ''` fallback).
  Only the untracked local `.env` file (see above) sets a real one, for
  bare-metal `pnpm --filter @botdock/demo-site dev` — not for any Docker or
  CI build path.

## 2. What "done" looks like

A hiring manager opens one public HTTPS URL (e.g.
`https://demo.botdock.zeeshanahmed.app`) with no VPN, no login, and no local
setup, and sees a realistic customer-site shell (the existing "Acme
Developer Docs" mock, `apps/demo-site/src/main.ts` lines 9-23) with the real
BotDock chat launcher in the corner. Clicking it opens the actual production
widget bundle served live from `https://botdock-api.zeeshanahmed.app/widget.js`
— not a mock, not a screenshot. Typing a real question and pressing send
streams back a real, non-generic answer from a real bot with actual
knowledge sources behind it (not the strict-knowledge fallback message,
which reads as broken to someone who doesn't know it's the intended
behavior for an empty knowledge base). The page keeps working indefinitely
without anyone re-running a local script, redeploying manually, or renewing
a certificate by hand. Refreshing, or opening it from a different network,
produces the same result every time.

## 3. How this gets built

### Hosting recommendation: Vercel

**Recommendation: a second Vercel project for `apps/demo-site`, not a third
service on the droplet.**

Reasoning:

- `apps/web` already deploys to Vercel today (README.md line 75), so the
  account/org (`zeeshanthedevelopers-projects`, visible in this repo's own
  PR check URLs) and the git-push-to-deploy pattern already exist —
  zero new vendor relationship.
- `apps/demo-site` is a pure static SPA (`tsc + vite build`, per
  `apps/demo-site/package.json` line 7): no server runtime, no API routes,
  nothing a container buys you. Static hosts exist specifically for this.
- Adding it to `docker-compose.api.prod.yml` would require: (a) a Caddy
  config change on the droplet for a new domain/subdomain, which lives
  outside this repo entirely (per the droplet-deployment memory: Caddyfile
  is hand-managed on the box, not version-controlled here) — an
  undocumented manual step regardless of hosting choice; (b) a new build+push
  step in CI for a second image; (c) extending `docker-compose.api.prod.yml`
  or adding a second compose file; and (d) consuming RAM/CPU on a droplet
  documented elsewhere as resource-constrained — all for a page with no
  backend logic of its own. None of that buys anything a static host
  doesn't already give you for free (global CDN, automatic TLS, zero ops).
- Cloudflare Pages or Netlify would work equally well technically; Vercel
  wins purely on "already the established pattern in this exact repo."

**No new GitHub Actions workflow is needed.** `apps/web`'s Vercel deployment
is "connected via Vercel's project settings, not tracked as config in this
repo" (README.md line 75) — Vercel's own GitHub App deploys on push, bypassing
`.github/workflows` entirely. The same applies here. Also worth noting: CI
already exercises `apps/demo-site`'s lint/typecheck/test/build today, because
`ci.yml` runs root-level `pnpm lint` / `pnpm typecheck` / `pnpm test` /
`pnpm build`, and Turborepo (`turbo.json`) runs those across every workspace
package including `@botdock/demo-site` — confirmed directly: a root
`pnpm typecheck` run during this audit executed `@botdock/demo-site:typecheck`
alongside every other package. So build-breakage protection already exists;
only the deploy trigger itself is missing.

### Proposed config file (not created — copy-paste ready)

`apps/demo-site/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @botdock/demo-site build",
  "outputDirectory": "dist",
  "framework": null
}
```

This assumes the Vercel project's **Root Directory** setting is
`apps/demo-site` and its **"Include files outside of the Root Directory in
the Build Step"** toggle is enabled (a dashboard setting, not something a
committed file can express) so the build can `cd` up to the monorepo root,
install with the workspace's pnpm lockfile, and build just this package via
Turborepo's filter. This is the standard pattern for a pnpm-workspace
monorepo on Vercel; the exact `buildCommand` may need a one-time adjustment
in the dashboard while setting the project up if Vercel's zero-config
monorepo detection behaves differently than expected — flagged here rather
than asserted as certain, since it can't be verified without a live Vercel
project to test against.

### Environment variables to set on the Vercel project

| Variable | Value | Status |
|---|---|---|
| `VITE_BOTDOCK_WIDGET_URL` | `https://botdock-api.zeeshanahmed.app/widget.js` | Confirmed live today — `curl -I` against this URL returns `200`, `content-type: application/javascript`, during this audit. |
| `VITE_BOTDOCK_API_BASE_URL` | `https://botdock-api.zeeshanahmed.app` | Confirmed live (`/health` returns `200 {"status":"ok",...}` during this audit). |
| `VITE_BOTDOCK_DEPLOYMENT_ID` | — | **NEEDS DECISION** — see open questions. Not a value I can supply: depends on which bot gets published for this purpose. |

### Required manual action: register the allowed domain

Whatever domain Vercel assigns (or whatever custom domain gets attached)
**must** be added as an `AllowedDomain` row for the chosen bot before the
widget will work, via `POST /organisations/:orgId/bots/:botId/allowed-domains`
(`DeploymentController`, lines 25-34) — either through the dashboard's
Deployments tab or a direct authenticated API call. Skipping this produces
no build error and no obviously-broken page: the demo page loads, the
launcher renders, and only on sending a message does the widget surface a
`ForbiddenException` ("This domain is not allowed to embed this bot.") from
`WidgetController.streamMessage` (`apps/api/src/modules/chat/widget.controller.ts`,
lines 45-50), driven by `isOriginAllowed`'s fail-closed check
(`apps/api/src/modules/deployment/origin.util.ts`, lines 17-20: empty
pattern list or missing origin both return `false`). This is the single
most likely way this deployment silently "half-works."

Note: this is independent of CORS — `main.ts`'s CORS handler already
reflects any origin for `/public/*` routes (lines 41-45), specifically
because the real access-control decision is `isOriginAllowed`, not CORS.
Getting CORS right does not mean the domain is registered.

### Open questions / risks (need your decision, not mine)

1. **Which bot backs the demo?** Reuse whatever bot
   `dep_349d686e-b166-49e1-b099-09fce997067b` (from the untracked local
   `.env`) points to — if it's still live and suitable — or publish a
   dedicated, purpose-built "demo" bot? I can't check the DB or safely probe
   the live deployment from here to tell you which.
2. **Domain name.** Something like `demo.botdock.zeeshanahmed.app` needs a
   DNS record (Hostinger, per prior deployment notes for this account) and
   to be added in Vercel's project domain settings. Your call on the exact
   subdomain.
3. **Knowledge base quality.** If the demo bot has `strictKnowledge: true`
   and no indexed knowledge sources (the seeded bot's default — see
   `seed.ts` line 56), a hiring manager's question gets the generic
   fallback message, not a real answer — this reads as broken to someone
   unfamiliar with the intended behavior. The demo bot needs either real
   knowledge sources uploaded, or `strictKnowledge: false` if a
   general-purpose answer is acceptable for the demo.
4. **Real or throwaway API key.** The demo bot's BYOK provider credential
   will be hit by anyone who finds the URL, not just vetted visitors. A
   public demo bot should probably run on a capped/low-limit key, not a
   production key shared with real customers or dashboards.
5. **Public exposure / abuse surface.** The existing per-deployment
   aggregate rate limit (300 req/60s, `WidgetRateLimitGuard`) bounds worst-case
   spend but doesn't eliminate it for a URL anyone can find, crawl, or
   share. Worth deciding whether that ceiling is acceptable for a
   permanently-public demo, or whether it should be lower for this specific
   deployment.
6. **Vercel account/DNS access.** I have no visibility into the Vercel
   account's current project list or the Hostinger DNS zone from this repo
   — confirming the demo domain is actually available and wiring the DNS
   record is something only you can do.

## Recommended next 3 actions, in order

1. Decide the bot: check whether `dep_349d686e-b166-49e1-b099-09fce997067b`
   is still a live, suitably-configured production deployment (via the
   dashboard, not a raw API probe); if not, publish a dedicated demo bot
   with real knowledge sources and a capped API key.
2. Create the Vercel project for `apps/demo-site` (Root Directory =
   `apps/demo-site`, "include files outside root" enabled), add the
   `vercel.json` above, set the three `VITE_BOTDOCK_*` env vars (using the
   deployment id chosen in step 1), and pick/attach the demo domain.
3. Immediately after the first successful deploy, register that exact
   domain as an `AllowedDomain` for the chosen bot before considering this
   done — then actually open the live URL and send a real message to
   confirm end-to-end, the same way Task 01 verified the embed loop
   locally.
