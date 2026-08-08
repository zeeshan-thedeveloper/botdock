# BYOK And Bot Configuration

Status: Implemented

## The BYOK model

BotDock never uses a platform-owned OpenAI key for customer inference.
Every organisation connects its **own** OpenAI API key
(`POST /organisations/:orgId/provider-credentials`), and every chat turn —
playground, widget, or knowledge ingestion — spends that tenant's own
tokens against that tenant's own OpenAI account. BotDock's own
infrastructure cost is model-usage-independent.

Practical implications this drives elsewhere in the system:

- A bot can't be tested or published until its organisation has at least
  one `ACTIVE` provider credential — the playground, publish flow, and
  knowledge ingestion all gate on this.
- Publishing a version snapshots which credential a bot uses, but the
  credential's live `ACTIVE` status is **re-checked at chat time**, not
  trusted from the snapshot — a revoked or deleted key fails the next
  chat turn immediately rather than silently serving from stale state.
- The widget's allowed-domains restriction exists specifically to protect
  this: without it, anyone could embed a tenant's bot on their own site
  and spend that tenant's OpenAI budget.

### Security posture

- Secrets are encrypted at rest with AES-256-GCM
  (`ProviderCredentialCryptoService`), keyed by `PROVIDER_CREDENTIAL_ENC_KEY`.
- API responses never include the plaintext key or ciphertext — only a
  user-supplied label and the key's last 4 characters (`****1234`), enough
  to recognize which key is which without exposing it.
- There's no "update" endpoint for a credential's secret — rotating means
  deleting the old one and creating a new one, so there's never a code
  path that both reads and re-encrypts an existing plaintext secret.

### `PROVIDER_CREDENTIAL_ENC_KEY`

Any string of at least 32 characters — it's SHA-256 hashed to derive the
actual AES-256 key, so it doesn't need to be exactly 32 bytes or
base64/hex-encoded itself. Generate one with:

```sh
openssl rand -base64 32
```

Set it in `.env` (local) or the droplet's `~/apps/botdock/.env`
(production — never committed). **Changing this value after credentials
already exist makes them permanently undecryptable** — treat it like a
database migration, not a config tweak: rotate credentials through the
API (delete + recreate) rather than editing this key once real tenants
have connected keys.

## Bot configuration

A bot's draft configuration (`PATCH /organisations/:orgId/bots/:id`) covers:

- **Identity** — name, description, initials/avatar, welcome message.
- **Instructions** — the system prompt, tone, handoff behavior.
- **Model** — which provider credential, model, temperature, response
  length, retrieval mode (how many knowledge chunks, citation style).
- **Appearance** — widget theme and launcher position.
- **Safety** — `strictKnowledge` (refuse to answer outside retrieved
  context), prompt-injection protection, PII redaction, feedback
  collection, human handoff.

Draft edits are saved independently of publishing — `POST
/organisations/:orgId/bots/:id/publish` snapshots the current saved draft
into an immutable `BotVersion` and points the `PRODUCTION`
`BotDeployment` at it. The playground always runs the live draft (so an
owner can test in-progress edits); the public widget always runs the
last-published version — see `docs/architecture/chat-runtime.md` for how
that split is enforced in the chat runtime itself.
