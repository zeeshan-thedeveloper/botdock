# Task 05: Write docs/decisions/byok-key-encryption.md

## Goal
Document the current BYOK provider-credential encryption design, its blast
radius if compromised, and what a stronger design would look like at scale.

## Why (cite the audit finding)
`docs/audit/architecture-findings.md`, section 3 ("BYOK Key Encryption"):
`ProviderCredentialCryptoService`
(`apps/api/src/modules/provider-credentials/provider-credential-crypto.service.ts`)
encrypts secrets with AES-256-GCM and a random IV per encryption, but the
AES key is derived from a single static process-level
`PROVIDER_CREDENTIAL_ENC_KEY` (via `getKey()`, hashing that one env var) —
no per-tenant key derivation, envelope encryption, or KMS integration.

## Files likely involved
- `docs/decisions/byok-key-encryption.md` (new file)

## Acceptance criteria
- Short decision doc covering: the current design (AES-256-GCM, random IV
  per record, single static key derived from `PROVIDER_CREDENTIAL_ENC_KEY`),
  blast radius if that key is compromised (attacker + DB access can decrypt
  every tenant's stored provider API key), why single-key is an acceptable
  tradeoff at this stage, and what per-tenant envelope encryption /
  KMS-backed key wrapping would look like at scale.
- Matches the style/format of existing docs under `docs/decisions/`.

## Out of scope
No code changes — this is a documentation-only task.

## Result
_(filled in during Step 2)_
