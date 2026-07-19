import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
  Query,
  Redirect,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type {
  AuthProvider,
  AuthProvidersResponse,
  AuthSessionResponse,
  OAuthStartResponse,
} from '@botdock/contracts';
import { authProviderSchema } from '@botdock/contracts';
import type { Request, Response } from 'express';
import { PrismaService } from '../database/prisma.service.js';
import { AuthService } from './auth.service.js';
import { readCookie, serializeCookie } from './cookie.utils.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly authService: AuthService;
  private readonly configService: ConfigService;

  constructor(authService?: AuthService, configService?: ConfigService) {
    const resolvedConfigService = configService ?? AuthController.createFallbackConfigService();

    this.authService = authService ?? new AuthService(resolvedConfigService, new PrismaService());
    this.configService = resolvedConfigService;
  }

  @Get('providers')
  @ApiOkResponse({ description: 'Configured authentication providers.' })
  listProviders(): AuthProvidersResponse {
    return this.authService.listProviders();
  }

  @Get('session')
  @ApiOkResponse({ description: 'Current authenticated user session.' })
  getSession(@Req() request: Request): Promise<AuthSessionResponse> {
    return this.authService.getSessionUser(
      readCookie(request, this.configService.getOrThrow<string>('AUTH_COOKIE_NAME')),
    );
  }

  @Get('oauth/:provider/start')
  @ApiOkResponse({ description: 'Starts an OAuth provider flow.' })
  startOAuth(
    @Param('provider') providerParam: string,
    @Query('redirectTo') redirectTo: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): OAuthStartResponse {
    const provider = this.parseProvider(providerParam);
    const result = this.authService.createOAuthStart(provider, redirectTo);

    response.setHeader(
      'Set-Cookie',
      serializeCookie(
        this.configService.getOrThrow<string>('AUTH_OAUTH_STATE_COOKIE_NAME'),
        result.state,
        {
          httpOnly: true,
          secure: this.configService.getOrThrow<boolean>('AUTH_COOKIE_SECURE'),
          sameSite: this.configService.getOrThrow<'lax' | 'strict' | 'none'>(
            'AUTH_COOKIE_SAME_SITE',
          ),
          domain: this.configService.get<string>('AUTH_COOKIE_DOMAIN'),
          maxAgeSeconds: 10 * 60,
        },
      ),
    );

    return result;
  }

  @Get('oauth/:provider/callback')
  @HttpCode(302)
  @Redirect()
  async callback(
    @Param('provider') providerParam: string,
    @Query('state') state: string | undefined,
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const provider = this.parseProvider(providerParam);

    if (error) {
      throw new BadRequestException(`OAuth provider returned an error: ${error}`);
    }

    if (!state) {
      throw new BadRequestException('OAuth state query parameter is required.');
    }

    if (!code) {
      throw new BadRequestException('OAuth code query parameter is required.');
    }

    const result = await this.authService.handleOAuthCallback(
      provider,
      state,
      readCookie(request, this.configService.getOrThrow<string>('AUTH_OAUTH_STATE_COOKIE_NAME')),
      code,
    );

    response.setHeader('Set-Cookie', [
      serializeCookie(this.configService.getOrThrow<string>('AUTH_OAUTH_STATE_COOKIE_NAME'), '', {
        httpOnly: true,
        secure: this.configService.getOrThrow<boolean>('AUTH_COOKIE_SECURE'),
        sameSite: this.configService.getOrThrow<'lax' | 'strict' | 'none'>('AUTH_COOKIE_SAME_SITE'),
        domain: this.configService.get<string>('AUTH_COOKIE_DOMAIN'),
        maxAgeSeconds: 0,
      }),
      serializeCookie(
        this.configService.getOrThrow<string>('AUTH_COOKIE_NAME'),
        result.sessionToken,
        {
          httpOnly: true,
          secure: this.configService.getOrThrow<boolean>('AUTH_COOKIE_SECURE'),
          sameSite: this.configService.getOrThrow<'lax' | 'strict' | 'none'>(
            'AUTH_COOKIE_SAME_SITE',
          ),
          domain: this.configService.get<string>('AUTH_COOKIE_DOMAIN'),
          maxAgeSeconds: result.sessionMaxAgeSeconds,
        },
      ),
    ]);

    return {
      url: result.redirectTo,
    };
  }

  private parseProvider(provider: string): AuthProvider {
    const parsed = authProviderSchema.safeParse(provider);

    if (!parsed.success) {
      throw new BadRequestException('Unsupported OAuth provider.');
    }

    return parsed.data;
  }

  private static createFallbackConfigService() {
    return new ConfigService({
      ...process.env,
      AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE === 'true',
      AUTH_COOKIE_SAME_SITE: process.env.AUTH_COOKIE_SAME_SITE ?? 'lax',
    });
  }
}
