# BYOK provider credential encryption

## Current design

Tenant-supplied provider API keys (BYOK — bring your own key) are encrypted
at rest with AES-256-GCM
(`apps/api/src/modules/provider-credentials/provider-credential-crypto.service.ts`).
Each encryption uses a fresh random 12-byte IV, and the stored value is
`v1:iv:authTag:ciphertext`, so no two encrypted rows — even for the same
plaintext key — look alike. The AES key itself, however, is not stored: it
is derived by SHA-256-hashing a single process-level environment variable,
`PROVIDER_CREDENTIAL_ENC_KEY` (`getKey()`), the same derived key for every
row, for every tenant, for the lifetime of the deployment. There is no
per-tenant key derivation, no envelope encryption, and no KMS integration
in this path.

## Blast radius if the key is compromised

Because one derived key decrypts every row, compromising
`PROVIDER_CREDENTIAL_ENC_KEY` plus read access to the database (e.g. a
leaked env var alongside a database dump, or access to the running API
process's environment) is enough to decrypt **every tenant's stored
provider API key at once** — not just one tenant's. There's no per-tenant
isolation at the encryption layer: a single-tenant compromise of this key
is, in effect, a platform-wide compromise of every stored BYOK credential.
The random per-record IV protects against pattern analysis across rows; it
does not limit blast radius once the key itself is known.

## Why single-key is acceptable at this stage

At the current scale, the operational surface for `PROVIDER_CREDENTIAL_ENC_KEY`
is small and tightly held (a single deployment environment, not distributed
across many services or a large ops team), and standing up per-tenant key
management or a KMS integration is real infrastructure work that isn't
justified yet relative to that exposure. AES-256-GCM with a random IV per
record is still a meaningful improvement over plaintext storage or a fixed
IV, and it is honest to say: secrets are encrypted at rest, but a
`PROVIDER_CREDENTIAL_ENC_KEY` compromise (with database access) compromises
every tenant's credentials, not just one. That caveat should be stated
plainly in any production security documentation rather than implied away.

## What per-tenant envelope encryption / KMS-backed wrapping would look like at scale

- **Envelope encryption**: generate a unique data-encryption key (DEK) per
  tenant (or per credential), encrypt the secret with that DEK, then
  encrypt the DEK itself with a KMS-held key-encryption key (KEK). Only the
  wrapped DEK is stored alongside the ciphertext; the KEK never leaves the
  KMS.
- **KMS-backed wrapping** (e.g. AWS KMS, GCP KMS, HashiCorp Vault
  Transit): decrypt operations go through the KMS API rather than a
  locally-held key, so a compromised application process/env cannot decrypt
  stored secrets on its own — it would additionally need live KMS access
  with permission to unwrap that specific tenant's DEK.
- With this in place, compromising one tenant's DEK (or KMS access scoped
  to one tenant) no longer exposes every other tenant's credentials —
  blast radius shrinks from "every tenant" to "the tenants whose keys were
  actually reachable via the compromised access path."
- This is meaningfully more infrastructure (a KMS dependency, key
  lifecycle/rotation policy, per-tenant key provisioning) and is the right
  next step once the number of tenants or the sensitivity of what's at risk
  justifies the added operational cost — not before.
