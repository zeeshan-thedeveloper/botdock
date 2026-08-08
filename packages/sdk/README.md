# @botdock/sdk

A typed, dependency-light client for BotDock's public widget runtime
(`POST /public/bots/:deploymentId/messages`). Framework-agnostic — works in
browsers, Node, and React Native — and used by `@botdock/widget` as its
transport, so there is a single streaming implementation shared by every
consumer.

This is currently an internal workspace package (`private: true`). Publishing
it to npm would additionally require: choosing a public package name/scope,
a semver release process, generating a changelog, and a support policy for
the wire protocol (the `ChatStreamEvent` shape) across versions.

## Install

Within the monorepo:

```json
{ "dependencies": { "@botdock/sdk": "workspace:*" } }
```

## Usage

```ts
import { BotDockClient } from '@botdock/sdk';

const client = new BotDockClient({
  baseUrl: 'https://api.yourdomain.com',
  deploymentId: 'dep_...', // public, from the bot's embed snippet — not a secret
});

let conversationId: string | undefined;

for await (const event of client.sendMessage({ message: 'Hello!' })) {
  switch (event.type) {
    case 'token':
      process.stdout.write(event.delta);
      break;
    case 'citation':
      console.log('sources:', event.sources);
      break;
    case 'done':
      conversationId = event.conversationId; // pass this back in to continue the thread
      break;
    case 'error':
      console.error(event.code, event.message);
      break;
    // 'usage' carries token/cost accounting; no UI obligation to handle it.
  }
}
```

### Cancellation

```ts
const controller = new AbortController();
const stream = client.sendMessage({ message: 'Hello!', signal: controller.signal });
// controller.abort() to stop mid-stream.
```

### Visitor continuity

The client automatically persists an opaque `visitorId` (never a user/org
id) via an injectable `storage` adapter so a returning visitor is
recognized across calls:

```ts
const client = new BotDockClient({
  baseUrl: '...',
  deploymentId: '...',
  storage: {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  },
});
```

Defaults to an in-memory store (`InMemorySessionStorage`) when omitted.
`conversationId` is *not* auto-persisted by the client — that's an
application-level decision (e.g. "start a new conversation" vs. "resume the
last one"), so callers track and pass it in explicitly per `sendMessage`
call.

### Errors

Failures are thrown as `BotDockClientError` with a stable `kind`:
`'forbidden' | 'not_found' | 'rate_limited' | 'network'`. `rate_limited`
carries `retryAfterSeconds` when the server provides one. Never branch on
`.message` — it's a human-readable string, not a stable contract.

```ts
import { BotDockClientError } from '@botdock/sdk';

try {
  for await (const event of client.sendMessage({ message: 'Hi' })) {
    /* ... */
  }
} catch (error) {
  if (error instanceof BotDockClientError && error.kind === 'rate_limited') {
    console.log('retry in', error.retryAfterSeconds, 'seconds');
  }
}
```
