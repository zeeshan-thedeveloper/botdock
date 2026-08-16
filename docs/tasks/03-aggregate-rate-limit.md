# Task 03: Add per-deployment aggregate rate limit

## Goal
Add a second, deployment-wide Redis rate limit alongside the existing
per-(deployment, IP) limit, so requests distributed across many IPs against
one bot can't drain that tenant's BYOK spend unchecked.

## Why (cite the audit finding)
`docs/audit/architecture-findings.md`, section 2 ("Rate Limiting
Dimensions"): `WidgetRateLimitGuard`
(`apps/api/src/modules/chat/widget-rate-limit.guard.ts`) only keys on
`ratelimit:widget:${deploymentId}:${clientIp}` — a fixed 60s window, 20
requests. Distributing requests across many IPs against the same bot
defeats this limiter entirely, since the Redis key changes with `clientIp`,
and there's no bot-wide aggregate ceiling.

## Files likely involved
- `apps/api/src/modules/chat/widget-rate-limit.guard.ts`
- A test file for the guard (existing spec if one exists, otherwise a new
  colocated `.spec.ts`).

## Acceptance criteria
- A second Redis key scoped to `deploymentId` alone (e.g.
  `ratelimit:widget:aggregate:${deploymentId}`) with its own, higher,
  threshold/window than the per-IP limit, checked alongside the existing
  per-IP check.
- A request is rejected (429) if either limit is exceeded — per-IP or
  aggregate.
- Both thresholds (per-IP: 20 req/60s: existing; aggregate: new) are
  documented in code comments explaining the reasoning (why this window,
  why this ceiling relative to the per-IP one).
- Existing tests pass; new/updated tests cover the aggregate limit
  triggering independently of the per-IP limit (e.g. many distinct IPs
  against one deployment tripping the aggregate limit).
- `pnpm test`, `pnpm typecheck`, `pnpm lint` pass locally.

## Out of scope
No per-organisation limiting, no billing/spend logic — that's a separate,
larger feature. This task only adds the one deployment-level aggregate key.

## Result
_(filled in during Step 2)_
