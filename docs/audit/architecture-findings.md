# Architecture Findings

## 1. Origin Enforcement

**Finding**: The public widget chat endpoint performs a server-side check against the request `Origin` header after resolving the deployment. The API CORS setup deliberately reflects any `/public/*` origin instead of enforcing tenant domains with CORS, so the per-bot domain check is an application-layer `Origin` inspection. Browser embeds are constrained by the browser-supplied `Origin`; non-browser clients can spoof that header.

**Evidence**:

- `apps/api/src/main.ts`, `bootstrap`, lines 33-43: public widget CORS reflects the caller origin.

```ts
if (request.url?.startsWith('/public/')) {
  callback(null, { origin: true, credentials: false, exposedHeaders: ['X-BotDock-Visitor-Id'] });
  return;
}
```

- `apps/api/src/modules/chat/widget.controller.ts`, `WidgetController.streamMessage`, lines 40-49: the endpoint loads allowed patterns and checks only `request.headers.origin`.

```ts
const patterns = await this.widgetService.getAllowedPatterns(deployment.botId);
const requestOrigin = request.headers.origin ?? null;

if (!isOriginAllowed(requestOrigin, patterns)) {
  throw new ForbiddenException('This domain is not allowed to embed this bot.');
}
```

- `apps/api/src/modules/deployment/origin.util.ts`, `isOriginAllowed`, lines 17-33: the helper rejects missing origins, parses the origin host, and matches it to exact or wildcard patterns.

```ts
export function isOriginAllowed(origin: string | null, patterns: string[]): boolean {
  if (patterns.length === 0 || origin === null) {
    return false;
  }
  ...
  return normalizedPatterns.some((pattern) => matchesPattern(host, pattern));
}
```

- `apps/api/src/modules/chat/widget.service.ts`, `WidgetService.getAllowedPatterns`, lines 22-29: allowed domains come from `allowedDomain` records filtered by `botId`.

**Verdict**: v1 friction layer, spoofable/bypassable.

**Recommendation**: Ship as-is only if documented as browser embed friction, not as a production-grade access-control boundary against scripted clients.

## 2. Rate Limiting Dimensions

**Finding**: The public widget rate limiter is Redis-backed and keyed by deployment id plus Express `request.ip`. It is not keyed by organisation id, bot id, visitor id, user session, or a bot-wide aggregate.

**Evidence**:

- `apps/api/src/modules/chat/widget.controller.ts`, class decorator, lines 24-26: `WidgetRateLimitGuard` applies to `Controller('public/bots/:deploymentId')`.

- `apps/api/src/modules/chat/widget-rate-limit.guard.ts`, `WidgetRateLimitGuard`, lines 14-35: fixed 60-second window, 20 requests, Redis `INCR`, and key construction.

```ts
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 20;
...
const deploymentId = request.params.deploymentId ?? 'unknown';
const clientIp = request.ip ?? 'unknown';
const key = `ratelimit:widget:${deploymentId}:${clientIp}`;

const count = await this.connection.incr(key);
if (count === 1) {
  await this.connection.expire(key, RATE_LIMIT_WINDOW_SECONDS);
}
```

- `apps/api/src/modules/chat/widget-rate-limit.guard.ts`, `WidgetRateLimitGuard.canActivate`, lines 38-47: requests over 20 in the same key/window receive `429`.

**Verdict**: v1 friction layer, spoofable/bypassable.

**Recommendation**: Keep it as a basic abuse throttle, but do not describe it as a bot-wide or tenant-wide quota until there are additional keys such as per-deployment global, per-org, and trusted-client-IP handling.

Plain impact: one abusive visitor exhausts the limit only for the same `deploymentId` and same `request.ip`; other visitors to the same bot from different IPs are not affected. Visitors sharing an IP, such as NAT or office networks, can affect one another. Distributing requests across IPs defeats this limiter because the Redis key changes with `clientIp`.

## 3. BYOK Key Encryption

**Finding**: Provider credentials are encrypted with AES-256-GCM using a random IV per encryption, but the AES key is derived from one static process-level `PROVIDER_CREDENTIAL_ENC_KEY`. I found no per-tenant key derivation, envelope encryption, or KMS integration in the credential crypto path.

**Evidence**:

- `apps/api/src/modules/provider-credentials/provider-credential-crypto.service.ts`, `ProviderCredentialCryptoService.encrypt`, lines 12-23: encrypts secrets with `aes-256-gcm`, random 12-byte IV, and returns `v1:iv:authTag:ciphertext`.

- `apps/api/src/modules/provider-credentials/provider-credential-crypto.service.ts`, `ProviderCredentialCryptoService.decrypt`, lines 26-43: decrypts the stored value with the same `getKey()` output.

- `apps/api/src/modules/provider-credentials/provider-credential-crypto.service.ts`, `ProviderCredentialCryptoService.getKey`, lines 54-57: derives the AES key by hashing the single env var.

```ts
private getKey(): Buffer {
  return createHash('sha256')
    .update(this.configService.getOrThrow<string>('PROVIDER_CREDENTIAL_ENC_KEY'))
    .digest();
}
```

- `apps/api/src/modules/provider-credentials/provider-credentials.service.ts`, `ProviderCredentialsService.upsertCredential`, lines 68-77 and 85-100: trims the submitted API key, encrypts it once, and stores `encryptedSecret` in `providerCredential`.

- `apps/api/src/modules/provider-credentials/provider-credentials.service.ts`, `ProviderCredentialsService.validateCredential`, lines 114-131: retrieves a tenant-scoped credential and decrypts `encryptedSecret`.

- `packages/config/src/index.ts`, `apiEnvironmentSchema`, line 39: requires `PROVIDER_CREDENTIAL_ENC_KEY` as a single string with minimum length 32.

**Verdict**: real boundary.

**Recommendation**: It is acceptable to say secrets are encrypted at rest, but for production docs also state that compromise of `PROVIDER_CREDENTIAL_ENC_KEY` compromises all stored provider credentials until per-tenant envelope encryption or KMS-backed key wrapping is added.

Blast radius: because the same derived key decrypts all rows, an attacker with `PROVIDER_CREDENTIAL_ENC_KEY` and database access can decrypt every tenant's stored provider API key.

## 4. Tenant Scoping Mechanism

**Finding**: Tenant scoping is manually enforced in services and selected controllers. `SessionAuthGuard` authenticates the user and sets `request.user`, but it does not inject an organisation scope or modify Prisma queries. `PrismaService` directly extends `PrismaClient` and does not install Prisma middleware/extensions for tenant filtering.

**Evidence**:

- `apps/api/src/modules/auth/session-auth.guard.ts`, `SessionAuthGuard.canActivate`, lines 26-54: loads the authenticated user and assigns `request.user`; no organisation id is resolved or injected.

- `apps/api/src/modules/database/prisma.service.ts`, `PrismaService`, lines 4-12: directly extends `PrismaClient`; no `$use`, `$extends`, or tenant middleware is present.

- `apps/api/src/modules/database/database.module.ts`, `DatabaseModule`, lines 4-8: exports the raw `PrismaService` globally.

- `apps/api/src/modules/bots/bots.service.ts`, `BotsService.listBots`, lines 103-117: calls `ensureOrganisationMember` and filters `bot.findMany` by `{ organisationId }`.

- `apps/api/src/modules/bots/bots.service.ts`, `BotsService.updateBot`, lines 152-187: verifies membership, checks bot ownership with `findFirst({ id: botId, organisationId })`, then updates by `id`. This relies on the prior manual check.

- `apps/api/src/modules/provider-credentials/provider-credentials.service.ts`, `ProviderCredentialsService.listCredentials`, lines 44-58: checks membership and filters credentials by `{ organisationId }`.

- `apps/api/src/modules/provider-credentials/provider-credentials.service.ts`, `ProviderCredentialsService.validateCredential`, lines 107-144: checks membership and retrieves the credential with `{ id: credentialId, organisationId }`.

- `apps/api/src/modules/deployment/deployment.service.ts`, `DeploymentService.listAllowedDomains`, lines 25-39: checks membership, checks bot ownership through `ensureBotInOrganisation`, and filters domains by `{ organisationId, botId }`.

- `apps/api/src/modules/knowledge/knowledge.service.ts`, `KnowledgeService.listSources`, lines 65-79: checks membership and bot ownership, then filters knowledge sources by `{ organisationId, botId }`.

- `apps/api/src/modules/conversations/conversations.service.ts`, `ConversationsService.getConversation`, lines 94-133: checks membership and filters conversation lookup by `{ id: conversationId, organisationId }`.

- `apps/api/src/modules/knowledge/retrieval.service.ts`, `RetrievalService.searchByModel`, lines 123-132: raw vector search filters by `"organisationId"`, `"botId"`, and `"embeddingModel"`.

**Verdict**: needs review.

**Recommendation**: Treat current tenant isolation as hand-audited service-layer checks; before calling it production-grade, add centralized tenant-scoped data access or tests that fail when tenant filters are omitted.

Sample endpoint status:

- Bots endpoints: tenant-scoped in `BotsService.listBots`, `createBot`, `updateBot`, and `publishBot` through `ensureOrganisationMember` and explicit `organisationId` filters in `apps/api/src/modules/bots/bots.service.ts`.
- Provider credential endpoints: tenant-scoped in `ProviderCredentialsService.listCredentials`, `upsertCredential`, `validateCredential`, and `deleteCredential` through membership checks and explicit `organisationId` filters in `apps/api/src/modules/provider-credentials/provider-credentials.service.ts`.
- Knowledge endpoints: tenant-scoped in `KnowledgeService.listSources`, `createSource`, and `deleteSource` through membership checks plus bot/source filters in `apps/api/src/modules/knowledge/knowledge.service.ts`.
- Conversations endpoints: tenant-scoped in `ConversationsService.listConversations`, `getConversation`, `setMessageFeedback`, and `getActivityTimeseries` through membership checks and explicit SQL/Prisma `organisationId` filters in `apps/api/src/modules/conversations/conversations.service.ts`.

Needs review:

- `apps/api/src/modules/chat/chat.service.ts`, `ChatService.resolvePublishedBot`, lines 287-293, checks the published snapshot's credential status with `providerCredential.findUnique({ where: { id: snapshot.providerCredentialId } })` rather than filtering by organisation. The subsequent provider construction in `AiProviderFactory.resolveActiveApiKey` is org-scoped (`apps/api/src/modules/ai/ai-provider.factory.ts`, lines 45-59), so this does not clearly expose another tenant's key, but the status check itself is not tenant-scoped and should be tightened.

## 5. Widget Deployment Status

**Finding**: `apps/widget` has a Vite build and two serving paths in the repo: a standalone nginx image for local compose and a copy of the built bundle into the API image as `/widget.js`. I found no dedicated GitHub workflow that builds/pushes/deploys the standalone widget image, no CDN upload/publishing step, and no production compose service for the widget. The deployed API workflow does build the widget inside `api.Dockerfile` and serves it from the API container.

**Evidence**:

- `.github/workflows/ci.yml`, `verify` job, lines 27-40: CI installs, lints, typechecks, tests, and runs `pnpm build`; it does not publish widget artifacts.

- `.github/workflows/deploy-api.yml`, `deploy` job, lines 44-56: builds and pushes only `infrastructure/docker/api.Dockerfile` as `ghcr.io/zeeshan-thedeveloper/botdock-api`.

- `.github/workflows/deploy-api.yml`, deploy steps, lines 67-80: syncs only `docker-compose.api.prod.yml` and runs that compose file on the droplet.

- `docker-compose.api.prod.yml`, services, lines 6-39: production compose defines only `api` and `redis`; no `widget` service.

- `docker-compose.yml`, local services, lines 68-75: local compose has a `widget` service using `infrastructure/docker/widget.Dockerfile` and exposing port `5173`.

- `infrastructure/docker/widget.Dockerfile`, lines 16-23: standalone widget image builds `@botdock/widget` and serves `/app/apps/widget/dist` with nginx.

- `apps/widget/vite.config.ts`, lines 7-15: widget build emits the library bundle as `dist/v1/botdock-widget.js`.

- `infrastructure/docker/api.Dockerfile`, lines 36-49: API image builds `@botdock/widget` and copies `apps/widget/dist/v1/botdock-widget.js` to `./public/widget.js`.

- `apps/api/src/main.ts`, `bootstrap`, lines 15-24: API serves static `public/widget.js` as `application/javascript`.

- `apps/api/src/modules/deployment/deployment.service.ts`, `DeploymentService.buildEmbedSnippet`, lines 119-128: generated embed snippet uses `${API_PUBLIC_URL}/widget.js`.

**Verdict**: needs review.

**Recommendation**: Do not say the standalone widget app is deployed; the smallest live path already present is either to rely on the deployed API's `/widget.js` path, or add a workflow that builds `infrastructure/docker/widget.Dockerfile`, pushes it, and adds a production compose/CDN target for `dist/v1/botdock-widget.js`.
