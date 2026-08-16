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

Changed `ChatService.resolvePublishedBot` (`apps/api/src/modules/chat/chat.service.ts`) to look up the credential status with `providerCredential.findFirst({ where: { id, organisationId } })` instead of `findUnique({ where: { id } })` — `ProviderCredential` has no compound `(id, organisationId)` unique constraint, so `findFirst` is the same pattern already used by `ProviderCredentialsService.validateCredential`. A snapshot pointing at another org's credential now resolves `providerCredential: null`, which the existing `no_provider_key` guard already turns into a clean, safe failure instead of exposing that credential's status.

Added `chat.service.test.ts`: "cannot resolve a provider credential belonging to a different organisation than the published bot" — mocks the org-scoped `findFirst` returning `null` for a credential belonging to a different org, and asserts the pipeline emits `no_provider_key` and never calls `aiProviderFactory.getChatProvider`. Updated the existing "resolves published config from the PRODUCTION deployment snapshot" test's mock/assertions from `findUnique`/`{ id }` to `findFirst`/`{ id, organisationId }`.

Files touched:
- `apps/api/src/modules/chat/chat.service.ts`
- `apps/api/src/modules/chat/chat.service.test.ts`

Test output: `pnpm --filter @botdock/api test` — 18 test files, 127 tests, all passed. `pnpm --filter @botdock/api typecheck` and `pnpm --filter @botdock/api lint` both clean.
