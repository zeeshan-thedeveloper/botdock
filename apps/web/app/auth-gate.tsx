'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  authProvidersResponseSchema,
  oauthStartResponseSchema,
  type AuthProvider,
  type AuthProviderStatus,
} from '@botdock/contracts';
import { Badge, Button, Field, TextInput } from '@botdock/ui';
import {
  AlertCircle,
  Bot,
  Braces,
  CheckCircle2,
  GitBranch,
  Globe2,
  KeyRound,
  Link2,
  LockKeyhole,
  Mail,
  Rocket,
  Server,
  ShieldCheck,
} from 'lucide-react';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailPasswordError, setShowEmailPasswordError] = useState(false);

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

  function handlePasswordSignIn() {
    setShowEmailPasswordError(!(email.trim() && password.trim()));
  }

  if (hasCompletedAuth && children) {
    return children;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="grid min-h-screen lg:grid-cols-[1.08fr_1fr]">
        <aside className="relative hidden overflow-hidden border-r border-border bg-surface px-10 py-10 lg:flex lg:flex-col lg:justify-between xl:px-14 xl:py-14">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              B
            </div>
            <p className="text-[15px] font-semibold">BotDock</p>
          </div>

          <div className="relative mx-auto flex min-h-[28rem] w-full max-w-[32rem] items-center justify-center">
            <svg
              className="absolute inset-x-4 top-16 h-80 text-border"
              viewBox="0 0 420 320"
              fill="none"
              aria-hidden="true"
            >
              <path d="M60 60L210 140L360 50" stroke="currentColor" strokeWidth="1.5" />
              <path d="M210 140L120 260M210 140L320 250" stroke="currentColor" strokeWidth="1.5" />
              <path d="M210 140V230" stroke="hsl(var(--color-primary))" strokeWidth="1.5" />
            </svg>

            <div className="absolute left-0 top-12 w-32 rounded-lg border border-border bg-surface-raised p-3 shadow-surface-sm">
              <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Globe2 className="size-3.5" aria-hidden="true" />
                Website
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="size-1.5 rounded-full bg-success" />
                Connected
              </div>
            </div>

            <div className="absolute right-2 top-9 w-32 rounded-lg border border-border bg-surface-raised p-3 shadow-surface-sm">
              <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Server className="size-3.5" aria-hidden="true" />
                REST API
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="size-1.5 rounded-full bg-success" />
                142 req/day
              </div>
            </div>

            <div className="relative z-10 w-40 rounded-xl border border-border bg-surface-raised p-4 shadow-surface-md">
              <div className="mb-3 flex items-center gap-2">
                <Bot className="size-4 text-primary" aria-hidden="true" />
                <p className="text-xs font-semibold">Support Assistant</p>
              </div>
              <Badge tone="success">Published v14</Badge>
            </div>

            <div className="absolute bottom-16 left-10 w-36 rounded-lg border border-border bg-surface-raised p-3 shadow-surface-sm">
              <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Braces className="size-3.5" aria-hidden="true" />
                Knowledge
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />3 sources ready
              </div>
            </div>

            <div className="absolute bottom-20 right-6 w-36 rounded-lg border border-border bg-surface-raised p-3 shadow-surface-sm">
              <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Rocket className="size-3.5" aria-hidden="true" />
                Deploy
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="size-1.5 animate-pulse rounded-full bg-cyan-300" />
                Staging live
              </div>
            </div>
          </div>

          <div>
            <h1 className="max-w-md text-2xl font-semibold leading-tight">
              Every bot, source, and deployment connected in one dock.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Configure, deploy, and monitor AI chatbots anywhere.
            </p>
          </div>
        </aside>

        <div className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-10">
          <section className="w-full max-w-[23rem]">
            <div className="mb-10 flex items-center gap-2.5 lg:hidden">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                B
              </div>
              <p className="text-[15px] font-semibold">BotDock</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold">Sign in to your workspace</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Welcome back. Pick up where you left off.
              </p>
            </div>

            {authReturnState === 'error' ? (
              <div className="mt-6 flex items-start gap-3 rounded-md border border-danger/40 bg-danger-muted px-4 py-3 text-sm text-danger">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>Sign-in did not complete. Please try another provider.</span>
              </div>
            ) : null}

            {message ? (
              <div className="mt-6 flex items-start gap-3 rounded-md border border-warning/40 bg-warning-muted px-4 py-3 text-sm text-warning">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{message}</span>
              </div>
            ) : null}

            <div className="mt-7 grid gap-2.5">
              {providers.map((providerStatus) => {
                const copy = providerCopy[providerStatus.provider];
                const isStarting = startingProvider === providerStatus.provider;
                const isDisabled =
                  isLoadingProviders || !providerStatus.configured || startingProvider !== null;
                const ProviderIcon = providerStatus.provider === 'github' ? GitBranch : null;

                return (
                  <Button
                    key={providerStatus.provider}
                    type="button"
                    variant="secondary"
                    size="lg"
                    disabled={isDisabled}
                    onClick={() => void startOAuth(providerStatus.provider)}
                    className="w-full"
                    aria-describedby={`${providerStatus.provider}-provider-status`}
                  >
                    {ProviderIcon ? (
                      <ProviderIcon className="size-4" aria-hidden="true" />
                    ) : (
                      <span className="flex size-4 items-center justify-center rounded-full border border-border text-[10px] font-bold">
                        G
                      </span>
                    )}
                    <span>{isStarting ? 'Starting...' : copy.label}</span>
                    <span id={`${providerStatus.provider}-provider-status`} className="sr-only">
                      {providerStatus.configured ? copy.description : 'Provider is not configured.'}
                    </span>
                  </Button>
                );
              })}
            </div>

            {isLoadingProviders ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Checking provider availability...
              </p>
            ) : null}

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-semibold uppercase text-muted-foreground/70">
                or
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid gap-4">
              <Field label="Email">
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <TextInput
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setShowEmailPasswordError(false);
                    }}
                    placeholder="you@company.com"
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
              </Field>

              <Field label="Password">
                <div className="relative">
                  <LockKeyhole
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <TextInput
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setShowEmailPasswordError(false);
                    }}
                    placeholder="••••••••••"
                    className="pl-9"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-[-1.75rem] text-xs font-medium text-primary hover:text-primary/80"
                  >
                    Forgot password?
                  </button>
                </div>
              </Field>

              {showEmailPasswordError ? (
                <div className="flex items-start gap-3 rounded-md border border-danger/40 bg-danger-muted px-4 py-3 text-sm text-danger">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>Enter an email and password to preview this sign-in path.</span>
                </div>
              ) : null}

              <Button type="button" size="lg" onClick={handlePasswordSignIn}>
                Sign in
              </Button>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <button type="button" className="font-medium text-primary hover:text-primary/80">
                Create one
              </button>
            </p>
            <p className="mt-6 text-center text-xs leading-5 text-muted-foreground/70">
              By continuing you agree to the Terms of Service and Privacy Policy.
            </p>

            <div className="mt-8 grid gap-2 rounded-lg border border-border bg-surface/70 p-4 text-xs leading-5 text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-success" aria-hidden="true" />
                OAuth redirects stay handled by the BotDock API.
              </div>
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-primary" aria-hidden="true" />
                No provider secrets are exposed in the browser.
              </div>
              <div className="flex items-center gap-2">
                <Link2 className="size-4 text-cyan-300" aria-hidden="true" />
                Sessions continue into the dashboard shell.
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
