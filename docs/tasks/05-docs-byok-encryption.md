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

Wrote `docs/decisions/byok-key-encryption.md`: the current design (AES-256-GCM, random IV per record, single static key derived from `PROVIDER_CREDENTIAL_ENC_KEY` via SHA-256), blast radius if that key is compromised (attacker + DB access can decrypt every tenant's stored provider credential at once, not just one tenant's — the random IV protects against pattern analysis, not blast radius), why single-key is an acceptable tradeoff at this stage (small, tightly-held operational surface; real infra cost to do better isn't justified yet), and what per-tenant envelope encryption / KMS-backed wrapping would look like at scale (per-tenant DEKs, KEK held in a KMS, decrypt-through-KMS so a compromised app process alone can't decrypt stored secrets).

Files touched:
- `docs/decisions/byok-key-encryption.md` (new)

No code changed — `pnpm lint` unaffected.
