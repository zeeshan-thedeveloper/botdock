import { BadRequestException, Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AuthProvider, AuthProvidersResponse, OAuthStartResponse } from '@botdock/contracts';
import { PrismaService } from '../database/prisma.service.js';
import type { OAuthProfile, OAuthStatePayload } from './auth.types.js';

const STATE_TTL_SECONDS = 10 * 60;

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

    return {
      provider,
      state,
      authorizationUrl: null,
      status: 'provider_not_implemented',
    };
  }

  validateOAuthCallback(provider: AuthProvider, state: string, cookieState: string | undefined) {
    if (!cookieState || state !== cookieState) {
      throw new BadRequestException('OAuth state cookie is missing or does not match.');
    }

    const payload = this.verifyState(state);

    if (payload.provider !== provider) {
      throw new BadRequestException('OAuth state provider does not match callback provider.');
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
}
