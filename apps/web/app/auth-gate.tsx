'use client';

import { useEffect, useMemo, useState } from 'react';
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

export function AuthGate() {
  const apiBaseUrl = useMemo(getApiBaseUrl, []);
  const [providers, setProviders] = useState<AuthProviderStatus[]>(defaultProviderStatuses);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [startingProvider, setStartingProvider] = useState<AuthProvider | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authReturnState, setAuthReturnState] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    setAuthReturnState(getAuthReturnState());
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

  return (
    <main className="min-h-screen bg-[#f7faf8] text-ink">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[1fr_420px]">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-moss">BotDock</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Sign in to configure and publish your chatbot workspace.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#4b5d52]">
            Connect with an approved OAuth provider to manage bot drafts, knowledge sources, test
            conversations, and deploy embedded chat experiences.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-[#5a6f62] sm:grid-cols-3">
            <div className="border-l-2 border-coral pl-3">Secure OAuth redirect flow</div>
            <div className="border-l-2 border-moss pl-3">HTTP-only session cookies</div>
            <div className="border-l-2 border-[#8bb7a0] pl-3">
              No provider secrets in the browser
            </div>
          </div>
        </div>

        <section className="rounded-lg border border-[#dbe7df] bg-white p-6 shadow-sm">
          <div className="border-b border-[#dbe7df] pb-5">
            <h2 className="text-xl font-semibold">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-[#5a6f62]">
              Choose a configured provider to continue to BotDock.
            </p>
          </div>

          {authReturnState === 'success' ? (
            <div className="mt-5 rounded-md border border-[#b9ddc8] bg-mint px-4 py-3 text-sm text-[#244834]">
              Sign-in completed. Your secure session is ready for the dashboard.
            </div>
          ) : null}

          {authReturnState === 'error' ? (
            <div className="mt-5 rounded-md border border-[#ffc4ba] bg-[#fff2ef] px-4 py-3 text-sm text-[#7a3026]">
              Sign-in did not complete. Please try another provider.
            </div>
          ) : null}

          {message ? (
            <div className="mt-5 rounded-md border border-[#f4d2a7] bg-[#fff8ed] px-4 py-3 text-sm text-[#745025]">
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
                  className="flex min-h-20 w-full items-center justify-between rounded-md border border-[#dbe7df] bg-[#fbfdfb] px-4 py-3 text-left transition hover:border-moss hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      {isStarting ? 'Starting...' : copy.label}
                    </span>
                    <span className="mt-1 block text-sm text-[#5a6f62]">
                      {providerStatus.configured
                        ? copy.description
                        : 'Provider credentials are missing in the API environment.'}
                    </span>
                  </span>
                  <span className="ml-4 shrink-0 rounded-full border border-[#dbe7df] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-moss">
                    {statusLabel}
                  </span>
                </button>
              );
            })}
          </div>

          {isLoadingProviders ? (
            <p className="mt-4 text-sm text-[#5a6f62]">Checking provider availability...</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
