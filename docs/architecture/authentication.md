# Authentication Architecture

Status: In Progress

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
