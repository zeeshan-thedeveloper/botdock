import { BadRequestException, Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthProvider, AuthProvidersResponse, OAuthStartResponse } from '@botdock/contracts';
import { authProviderSchema } from '@botdock/contracts';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { readCookie, serializeCookie } from './cookie.utils.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('providers')
  @ApiOkResponse({ description: 'Configured authentication providers.' })
  listProviders(): AuthProvidersResponse {
    return this.authService.listProviders();
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
  callback(
    @Param('provider') providerParam: string,
    @Query('state') state: string | undefined,
    @Req() request: Request,
  ) {
    const provider = this.parseProvider(providerParam);

    if (!state) {
      throw new BadRequestException('OAuth state query parameter is required.');
    }

    return this.authService.validateOAuthCallback(
      provider,
      state,
      readCookie(request, this.configService.getOrThrow<string>('AUTH_OAUTH_STATE_COOKIE_NAME')),
    );
  }

  private parseProvider(provider: string): AuthProvider {
    const parsed = authProviderSchema.safeParse(provider);

    if (!parsed.success) {
      throw new BadRequestException('Unsupported OAuth provider.');
    }

    return parsed.data;
  }
}
