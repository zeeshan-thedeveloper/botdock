# Task 00: Planning — break the audit findings into ordered tasks

## Goal
Turn `docs/audit/architecture-findings.md` into ordered, numbered, individually
reviewable task files under `docs/tasks/`, one per finding that needs action.

## Why (cite the audit finding)
The audit (`docs/audit/architecture-findings.md`) surfaced one unverified
claim (embed loop never confirmed live), two real gaps (tenant-scoping hole
in `resolvePublishedBot`, single-dimension widget rate limiting), and two
accepted tradeoffs that need documenting (origin enforcement, BYOK key
encryption). Doing this as one big pass would make each change hard to
review independently; splitting into tasks makes each one small, ordered,
and separately mergeable.

## Files likely involved
- `docs/audit/architecture-findings.md` (currently untracked in the working
  tree; committing it here so the task files it drives have a checked-in
  source to point to)
- `docs/tasks/01-verify-embed-loop.md`
- `docs/tasks/02-tenant-scoping-fix.md`
- `docs/tasks/03-aggregate-rate-limit.md`
- `docs/tasks/04-docs-origin-enforcement.md`
- `docs/tasks/05-docs-byok-encryption.md`

## Acceptance criteria
- Five task files exist under `docs/tasks/`, each following the template
  (Goal / Why / Files likely involved / Acceptance criteria / Out of scope /
  Result).
- Each file cites the specific audit finding it addresses.
- No code changes in this task — planning only.

## Out of scope
- Any implementation, verification, or doc-writing work described by the
  task files themselves. That happens in Step 2, one task/branch at a time.

## Result
Created `docs/tasks/00-planning.md` (this file) plus
`docs/tasks/01-verify-embed-loop.md`, `docs/tasks/02-tenant-scoping-fix.md`,
`docs/tasks/03-aggregate-rate-limit.md`,
`docs/tasks/04-docs-origin-enforcement.md`, and
`docs/tasks/05-docs-byok-encryption.md`, based directly on the five findings
in `docs/audit/architecture-findings.md` (sections 1, 2, 4; sections 3 and 5
of the audit numbering map to tasks 05 and — widget deployment status — is
not in scope for this pass, only the five tasks listed in the prompt).
No code changed.
