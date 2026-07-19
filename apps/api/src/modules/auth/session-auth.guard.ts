import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service.js';
import { readCookie } from './cookie.utils.js';
import type { AuthenticatedRequest } from './current-user.decorator.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & Request>();
    const sessionToken = readCookie(
      request,
      this.configService.getOrThrow<string>('AUTH_COOKIE_NAME'),
    );

    if (!sessionToken) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const session = await this.prisma.authSession.findFirst({
      where: {
        sessionTokenHash: this.hash(sessionToken),
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Authentication is required.');
    }

    request.user = session.user;

    return true;
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
