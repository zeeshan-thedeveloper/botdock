import { BadRequestException, Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AuthProvider, AuthProvidersResponse, OAuthStartResponse } from '@botdock/contracts';
import { PrismaService } from '../database/prisma.service.js';
import type { OAuthCallbackResult, OAuthProfile, OAuthStatePayload } from './auth.types.js';

const STATE_TTL_SECONDS = 10 * 60;
const GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  listProviders(): AuthProvidersResponse {
    return {
      providers: [
        {
          provider: 'google',
          configured: Boolean(this.configService.get<string>('GOOGLE_OAUTH_CLIENT_ID')),
        },
        {
          provider: 'github',
          configured: Boolean(this.configService.get<string>('GITHUB_OAUTH_CLIENT_ID')),
        },
      ],
    };
  }

  createOAuthStart(provider: AuthProvider, redirectTo?: string): OAuthStartResponse {
    const state = this.signState({
      provider,
      redirectTo,
      nonce: randomBytes(16).toString('base64url'),
      issuedAt: Math.floor(Date.now() / 1000),
    });

    if (provider === 'google') {
      return {
        provider,
        state,
        authorizationUrl: this.createGoogleAuthorizationUrl(state),
        status: this.isGoogleConfigured() ? 'ready' : 'provider_not_configured',
      };
    }

    return {
      provider,
      state,
      authorizationUrl: null,
      status: 'provider_not_implemented',
    };
  }

  async handleOAuthCallback(
    provider: AuthProvider,
    state: string,
    cookieState: string | undefined,
    code: string,
  ): Promise<OAuthCallbackResult> {
    if (!cookieState || state !== cookieState) {
      throw new BadRequestException('OAuth state cookie is missing or does not match.');
    }

    const payload = this.verifyState(state);

    if (payload.provider !== provider) {
      throw new BadRequestException('OAuth state provider does not match callback provider.');
    }

    if (provider === 'google') {
      const profile = await this.exchangeGoogleCode(code);
      const user = await this.findOrCreateOAuthUser(profile);
      const session = await this.createSession(user.id);

      return {
        redirectTo: this.resolveRedirectTo(payload.redirectTo),
        sessionToken: session.token,
        sessionMaxAgeSeconds: session.maxAgeSeconds,
      };
    }

    throw new NotImplementedException(`${provider} OAuth exchange is not implemented yet.`);
  }

  async findOrCreateOAuthUser(profile: OAuthProfile) {
    const existingIdentity = await this.prisma.oAuthIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider: this.toPrismaProvider(profile.provider),
          providerAccountId: profile.providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingIdentity) {
      return existingIdentity.user;
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    return this.prisma.$transaction(async (transaction) => {
      const user =
        existingUser ??
        (await transaction.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            emailVerifiedAt: profile.emailVerified ? new Date() : null,
          },
        }));

      await transaction.oAuthIdentity.create({
        data: {
          userId: user.id,
          provider: this.toPrismaProvider(profile.provider),
          providerAccountId: profile.providerAccountId,
          email: profile.email,
          emailVerified: profile.emailVerified,
          profileUrl: profile.profileUrl,
          avatarUrl: profile.avatarUrl,
        },
      });

      return user;
    });
  }

  private signState(payload: OAuthStatePayload) {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = this.sign(encodedPayload);

    return `${encodedPayload}.${signature}`;
  }

  private verifyState(state: string): OAuthStatePayload {
    const [encodedPayload, signature] = state.split('.');

    if (!encodedPayload || !signature) {
      throw new BadRequestException('OAuth state is malformed.');
    }

    const expectedSignature = this.sign(encodedPayload);

    if (!this.safeEqual(signature, expectedSignature)) {
      throw new BadRequestException('OAuth state signature is invalid.');
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString(),
    ) as OAuthStatePayload;
    const now = Math.floor(Date.now() / 1000);

    if (now - payload.issuedAt > STATE_TTL_SECONDS) {
      throw new BadRequestException('OAuth state has expired.');
    }

    return payload;
  }

  private sign(value: string) {
    return createHmac('sha256', this.configService.getOrThrow<string>('AUTH_SESSION_SECRET'))
      .update(value)
      .digest('base64url');
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private safeEqual(actual: string, expected: string) {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);

    return (
      actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  private toPrismaProvider(provider: AuthProvider) {
    return provider.toUpperCase() as 'GOOGLE' | 'GITHUB';
  }

  private isGoogleConfigured() {
    return Boolean(
      this.configService.get<string>('GOOGLE_OAUTH_CLIENT_ID') &&
      this.configService.get<string>('GOOGLE_OAUTH_CLIENT_SECRET'),
    );
  }

  private createGoogleAuthorizationUrl(state: string) {
    const clientId = this.configService.get<string>('GOOGLE_OAUTH_CLIENT_ID');

    if (!this.isGoogleConfigured() || !clientId) {
      return null;
    }

    const authorizationUrl = new URL(GOOGLE_AUTHORIZATION_URL);
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', this.getCallbackUrl('google'));
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', 'openid email profile');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('prompt', 'select_account');

    return authorizationUrl.toString();
  }

  private async exchangeGoogleCode(code: string): Promise<OAuthProfile> {
    const clientId = this.configService.get<string>('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_OAUTH_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth is not configured.');
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.getCallbackUrl('google'),
      }),
    });

    if (!tokenResponse.ok) {
      throw new BadRequestException('Google OAuth token exchange failed.');
    }

    const tokenPayload = (await tokenResponse.json()) as { access_token?: string };

    if (!tokenPayload.access_token) {
      throw new BadRequestException('Google OAuth token response did not include an access token.');
    }

    const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        authorization: `Bearer ${tokenPayload.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new BadRequestException('Google OAuth profile request failed.');
    }

    const profile = (await profileResponse.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
      profile?: string;
    };

    if (!profile.sub || !profile.email) {
      throw new BadRequestException('Google OAuth profile did not include a usable identity.');
    }

    if (!profile.email_verified) {
      throw new BadRequestException('Google OAuth email must be verified.');
    }

    return {
      provider: 'google',
      providerAccountId: profile.sub,
      email: profile.email,
      emailVerified: profile.email_verified,
      name: profile.name,
      avatarUrl: profile.picture,
      profileUrl: profile.profile,
    };
  }

  private getCallbackUrl(provider: AuthProvider) {
    return new URL(
      `/auth/oauth/${provider}/callback`,
      this.configService.getOrThrow<string>('API_PUBLIC_URL'),
    ).toString();
  }

  private resolveRedirectTo(redirectTo: string | undefined) {
    if (!redirectTo) {
      return this.configService.getOrThrow<string>('WEB_APP_URL');
    }

    const webAppUrl = new URL(this.configService.getOrThrow<string>('WEB_APP_URL'));
    const requestedUrl = new URL(redirectTo, webAppUrl);

    if (requestedUrl.origin !== webAppUrl.origin) {
      return webAppUrl.toString();
    }

    return requestedUrl.toString();
  }

  private async createSession(userId: string) {
    const token = randomBytes(32).toString('base64url');
    const maxAgeSeconds =
      this.configService.getOrThrow<number>('AUTH_SESSION_TTL_DAYS') * 24 * 60 * 60;
    const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);

    await this.prisma.authSession.create({
      data: {
        userId,
        sessionTokenHash: this.hash(token),
        expiresAt,
      },
    });

    return {
      token,
      maxAgeSeconds,
    };
  }
}
