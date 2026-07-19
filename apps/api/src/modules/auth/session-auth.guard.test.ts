import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
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
  let authService: { getSessionUser: ReturnType<typeof vi.fn> };
  let prisma: { user: { findUnique: ReturnType<typeof vi.fn> } };
  let guard: SessionAuthGuard;

  beforeEach(() => {
    authService = {
      getSessionUser: vi.fn(),
    };
    prisma = {
      user: {
        findUnique: vi.fn(),
      },
    };
    guard = new SessionAuthGuard(
      authService as never,
      new ConfigService({ AUTH_COOKIE_NAME: 'botdock_session' }),
      prisma as never,
    );
  });

  it('rejects requests without an active session', async () => {
    authService.getSessionUser.mockResolvedValue({ user: null });
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('attaches the authenticated user to the request', async () => {
    authService.getSessionUser.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'owner@botdock.dev',
        name: 'Owner',
        avatarUrl: null,
      },
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@botdock.dev',
      name: 'Owner',
      avatarUrl: null,
    });
    const { context, request } = createContext('botdock_session=session-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.getSessionUser).toHaveBeenCalledWith('session-token');
    expect(request).toHaveProperty('user', {
      id: 'user-1',
      email: 'owner@botdock.dev',
      name: 'Owner',
      avatarUrl: null,
    });
  });
});
