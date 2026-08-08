# Authentication Architecture

Status: Implemented

BotDock authentication is designed as a backend-owned OAuth flow with secure HTTP-only cookies. The dashboard should start provider flows through the API and must not receive provider secrets.

## Foundation

- The API owns OAuth state creation and validation.
- OAuth state is signed with `AUTH_SESSION_SECRET`.
- State is stored in an HTTP-only cookie during the provider redirect flow.
- Session records are represented in the database through `AuthSession`.
- Provider identities are represented through `OAuthIdentity`.
- User records remain the primary application identity.

## Providers

Google and GitHub OAuth are implemented as real providers. Both reuse the same signed state, user-linking, and session foundation.

## Frontend Contract

The dashboard auth UI should call:

- `GET /auth/providers`
- `GET /auth/oauth/google/start`
- `GET /auth/oauth/github/start`

Provider start endpoints return an authorization URL when their client ID and secret are configured. Missing credentials return `provider_not_configured` so the frontend can disable or annotate the provider button.

## Security Principles

- Provider secrets must come from environment variables.
- OAuth state must be signed and time-limited.
- Cookies should be `HttpOnly`.
- Production cookies should use `Secure`.
- OAuth callback errors should not leak secrets or raw provider responses.

## Google Local Setup

Use this callback URL in the Google Cloud OAuth client for normal local development:

```text
http://localhost:4000/auth/oauth/google/callback
```

When smoke-testing a temporary API port, add that callback too, for example:

```text
http://localhost:4100/auth/oauth/google/callback
```

Set:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

## GitHub Local Setup

Use this callback URL in the GitHub OAuth app for normal local development:

```text
http://localhost:4000/auth/oauth/github/callback
```

When smoke-testing a temporary API port, add that callback too, for example:

```text
http://localhost:4100/auth/oauth/github/callback
```

Set:

- `GITHUB_OAUTH_CLIENT_ID`
- `GITHUB_OAUTH_CLIENT_SECRET`

## Production Callback URLs

The callback URL registered with each provider must match whatever public
domain actually fronts the deployed API (Caddy terminates TLS and
reverse-proxies to the API container — see the deploy pipeline,
`.github/workflows/deploy-api.yml` / `docker-compose.api.prod.yml`), not
`localhost`:

```text
https://<your-api-domain>/auth/oauth/google/callback
https://<your-api-domain>/auth/oauth/github/callback
```

In production, also set `AUTH_COOKIE_SECURE=true` (cookies over HTTPS
only) and make sure `AUTH_SESSION_SECRET` / `PROVIDER_CREDENTIAL_ENC_KEY`
are real, unique, ≥32-character values — never the local dev placeholders
from `.env.example`.

## Troubleshooting

- **`provider_not_configured` error from the start endpoint** — the
  provider's client ID/secret env vars aren't set for that environment.
  This is intentional: missing credentials disable the provider rather
  than crash the request, so the frontend can annotate/disable that
  button instead of showing a broken flow.
- **Callback succeeds but no session cookie appears** — check
  `AUTH_COOKIE_SECURE`: `true` requires HTTPS, so a `true` value will
  silently fail to set the cookie over plain HTTP (e.g. testing prod
  config locally without TLS).
- **"redirect_uri_mismatch" from the provider** — the callback URL
  registered with the OAuth app must match the API's actual origin
  *exactly*, including scheme and port. A temporary API port used for
  local smoke-testing (see the local setup sections above) needs its own
  callback URL added to the same OAuth app, not a replacement of the
  normal one.
- **OAuth state cookie missing/invalid on callback** — the state cookie
  is short-lived and tied to the redirect flow; a slow provider consent
  screen or a browser blocking third-party cookies in an unusual way can
  both cause this. Retry the flow from the start endpoint rather than
  navigating directly to a stale callback URL.
