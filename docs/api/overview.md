# API Overview

Status: Implemented (MVP loop)

Full interactive docs are always available at `GET /docs` (Swagger/OpenAPI),
generated from the live route definitions — treat this page as a map, not
the source of truth for request/response shapes.

The NestJS API is organized as tenant-scoped route groups under
`organisations/:orgId/...`, plus a small set of unauthenticated public
routes for the embedded widget. Every tenant-scoped route enforces
organisation membership (`SessionAuthGuard` + an `ensureOrganisationMember`
check) before touching any data.

## Authenticated, tenant-scoped

- **Auth** (`/auth`) — `GET /auth/providers`, `GET /auth/oauth/:provider/start`
  and `GET /auth/oauth/:provider/callback` (`google`/`github`),
  `GET /auth/session`. See `docs/architecture/authentication.md`.
- **Bots** (`/organisations/:orgId/bots`) — list, create, update (draft
  config: identity, instructions, model, appearance, safety), and
  `POST /organisations/:orgId/bots/:id/publish` (snapshots the draft into
  an immutable `BotVersion` and upserts the `PRODUCTION` `BotDeployment`).
- **Provider credentials** (`/organisations/:orgId/provider-credentials`)
  — BYOK: list, create, `POST :id/validate` (live-checks the key against
  the provider), and delete a tenant's own OpenAI key (the dashboard
  achieves "rotate" as delete + create). Secrets are AES-256-GCM encrypted
  at rest and never returned in API responses (only a label + last 4
  characters). See `docs/architecture/byok-and-configuration.md`.
- **Knowledge** (`/organisations/:orgId/bots/:botId/knowledge`) — add a
  knowledge source (uploaded file or pasted text), list sources with
  ingestion status, delete a source. Ingestion (parse → chunk → embed →
  store) runs asynchronously on a BullMQ worker. See
  `docs/architecture/knowledge-ingestion.md`.
- **Playground** (`/organisations/:orgId/bots/:botId/playground/messages`)
  — authenticated SSE chat against the bot's **draft** config, with an
  optional debug trace (retrieved chunks, prompt preview, model/token/cost
  metadata) for the owner testing their own bot. See
  `docs/architecture/chat-runtime.md`.
- **Deployment** (`/organisations/:orgId/bots/:botId/...`) —
  `GET .../deployment` (status, current version, embed snippet),
  `GET|POST /allowed-domains`, `DELETE /allowed-domains/:id` (which
  origins may embed this bot's widget).
- **Conversations** (`/organisations/:orgId/conversations`) —
  cursor-paginated list (filterable by `botId`/`source`/`search`,
  `PLAYGROUND` traffic excluded by default) and
  `GET .../conversations/:id` for the full transcript with citations and
  per-message usage — read-only inspection of what a published bot has
  actually said.

## Public (no session, origin-restricted)

- **Widget** (`POST /public/bots/:deploymentId/messages`) — SSE chat
  against the bot's **published** config for anonymous website visitors.
  Origin-checked against the bot's allowed domains (fail closed),
  rate-limited per deployment+IP via Redis, debug trace never included.
  See `docs/architecture/widget-integration.md` and
  `docs/architecture/chat-runtime.md`.

## Infrastructure

- `GET /health` — liveness/readiness for the deploy pipeline.
- `GET /docs` — Swagger/OpenAPI UI.

## Not yet implemented

- Analytics/usage aggregation endpoints (`UsageRecord` rows are written on
  every chat turn, but nothing rolls them up yet).
- Conversation mutations (mark-for-review, archive, export) — the
  conversations API is intentionally read-only for now.
- Team/organisation membership management endpoints beyond what OAuth
  sign-in creates automatically.
