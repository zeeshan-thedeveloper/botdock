# Origin enforcement for embedded widgets

## What's enforced

Each bot has an allow-list of domain patterns (`allowed_domains`, managed via
the deployment API). When a browser embed sends a chat message, the API
checks the request's `Origin` header against that bot's patterns
(`apps/api/src/modules/deployment/origin.util.ts`,
`WidgetController.streamMessage`) and rejects the request with 403 if the
origin isn't allowed. This is application-layer header inspection, not
CORS: the public API's CORS setup
(`apps/api/src/main.ts`) deliberately reflects any `/public/*` origin rather
than enforcing tenant domains via CORS, so the actual gate is the manual
`Origin` check inside the controller.

## What isn't enforced

- **Not CORS-level access control.** Reflecting all origins in CORS means
  the browser's own cross-origin protections aren't doing any of the work
  here — the API is reachable from any origin; only the app-layer check
  decides whether to honor the request.
- **Spoofable by non-browser clients.** `Origin` is a header a real browser
  sets and a page's JavaScript cannot override. A script, curl, or any
  HTTP client that isn't a browser can simply send an `Origin` header that
  matches an allowed pattern — there is no cryptographic binding between
  the header value and the page that's actually making the request.
- **No per-embed identity.** The check only asks "is this origin on the
  list," not "is this specific, still-valid embed instance allowed to act
  on behalf of this deployment." Anyone who learns a bot's allowed origin
  patterns (they're visible in the embed snippet itself) can replay
  requests as if they came from that origin.

## Why this is an acceptable v1 tradeoff

The threat this stops — a browser page on an unapproved domain silently
picking up someone else's embed snippet and rendering their bot — is the
common accidental/incidental case, and it's the one visible to a tenant
auditing "who can embed my bot." It costs nothing to configure beyond
listing allowed domains, requires no extra infrastructure, and matches how
most third-party widget products (chat, analytics, feedback) gate embeds
today. Defending against a determined scripted attacker who's willing to
spoof headers is a materially harder problem, and nothing about the current
design blocks a future hardening pass — it's additive.

## What a hardened version would require

A production-grade boundary would bind requests to a specific, verifiable
embed instance rather than trusting a header:

- **Signed embed tokens**: the deployment API mints a short-lived, signed
  token per embed (or per widget session) bound to the deployment id and
  allowed origin(s); the widget presents it on every request; the API
  verifies the signature server-side instead of trusting `Origin`.
- Optionally, rotate/expire tokens so a leaked snippet stops working after
  a bounded window rather than indefinitely.
- Keep the `Origin` check as a defense-in-depth layer even after adding
  signed tokens — it's cheap and still filters out the common accidental
  case before token verification runs.

This is out of scope for the current pass; this document exists so the
tradeoff is explicit rather than discovered later.
