# Task 04: Write docs/decisions/origin-enforcement.md

## Goal
Document the current origin-enforcement design as a deliberate, accepted v1
tradeoff, so it isn't mistaken for a production-grade access-control
boundary.

## Why (cite the audit finding)
`docs/audit/architecture-findings.md`, section 1 ("Origin Enforcement"):
origin checking is app-layer `Origin`-header inspection
(`apps/api/src/modules/chat/widget.controller.ts`,
`apps/api/src/modules/deployment/origin.util.ts`), not CORS-enforced — the
API's public CORS setup (`apps/api/src/main.ts`) reflects any `/public/*`
origin instead of enforcing tenant domains via CORS. This is real friction
for browser embeds but is spoofable by any non-browser client sending an
arbitrary `Origin` header.

## Files likely involved
- `docs/decisions/origin-enforcement.md` (new file)

## Acceptance criteria
- Short decision doc covering: what's enforced today (per-bot allowed
  domains checked against the request `Origin` header), what isn't (no
  CORS-level enforcement, no protection against non-browser/scripted
  clients spoofing `Origin`), why this is an acceptable v1 tradeoff, and
  what a hardened version would require (e.g. signed embed tokens bound to
  a deployment, verified server-side per request).
- Matches the style/format of existing docs under `docs/decisions/` (see
  `docs/decisions/README.md` if it defines a template).

## Out of scope
No code changes — this is a documentation-only task.

## Result
_(filled in during Step 2)_
