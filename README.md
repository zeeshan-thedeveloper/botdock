# BotDock

BotDock is a multi-tenant platform for configuring, publishing, embedding, and monitoring AI-powered chatbots.

## Problem

Teams need chatbot infrastructure that behaves like a product platform rather than a one-off OpenAI demo. BotDock is designed around tenant isolation, configurable bot drafts, future published versions, embeddable runtime delivery, retrieval boundaries, streaming responses, and operational visibility.

## Main Product Flow

1. User creates an account and joins an organisation.
2. Organisation creates and configures a chatbot.
3. Owner adds knowledge sources and tests the bot in a playground.
4. Owner publishes a version and receives JavaScript embed code.
5. A visitor chats with the embedded widget on an external site.
6. Owner inspects conversations, sources, latency, model metadata, usage, cost, feedback, and errors.

## Planned Architecture

- `apps/web`: Next.js dashboard and future playground.
- `apps/api`: NestJS API, validation, OpenAPI docs, health checks, future streaming chat runtime.
- `apps/widget`: Vite-built framework-independent embeddable widget.
- `apps/demo-site`: External website shell that demonstrates widget consumption.
- `packages/database`: Prisma schema and generated client.
- `packages/contracts`: Shared Zod contracts and TypeScript types.
- `packages/ai-core`: AI provider interfaces and local mock providers.
- `packages/config`, `packages/logger`, `packages/ui`, `packages/sdk`, `packages/testing`: shared platform packages.

## Technology Stack

- TypeScript monorepo with pnpm workspaces and Turborepo.
- Next.js App Router, Tailwind CSS, React Hook Form, Zod, TanStack Query.
- NestJS, Prisma, PostgreSQL with pgvector, Redis, BullMQ-ready infrastructure, Swagger/OpenAPI.
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

- Implemented: monorepo foundation, shared config packages, minimal Prisma schema, API health endpoint, dashboard shell, widget shell, demo-site shell, Docker Compose, CI, documentation.
- In Progress: repository foundation verification.
- Planned: authentication, organisations UI, bot configuration, RAG ingestion, streaming runtime, publishing, analytics, API keys, domain restrictions.

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
- `botdock/widget:local` on `http://localhost:5173/botdock-widget.js`
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

Use `.env.example` as the local template. Do not commit real credentials.

## Testing And Quality

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

## Security Principles

- Tenant-owned data must be scoped to an organisation.
- Validation belongs at API boundaries.
- API keys will be hashed before storage.
- Future public chatbot runtime will enforce domain restrictions and rate limits.
- Widget-rendered content must be sanitized and isolated from host CSS.
- Logs should be structured and avoid secrets or sensitive message content by default.

## Roadmap Summary

- Phase 0: Repository foundation.
- Phase 1: Authentication and organisations.
- Phase 2: Bot configuration.
- Phase 3: Knowledge ingestion.
- Phase 4: Chat runtime.
- Phase 5: Publishing and widget.
- Phase 6: Conversations and analytics.
- Phase 7: Security and hardening.
- Phase 8: Portfolio polish and deployment.

## Limitations

BotDock does not yet include authentication, uploads, RAG, production AI calls, streaming chat APIs, published bot versions, billing, or analytics. The current state is a production-minded foundation for incremental development.

## Screenshots

Planned.

## Demo

Planned.
