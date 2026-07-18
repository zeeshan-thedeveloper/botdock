# Architecture Overview

BotDock is organized as a TypeScript monorepo with separate deployable applications and small shared packages. The initial foundation intentionally implements only the code required to compile, document, and validate the first boundaries.

## Application Responsibilities

- `apps/web`: authenticated owner dashboard and future chatbot playground.
- `apps/api`: backend API, validation, health checks, OpenAPI docs, future chat streaming and background job orchestration.
- `apps/widget`: customer-facing embed loaded through a script tag and configured through data attributes.
- `apps/demo-site`: external site used to prove widget integration.

## Container Boundaries

Each runnable app has a Docker image:

- `botdock/api:local`: Node runtime for the NestJS API.
- `botdock/web:local`: Next.js standalone server for the dashboard.
- `botdock/widget:local`: Nginx-served static widget bundle.
- `botdock/demo-site:local`: Nginx-served static external demo site.

Local Compose also starts PostgreSQL with pgvector, Redis, and MinIO.

## Shared Packages

- `packages/database`: Prisma schema, migrations, seed scripts, database client exports.
- `packages/contracts`: shared request and response contracts.
- `packages/ai-core`: LLM and embedding provider interfaces plus mock local implementations.
- `packages/config`: environment schemas.
- `packages/logger`: structured JSON logger factory.

## Multi-Tenancy

Tenant-owned entities must be linked directly or indirectly to an organisation. The first schema includes `Organisation`, `OrganisationMember`, and `Bot` relationships so future repositories and services can require organisation scope.
