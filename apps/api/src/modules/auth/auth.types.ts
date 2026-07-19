import type { AuthProvider } from '@botdock/contracts';

export type OAuthStatePayload = {
  provider: AuthProvider;
  nonce: string;
  issuedAt: number;
  redirectTo?: string;
};

export type OAuthProfile = {
  provider: AuthProvider;
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
  profileUrl?: string;
};

export type OAuthCallbackResult = {
  redirectTo: string;
  sessionToken: string;
  sessionMaxAgeSeconds: number;
};
