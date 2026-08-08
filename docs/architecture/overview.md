# Architecture Overview

BotDock is a TypeScript monorepo (pnpm workspaces + Turborepo) with
separate deployable applications and small shared packages. The core
product loop — configure a bot, add knowledge, test it, publish it, embed
it, inspect what it said — is implemented end to end; see
`docs/api/overview.md` for the current route surface and the other files
in this directory for how each piece works.

## Application Responsibilities

- `apps/web`: authenticated owner dashboard — bot configuration,
  knowledge sources, playground, deployments/allowed domains,
  conversation inspection.
- `apps/api`: NestJS backend — auth, tenant-scoped CRUD, the chat runtime
  (SSE), knowledge ingestion orchestration, publishing, the public widget
  endpoint.
- `apps/widget`: the customer-facing embed — a small, dependency-light
  Vite bundle loaded through a script tag. See
  `docs/architecture/widget-integration.md`.
- `apps/demo-site`: an external site shell used to prove/verify widget
  integration end to end.

## Container Boundaries

Each runnable app has a Docker image:

- `botdock/api:local`: Node runtime for the NestJS API.
- `botdock/web:local`: Next.js standalone server for the dashboard.
- `botdock/widget:local`: Nginx-served static widget bundle.
- `botdock/demo-site:local`: Nginx-served static external demo site.

Local Compose (`docker-compose.yml`) also starts PostgreSQL with
pgvector, Redis, and MinIO. The API deploys to the DigitalOcean droplet
via `docker-compose.api.prod.yml` / `.github/workflows/deploy-api.yml`
(auto-deploys on a green CI run on `main`). `apps/web` deploys separately
to Vercel — that connection lives in Vercel's project settings, not
tracked as config in this repo. `apps/widget`/`apps/demo-site` don't have
a production deploy pipeline yet — see
`docs/architecture/widget-integration.md`.

## Shared Packages

- `packages/database`: Prisma schema, migrations, seed scripts, database
  client exports.
- `packages/contracts`: shared Zod request/response contracts — the
  single source of truth for API shapes, consumed by both `apps/api` and
  `apps/web`.
- `packages/ai-core`: LLM and embedding provider interfaces (currently
  OpenAI) with retry/timeout/error-mapping and cost estimation.
- `packages/sdk`: a framework-agnostic streaming client over the public
  widget API — the reference implementation the widget itself consumes.
- `packages/config`: environment schemas (`apiEnvironmentSchema`, Zod —
  the API refuses to boot on a missing/invalid env var rather than fail
  later at first use).
- `packages/logger`: structured JSON logger factory.
- `packages/ui`: a small shared component library (`Panel`, `DataTable`,
  `StatusBadge`, etc.) used across `apps/web`'s dashboard screens.

## Authentication

See `docs/architecture/authentication.md`. Google and GitHub OAuth are
both implemented, backend-owned (the dashboard never receives provider
secrets), with signed OAuth state and HTTP-only session cookies.

## Multi-Tenancy And BYOK

Every tenant-owned entity is scoped to an `Organisation`, enforced at the
service layer (`ensureOrganisationMember` before touching any data, on
every tenant-scoped endpoint) — not just at the database schema level.
Each organisation brings its own OpenAI API key rather than using a
platform-owned key for inference; see
`docs/architecture/byok-and-configuration.md` for the full model and its
security posture.
