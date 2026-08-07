import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Redis } from 'ioredis';

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 20;

@Injectable()
export class WidgetRateLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly connection: Redis;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.connection = new Redis(configService.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const deploymentId = request.params.deploymentId ?? 'unknown';
    const clientIp = request.ip ?? 'unknown';
    const key = `ratelimit:widget:${deploymentId}:${clientIp}`;

    const count = await this.connection.incr(key);
    if (count === 1) {
      await this.connection.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }

    if (count > RATE_LIMIT_MAX_REQUESTS) {
      const retryAfterSeconds = await this.connection.ttl(key);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many messages sent. Please wait a moment and try again.',
          retryAfterSeconds: retryAfterSeconds > 0 ? retryAfterSeconds : RATE_LIMIT_WINDOW_SECONDS,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  async onModuleDestroy(): Promise<void> {
    this.connection.disconnect();
  }
}
