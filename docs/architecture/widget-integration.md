# Widget Integration

Status: Implemented (production hosting topology not yet decided — see below)

The widget (`apps/widget`) is a dependency-light Vite/TypeScript build —
zero runtime dependencies, ~14 kB / ~5 kB gzipped — mounted into an
isolated shadow root (`:host { all: initial; }`) so a customer's page
CSS can't leak in or be leaked on. It reads configuration from script
data attributes:

```html
<script
  src="https://<host>/widget.js"
  data-deployment-id="dep_..."
  defer
></script>
```

`defer`, not `async` — `async` scripts can execute before
`document.body` exists if placed in `<head>`, which mounting depends on.
`data-deployment-id` is the only required attribute (the public,
deployment-scoped id from a bot's `GET .../deployment` response).
Optional overrides: `data-api-base-url` (self-hosting only — the
production API origin is baked in at build time via
`VITE_PUBLIC_API_URL`, not consumer-overridable by accident),
`data-welcome-message`, `data-accent-color`, `data-position`.
`window.BotDockWidget.mount(config)` is also exposed for manual/SPA
mounting.

## What it does

- States: closed launcher, open/welcome, active conversation, streaming
  (with a cursor), sources collapsed/expanded per message, rate-limited
  (disabled with a live countdown), forbidden/not-published (terminal,
  permanently disabled), connection error (transient), mobile
  full-screen, "Powered by BotDock" footer.
- Talks to `POST /public/bots/:deploymentId/messages` (see
  `docs/architecture/chat-runtime.md`) through `@botdock/sdk`
  (`packages/sdk`) — the same streaming client is meant for developers
  building custom UIs against the public API, so there is exactly one SSE
  parsing implementation. The SDK deliberately does **not** use the zod
  schema from `@botdock/contracts` for runtime parsing (only the
  TypeScript type, via `import type`, which costs nothing at runtime) —
  the widget is its primary consumer and has a hard small-bundle
  requirement.
- Visitor continuity: an opaque `visitorId` (never a user/org id),
  persisted in `localStorage`, managed by the SDK. The widget itself
  additionally persists `conversationId` (the SDK deliberately doesn't —
  resuming vs. starting a new thread is an application decision), so a
  page reload doesn't fragment a visitor into a new conversation and lose
  prompt context.

## Build and versioning

The build output is versioned by path, `dist/v1/botdock-widget.js`, not
by content hash — a future breaking change to the wire protocol ships as
`/v2/botdock-widget.js` without any customer ever touching their embed
snippet. The public-facing URL in the embed snippet (`/widget.js`) is
deliberately kept separate from that internal versioned path — whatever
serves that public route in production is expected to map it to the
current version.

**Not yet decided**: an actual production host for `widget.js` (a Caddy
route on the API's domain reverse-proxying to a static host, a CDN, a
dedicated deploy workflow analogous to `deploy-api.yml`). No such
pipeline exists yet anywhere in this repo — only the API deploys to
production today. This is treated as a real infrastructure decision
(domain, cost, long-term maintenance) rather than something to guess at
in code.
