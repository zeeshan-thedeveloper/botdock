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

Google and GitHub are first-class planned providers. Their provider-specific authorization URLs, code exchanges, and profile resolution are intentionally split into separate backend tasks.

## Frontend Contract

The dashboard auth UI should call:

- `GET /auth/providers`
- `GET /auth/oauth/google/start`
- `GET /auth/oauth/github/start`

Provider buttons should redirect to the authorization URL once provider-specific tasks implement it.

## Security Principles

- Provider secrets must come from environment variables.
- OAuth state must be signed and time-limited.
- Cookies should be `HttpOnly`.
- Production cookies should use `Secure`.
- OAuth callback errors should not leak secrets or raw provider responses.
