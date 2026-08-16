import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';

const disconnectMock = vi.fn();

/** In-memory stand-in for Redis INCR/EXPIRE/TTL, keyed like the real store. */
const store = new Map<string, { count: number; ttl: number }>();

vi.mock('ioredis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    disconnect: disconnectMock,
    incr: vi.fn(async (key: string) => {
      const entry = store.get(key) ?? { count: 0, ttl: -1 };
      entry.count += 1;
      store.set(key, entry);
      return entry.count;
    }),
    expire: vi.fn(async (key: string, seconds: number) => {
      const entry = store.get(key) ?? { count: 0, ttl: -1 };
      entry.ttl = seconds;
      store.set(key, entry);
      return 1;
    }),
    ttl: vi.fn(async (key: string) => store.get(key)?.ttl ?? -1),
  })),
}));

const { WidgetRateLimitGuard } = await import('./widget-rate-limit.guard.js');

function createConfigServiceMock() {
  return { getOrThrow: vi.fn().mockReturnValue('redis://localhost:6379') };
}

function contextFor(deploymentId: string, ip: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ params: { deploymentId }, ip }),
    }),
  } as unknown as ExecutionContext;
}

describe('WidgetRateLimitGuard', () => {
  beforeEach(() => {
    store.clear();
    disconnectMock.mockReset();
  });

  it('allows requests under both the per-IP and aggregate limits', async () => {
    const guard = new WidgetRateLimitGuard(createConfigServiceMock() as never);

    await expect(guard.canActivate(contextFor('dep-1', '1.1.1.1'))).resolves.toBe(true);
  });

  it('rejects a single IP once it exceeds its own 20 req/60s limit', async () => {
    const guard = new WidgetRateLimitGuard(createConfigServiceMock() as never);

    for (let i = 0; i < 20; i += 1) {
      await expect(guard.canActivate(contextFor('dep-1', '1.1.1.1'))).resolves.toBe(true);
    }

    await expect(guard.canActivate(contextFor('dep-1', '1.1.1.1'))).rejects.toMatchObject({
      response: expect.objectContaining({
        statusCode: 429,
        message: 'Too many messages sent. Please wait a moment and try again.',
      }),
    });
  });

  it('rejects requests once the deployment-wide aggregate limit is exceeded, even across many distinct IPs', async () => {
    const guard = new WidgetRateLimitGuard(createConfigServiceMock() as never);

    for (let i = 0; i < 300; i += 1) {
      await expect(guard.canActivate(contextFor('dep-1', `10.0.0.${i % 250}`))).resolves.toBe(true);
    }

    await expect(guard.canActivate(contextFor('dep-1', '10.0.0.250'))).rejects.toMatchObject({
      response: expect.objectContaining({
        statusCode: 429,
        message: 'This bot is receiving unusually high traffic right now. Please wait a moment and try again.',
      }),
    });
  });

  it('keeps per-deployment aggregate counters independent across different deployments', async () => {
    const guard = new WidgetRateLimitGuard(createConfigServiceMock() as never);

    for (let i = 0; i < 300; i += 1) {
      await guard.canActivate(contextFor('dep-1', `10.0.0.${i % 250}`));
    }

    await expect(guard.canActivate(contextFor('dep-2', '10.0.0.1'))).resolves.toBe(true);
  });

  it('disconnects redis on module destroy', async () => {
    const guard = new WidgetRateLimitGuard(createConfigServiceMock() as never);

    await guard.onModuleDestroy();

    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });
});
