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

// Per (deployment, visitor IP): throttles a single abusive visitor without
// affecting anyone else talking to the same bot. 20 req/60s is generous for
// a real conversation (a few messages a minute) but cheap for a script to
// blow through — that's expected; it's a floor, not the real ceiling.
const IP_RATE_LIMIT_WINDOW_SECONDS = 60;
const IP_RATE_LIMIT_MAX_REQUESTS = 20;

// Per deployment, across all IPs: the per-IP limit alone does nothing against
// a request flood spread across many source IPs (botnet, rotating proxies,
// NAT-shared traffic from many real users) — that traffic never hits any
// single IP's ceiling but still drains the tenant's BYOK provider spend.
// 300 req/60s is ~15x the per-IP ceiling: comfortably above what a busy but
// legitimate embedded widget sees (dozens of concurrent real conversations),
// while still bounding the worst case to roughly 5 messages/sec sustained
// against one bot's provider key.
const AGGREGATE_RATE_LIMIT_WINDOW_SECONDS = 60;
const AGGREGATE_RATE_LIMIT_MAX_REQUESTS = 300;

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

    // Both counters always increment, regardless of which (if either) trips —
    // an IP that's over its own limit shouldn't get a free pass on consuming
    // aggregate budget, and vice versa.
    const [ipExceeded, aggregateExceeded] = await Promise.all([
      this.checkLimit(
        `ratelimit:widget:${deploymentId}:${clientIp}`,
        IP_RATE_LIMIT_WINDOW_SECONDS,
        IP_RATE_LIMIT_MAX_REQUESTS,
      ),
      this.checkLimit(
        `ratelimit:widget:aggregate:${deploymentId}`,
        AGGREGATE_RATE_LIMIT_WINDOW_SECONDS,
        AGGREGATE_RATE_LIMIT_MAX_REQUESTS,
      ),
    ]);

    if (aggregateExceeded !== null) {
      this.reject(
        'This bot is receiving unusually high traffic right now. Please wait a moment and try again.',
        aggregateExceeded,
      );
    }

    if (ipExceeded !== null) {
      this.reject('Too many messages sent. Please wait a moment and try again.', ipExceeded);
    }

    return true;
  }

  /** Returns retry-after seconds if the key's count is over budget, otherwise null. */
  private async checkLimit(key: string, windowSeconds: number, maxRequests: number): Promise<number | null> {
    const count = await this.connection.incr(key);
    if (count === 1) {
      await this.connection.expire(key, windowSeconds);
    }

    if (count <= maxRequests) {
      return null;
    }

    const retryAfterSeconds = await this.connection.ttl(key);
    return retryAfterSeconds > 0 ? retryAfterSeconds : windowSeconds;
  }

  private reject(message: string, retryAfterSeconds: number): never {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message,
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.connection.disconnect();
  }
}
