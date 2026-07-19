import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionAuthGuard } from './session-auth.guard.js';

function createContext(cookieHeader?: string) {
  const request = {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  };

  return {
    request,
    context: {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext,
  };
}

describe('SessionAuthGuard', () => {
  let prisma: { authSession: { findFirst: ReturnType<typeof vi.fn> } };
  let guard: SessionAuthGuard;

  beforeEach(() => {
    prisma = {
      authSession: {
        findFirst: vi.fn(),
      },
    };
    guard = new SessionAuthGuard(
      new ConfigService({ AUTH_COOKIE_NAME: 'botdock_session' }),
      prisma as never,
    );
  });

  it('rejects requests without an active session', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.authSession.findFirst).not.toHaveBeenCalled();
  });

  it('attaches the authenticated user to the request', async () => {
    prisma.authSession.findFirst.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'owner@botdock.dev',
        name: 'Owner',
        avatarUrl: null,
      },
    });
    const { context, request } = createContext('botdock_session=session-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.authSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sessionTokenHash: createHash('sha256').update('session-token').digest('hex'),
          revokedAt: null,
        }),
      }),
    );
    expect(request).toHaveProperty('user', {
      id: 'user-1',
      email: 'owner@botdock.dev',
      name: 'Owner',
      avatarUrl: null,
    });
  });
});
