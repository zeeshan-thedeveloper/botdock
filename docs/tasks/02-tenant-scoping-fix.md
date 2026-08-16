# Task 02: Fix tenant-scoping gap in resolvePublishedBot

## Goal
Make the provider-credential status lookup in `resolvePublishedBot`
tenant-scoped, closing the one-refactor-away cross-tenant leak risk the
audit flagged.

## Why (cite the audit finding)
`docs/audit/architecture-findings.md`, section 4 ("Tenant Scoping
Mechanism"), "Needs review": `apps/api/src/modules/chat/chat.service.ts`,
`ChatService.resolvePublishedBot` (around lines 287-293) looks up
`providerCredential` via `findUnique({ where: { id: snapshot.providerCredentialId } })`
— filtered only by `id`, not by `organisationId`. Downstream
`AiProviderFactory.resolveActiveApiKey` re-scopes correctly today, so this
doesn't currently leak a key, but the status check itself is unscoped and
is one refactor away from becoming a real cross-tenant credential leak.

## Files likely involved
- `apps/api/src/modules/chat/chat.service.ts`
- A test file covering `ChatService` (existing spec, e.g.
  `apps/api/src/modules/chat/chat.service.spec.ts`, or the nearest existing
  test location for this service — create one colocated with it if none
  exists).

## Acceptance criteria
- The `providerCredential.findUnique` call in `resolvePublishedBot` filters
  by `organisationId` as well as `id` (e.g. via a compound unique/where
  clause, or `findFirst` with both fields — matching existing patterns
  elsewhere in the codebase such as `ProviderCredentialsService`).
- Existing tests pass (`pnpm test`, `pnpm typecheck`, `pnpm lint`).
- A new test proves a credential belonging to org A cannot be resolved when
  the published bot/deployment belongs to org B (e.g. the lookup returns
  null / credential status resolves as unavailable rather than leaking org
  A's credential status).

## Out of scope
Do not refactor tenant scoping anywhere else in this pass — this is a
single, targeted fix to `resolvePublishedBot`'s credential lookup, not a
sweep of the rest of the codebase.

## Result
_(filled in during Step 2)_
