'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  authProvidersResponseSchema,
  oauthStartResponseSchema,
  type AuthProvider,
  type AuthProviderStatus,
} from '@botdock/contracts';

const providerCopy: Record<
  AuthProvider,
  {
    label: string;
    description: string;
  }
> = {
  google: {
    label: 'Continue with Google',
    description: 'Use your Google Workspace account.',
  },
  github: {
    label: 'Continue with GitHub',
    description: 'Use the GitHub account tied to your team.',
  },
};

const defaultProviderStatuses: AuthProviderStatus[] = [
  { provider: 'google', configured: false },
  { provider: 'github', configured: false },
];

const authSessionStorageKey = 'botdock.oauth-session-ready';

function getProviderName(provider: AuthProvider) {
  return providerCopy[provider].label.replace('Continue with ', '');
}

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_BOTDOCK_API_BASE_URL ?? 'http://localhost:4000';
}

function getAuthReturnState() {
  const params = new URLSearchParams(window.location.search);
  const auth = params.get('auth');

  if (auth === 'success') {
    return 'success';
  }

  if (auth === 'error') {
    return 'error';
  }

  return null;
}

export function AuthGate({ children }: { children?: ReactNode }) {
  const apiBaseUrl = useMemo(getApiBaseUrl, []);
  const [providers, setProviders] = useState<AuthProviderStatus[]>(defaultProviderStatuses);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [startingProvider, setStartingProvider] = useState<AuthProvider | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authReturnState, setAuthReturnState] = useState<'success' | 'error' | null>(null);
  const [hasCompletedAuth, setHasCompletedAuth] = useState(false);

  useEffect(() => {
    const nextAuthReturnState = getAuthReturnState();
    setAuthReturnState(nextAuthReturnState);

    if (nextAuthReturnState === 'success') {
      window.localStorage.setItem(authSessionStorageKey, 'true');
      setHasCompletedAuth(true);
      return;
    }

    setHasCompletedAuth(window.localStorage.getItem(authSessionStorageKey) === 'true');
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProviders() {
      setIsLoadingProviders(true);
      setMessage(null);

      try {
        const response = await fetch(new URL('/auth/providers', apiBaseUrl), {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Provider status request failed.');
        }

        const payload = authProvidersResponseSchema.parse(await response.json());

        if (isMounted) {
          setProviders(payload.providers);
        }
      } catch {
        if (isMounted) {
          setMessage('Could not load sign-in providers. Check that the BotDock API is running.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingProviders(false);
        }
      }
    }

    void loadProviders();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  async function startOAuth(provider: AuthProvider) {
    const providerStatus = providers.find((item) => item.provider === provider);

    if (!providerStatus?.configured) {
      setMessage(`${getProviderName(provider)} is not configured yet.`);
      return;
    }

    setStartingProvider(provider);
    setMessage(null);

    try {
      const redirectTo = new URL(window.location.href);
      redirectTo.searchParams.set('auth', 'success');

      const startUrl = new URL(`/auth/oauth/${provider}/start`, apiBaseUrl);
      startUrl.searchParams.set('redirectTo', redirectTo.toString());

      const response = await fetch(startUrl, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('OAuth start request failed.');
      }

      const payload = oauthStartResponseSchema.parse(await response.json());

      if (payload.status !== 'ready' || !payload.authorizationUrl) {
        setMessage(`${getProviderName(provider)} is not ready for sign-in.`);
        setStartingProvider(null);
        return;
      }

      window.location.assign(payload.authorizationUrl);
    } catch {
      setMessage('Could not start the sign-in flow. Try again in a moment.');
      setStartingProvider(null);
    }
  }

  if (hasCompletedAuth && children) {
    return children;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-app-gutter py-section-y lg:grid-cols-[1fr_420px]">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">BotDock</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Sign in to configure and publish your chatbot workspace.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Connect with an approved OAuth provider to manage bot drafts, knowledge sources, test
            conversations, and deploy embedded chat experiences.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="border-l-2 border-accent pl-3">Secure OAuth redirect flow</div>
            <div className="border-l-2 border-primary pl-3">HTTP-only session cookies</div>
            <div className="border-l-2 border-success pl-3">No provider secrets in the browser</div>
          </div>
        </div>

        <section className="rounded-lg border border-border bg-surface/95 p-6 shadow-surface-md">
          <div className="border-b border-border pb-5">
            <h2 className="text-xl font-semibold">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Choose a configured provider to continue to BotDock.
            </p>
          </div>

          {authReturnState === 'success' ? (
            <div className="mt-5 rounded-md border border-success/40 bg-success-muted px-4 py-3 text-sm text-success">
              Sign-in completed. Your secure session is ready for the dashboard.
            </div>
          ) : null}

          {authReturnState === 'error' ? (
            <div className="mt-5 rounded-md border border-danger/40 bg-danger-muted px-4 py-3 text-sm text-danger">
              Sign-in did not complete. Please try another provider.
            </div>
          ) : null}

          {message ? (
            <div className="mt-5 rounded-md border border-warning/40 bg-warning-muted px-4 py-3 text-sm text-warning">
              {message}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            {providers.map((providerStatus) => {
              const copy = providerCopy[providerStatus.provider];
              const isStarting = startingProvider === providerStatus.provider;
              const isDisabled =
                isLoadingProviders || !providerStatus.configured || startingProvider !== null;
              const statusLabel = providerStatus.configured ? 'Ready' : 'Not set up';

              return (
                <button
                  key={providerStatus.provider}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => void startOAuth(providerStatus.provider)}
                  className="flex min-h-20 w-full items-center justify-between rounded-md border border-border bg-surface-raised px-4 py-3 text-left shadow-surface-sm transition hover:border-primary hover:bg-muted focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      {isStarting ? 'Starting...' : copy.label}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {providerStatus.configured
                        ? copy.description
                        : 'Provider credentials are missing in the API environment.'}
                    </span>
                  </span>
                  <span className="ml-4 shrink-0 rounded-full border border-border bg-primary-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    {statusLabel}
                  </span>
                </button>
              );
            })}
          </div>

          {isLoadingProviders ? (
            <p className="mt-4 text-sm text-muted-foreground">Checking provider availability...</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
