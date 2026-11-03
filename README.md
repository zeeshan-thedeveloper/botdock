# BotDock

BotDock is a multi-tenant platform for configuring, publishing, embedding, and monitoring AI-powered chatbots.

## Problem

Teams need chatbot infrastructure that behaves like a product platform rather than a one-off OpenAI demo. BotDock is built around tenant isolation, bring-your-own-key (BYOK) model billing, versioned publishing, embeddable runtime delivery, retrieval-grounded responses, streaming chat, and conversation inspection.

## Features

What you can actually do with BotDock, end to end:

- **Sign in and get a workspace instantly** — Google or GitHub OAuth, with a personal organisation auto-provisioned on first signup (no separate "create a workspace" step).
- **Bring your own OpenAI key (BYOK)** — connect your own API key once, encrypted at rest (AES-256-GCM), used for both chat and embeddings across every bot in the org.
- **Configure a bot** — identity, system instructions, model/temperature, appearance, and safety settings, with a draft/publish split so edits don't affect what's live.
- **Give it knowledge (RAG)** — upload text or file sources; they're chunked, embedded, and indexed in pgvector asynchronously, then retrieved per-query and scoped strictly to your organisation and bot.
- **Test it live in a playground** — authenticated three-panel UI: streamed token-by-token responses, retrieved source chunks, and a debug trace (prompt, latency, tokens, cost) for every turn.
- **Publish and embed it anywhere** — one click creates an immutable, versioned deployment; register the domains allowed to embed it, then drop in a `<script>` tag (or use `@botdock/sdk` directly) to get a real, streaming, citation-grounded chat widget on any site — rate-limited and origin-restricted so only your own domains and your own OpenAI spend are on the hook.
- **Inspect every conversation afterward** — full transcript with citations, plus per-message model, token count, latency, and cost, across both playground and widget traffic.

## AI Engineering Highlights

BotDock is a production RAG system, not a wrapper around a chat endpoint. The AI work spans the full loop: ingestion, retrieval, grounded generation, streaming, and observability.

### Retrieval-Augmented Generation (RAG)

- **Async ingestion pipeline** — a BullMQ worker parses, chunks (~1200 characters with ~150 character overlap so facts split across a boundary stay retrievable), embeds with `text-embedding-3-small`, and stores vectors. Re-ingestion is idempotent, and every source moves through an explicit `PROCESSING → READY / FAILED` lifecycle.
- **Vector search on pgvector** — `vector(1536)` embeddings behind an HNSW index with cosine distance, kept in PostgreSQL alongside the relational data instead of a separate vector database.
- **Tenant-safe retrieval** — every query is scoped to organisation + bot + embedding model (vectors from different models are never compared), filtered by a minimum relevance score, capped at a per-bot top-k, and packed into a fixed context budget.
- **Grounded generation** — a layered prompt builder (safety preamble → retrieved context → conversation history), with a strict-knowledge mode that controls how the bot answers when retrieval finds nothing relevant.
- **Citations end to end** — sources are streamed to the client as typed `citation` events, persisted per message, and shown in both the widget and the conversation inspector.

### LLM Application Engineering

- **Streaming runtime** — token-by-token Server-Sent Events over `POST` with a typed event protocol (`token`, `citation`, `trace`, `usage`, `done`, `error`), heartbeats, and abort propagation all the way to the model provider.
- **Provider abstraction** — `packages/ai-core` wraps OpenAI with retries, timeouts, error mapping, and cost estimation; an OpenAI-compatible base-URL override lets the whole pipeline run against a mock server in tests.
- **Observability per turn** — a playground debug trace (retrieved chunks, prompt preview, model) plus prompt/completion tokens, latency, and estimated cost recorded for every message.
- **Multi-tenant BYOK** — each organisation's own OpenAI key (AES-256-GCM encrypted at rest) pays for both chat and embeddings; a revoked key fails immediately, even for already-published bots.
- **Safe failure modes** — raw provider errors are never forwarded to visitors, the public widget never sees internals, and cancelled turns don't leave misleading usage records.

### Built With Agentic AI Development

BotDock was developed with an agent-driven engineering workflow using Claude Code:

- Work is broken into small, spec'd tasks, each implemented on its own branch by an AI coding agent against a written specification.
- Every change goes through a pull request gated by CI (lint, typecheck, tests, build) before it can merge.
- Features are verified live, end to end, not just unit-tested, before they're marked done.
- Architecture decisions and docs (`docs/architecture/`, `docs/decisions/`) are kept current so both humans and agents work from the same source of truth.

## Main Product Flow

1. User creates an account (Google or GitHub OAuth); a personal organisation is auto-provisioned on signup.
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
- OpenAI (chat completions + `text-embedding-3-small`) behind a provider abstraction.
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
