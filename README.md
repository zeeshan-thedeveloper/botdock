# BotDock

BotDock is a multi-tenant platform for configuring, publishing, embedding, and monitoring AI-powered chatbots.

## Problem

Teams need chatbot infrastructure that behaves like a product platform rather than a one-off OpenAI demo. BotDock is built around tenant isolation, bring-your-own-key (BYOK) model billing, versioned publishing, embeddable runtime delivery, retrieval-grounded responses, streaming chat, and conversation inspection.

## Main Product Flow

1. User creates an account and joins an organisation (Google or GitHub OAuth).
2. Organisation connects its own OpenAI API key (BYOK — see `docs/architecture/byok-and-configuration.md`).
3. Organisation creates and configures a chatbot: identity, instructions, model, appearance, safety.
4. Owner adds knowledge sources and tests the bot in an authenticated playground, with streaming responses and a debug trace.
5. Owner publishes a version, registers allowed embed domains, and copies the JavaScript embed snippet.
6. A visitor chats with the embedded widget on an external site — streamed, citation-grounded, rate-limited, origin-restricted.
7. Owner inspects the resulting conversations: transcript, citations, and per-message model/token/latency/cost.

This loop is implemented end to end and verified live (not just unit-tested) at every step — see `docs/api/overview.md` for the current route surface and `docs/architecture/` for how each piece works.

## Architecture

- `apps/web`: Next.js dashboard — bot configuration, knowledge, playground, deployments/allowed domains, conversation inspection.
- `apps/api`: NestJS API — auth, tenant-scoped CRUD, the SSE chat runtime, knowledge ingestion, publishing, the public widget endpoint.
- `apps/widget`: Vite-built, dependency-light, framework-independent embeddable widget.
- `apps/demo-site`: external website shell that demonstrates real widget integration.
- `packages/database`: Prisma schema, migrations, generated client.
- `packages/contracts`: shared Zod contracts and TypeScript types — the source of truth for API shapes.
- `packages/ai-core`: AI provider interfaces (OpenAI) with retry/timeout/error-mapping and cost estimation.
- `packages/sdk`: framework-agnostic streaming client over the public widget API; the widget itself is its reference consumer.
- `packages/config`, `packages/logger`, `packages/ui`, `packages/testing`: shared platform packages.

## Technology Stack

- TypeScript monorepo with pnpm workspaces and Turborepo.
- Next.js App Router, Tailwind CSS, Zod.
- NestJS, Prisma, PostgreSQL with pgvector, Redis (BullMQ ingestion worker + widget rate limiting), MinIO/S3, Swagger/OpenAPI.
- Vite for widget and demo-site bundles.
- ESLint, Prettier, Vitest, GitHub Actions CI.

## Repository Structure

```text
apps/
  api/
  demo-site/
  web/
  widget/
packages/
  ai-core/
  config/
  contracts/
  database/
  eslint-config/
  logger/
  sdk/
  testing/
  typescript-config/
  ui/
docs/
infrastructure/
```

Private planning lives in `.project/`, which is ignored by git.

## Current Implementation Status

**Implemented and live-verified**: OAuth authentication, BYOK provider credentials, bot configuration (draft + publish), knowledge ingestion (text/file sources, chunking, embeddings, pgvector retrieval), the SSE chat runtime (authenticated playground + public widget), publishing and versioning, allowed-domains/embed snippet management, the embeddable widget and its SDK, and read-only conversation inspection.

**Not yet implemented**: analytics/usage aggregation dashboards, billing, team/organisation membership management UI, conversation mutations (mark-for-review/archive/export), and a production hosting pipeline for the embeddable widget itself (the API deploys to the droplet, `apps/web` deploys to Vercel — see below — but `apps/widget`/`apps/demo-site` don't deploy anywhere yet).

## Production

- API: `https://botdock-api.zeeshanahmed.app` — auto-deploys on a green CI run on `main` (`.github/workflows/deploy-api.yml`, `docker-compose.api.prod.yml`, DigitalOcean droplet).
- Dashboard: `https://botdock.zeeshanahmed.app` — deploys to Vercel (connected via Vercel's project settings, not tracked as config in this repo).
- Widget/demo-site: not deployed anywhere yet.

## Local Setup

```sh
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Development Commands

```sh
pnpm dev
pnpm --filter @botdock/api dev
pnpm --filter @botdock/web dev
pnpm --filter @botdock/widget dev
pnpm --filter @botdock/demo-site dev
```

API health endpoint: `http://localhost:4000/health`

Swagger docs: `http://localhost:4000/docs`

Dashboard: `http://localhost:3000`

Widget dev server: `http://localhost:5173`

Demo site: `http://localhost:5174`

## Docker Images And Runtime

Build the local application images:

```sh
pnpm docker:build
```

Run the full local stack:

```sh
pnpm docker:up
```

This starts:

- `botdock/api:local` on `http://localhost:4000`
- `botdock/web:local` on `http://localhost:3000`
- `botdock/widget:local` on `http://localhost:5173/v1/botdock-widget.js`
- `botdock/demo-site:local` on `http://localhost:5174`
- PostgreSQL with pgvector, Redis, and MinIO

Stop containers:

```sh
pnpm docker:down
```

Run database migrations against the Docker Postgres service:

```sh
docker compose run --rm api pnpm db:migrate
docker compose run --rm api pnpm db:seed
```

## Environment Variables

Use `.env.example` as the local template — it's kept up to date with every
variable the API actually reads (`packages/config`'s environment schema
fails fast on boot if anything required is missing). Do not commit real
credentials. See `docs/architecture/authentication.md` for OAuth app setup
and `docs/architecture/byok-and-configuration.md` for
`PROVIDER_CREDENTIAL_ENC_KEY`.

## Testing And Quality

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

## Security Principles

- Tenant-owned data is scoped to an organisation, enforced at the service layer on every tenant-scoped endpoint — not just at the schema level.
- Validation happens at API boundaries (Zod contracts + class-validator DTOs).
- BYOK provider secrets are AES-256-GCM encrypted at rest and never returned in API responses.
- The public widget runtime enforces per-bot allowed-domain origin checks (fail closed) and Redis-backed rate limiting.
- Widget content renders inside an isolated shadow root, separate from host page CSS.
- Logs are structured JSON and avoid secrets or sensitive message content by default.

## Documentation

- `docs/api/overview.md` — current route surface.
- `docs/architecture/overview.md` — how the pieces fit together.
- `docs/architecture/authentication.md` — OAuth setup, production callback URLs, troubleshooting.
- `docs/architecture/byok-and-configuration.md` — the BYOK model and bot configuration.
- `docs/architecture/knowledge-ingestion.md` — the ingestion pipeline.
- `docs/architecture/chat-runtime.md` — the SSE chat protocol and pipeline.
- `docs/architecture/widget-integration.md` — the embeddable widget.
- `docs/decisions/` — public-facing architecture decisions.

## Screenshots

Planned.

## Demo

Planned.
