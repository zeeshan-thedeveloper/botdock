import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service.js';
import { AuthService } from './auth.service.js';
import { readCookie } from './cookie.utils.js';
import type { AuthenticatedRequest } from './current-user.decorator.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & Request>();
    const sessionToken = readCookie(
      request,
      this.configService.getOrThrow<string>('AUTH_COOKIE_NAME'),
    );
    const session = await this.authService.getSessionUser(sessionToken);

    if (!session.user) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Authentication is required.');
    }

    request.user = user;

    return true;
  }
}
