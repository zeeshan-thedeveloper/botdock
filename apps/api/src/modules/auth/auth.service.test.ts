import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import type { OAuthProfile } from './auth.types.js';

function createPrismaMock() {
  const prisma = {
    oAuthIdentity: { findUnique: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn() },
    organisation: { create: vi.fn() },
    $transaction: vi.fn(),
  };

  prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) =>
    callback(prisma),
  );

  return prisma;
}

function createConfigServiceMock() {
  return { getOrThrow: vi.fn(), get: vi.fn() };
}

function googleProfile(overrides: Partial<OAuthProfile> = {}): OAuthProfile {
  return {
    provider: 'google',
    providerAccountId: 'google-123',
    email: 'ada@example.com',
    emailVerified: true,
    name: 'Ada Lovelace',
    avatarUrl: undefined,
    profileUrl: undefined,
    ...overrides,
  };
}

describe('AuthService.findOrCreateOAuthUser', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: AuthService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AuthService(createConfigServiceMock() as never, prisma as never);
  });

  it('returns the existing user without touching organisations when the OAuth identity is already linked', async () => {
    const existingUser = { id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace' };
    prisma.oAuthIdentity.findUnique.mockResolvedValue({ user: existingUser });

    const result = await service.findOrCreateOAuthUser(googleProfile());

    expect(result).toEqual(existingUser);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.organisation.create).not.toHaveBeenCalled();
  });

  it('creates a new user and a personal organisation (as OWNER) on first sign-in', async () => {
    prisma.oAuthIdentity.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    const createdUser = { id: 'user-new', email: 'ada@example.com', name: 'Ada Lovelace' };
    prisma.user.create.mockResolvedValue(createdUser);

    const result = await service.findOrCreateOAuthUser(googleProfile());

    expect(result).toEqual(createdUser);
    expect(prisma.oAuthIdentity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user-new' }) }),
    );
    expect(prisma.organisation.create).toHaveBeenCalledTimes(1);
    expect(prisma.organisation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Ada Lovelace's Workspace",
        slug: expect.stringMatching(/^ada-lovelace-[0-9a-f]{8}$/),
        members: { create: { userId: 'user-new', role: 'OWNER' } },
      }),
    });
  });

  it('does not create a second organisation when linking a new OAuth provider to an existing account', async () => {
    prisma.oAuthIdentity.findUnique.mockResolvedValue(null);
    const existingUser = { id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace' };
    prisma.user.findUnique.mockResolvedValue(existingUser);

    const result = await service.findOrCreateOAuthUser(googleProfile({ provider: 'github', providerAccountId: 'gh-456' }));

    expect(result).toEqual(existingUser);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.oAuthIdentity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1' }) }),
    );
    expect(prisma.organisation.create).not.toHaveBeenCalled();
  });

  it('falls back to the email local-part for the organisation name and slug when the profile has no name', async () => {
    prisma.oAuthIdentity.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'user-new', email: 'ada@example.com', name: null });

    await service.findOrCreateOAuthUser(googleProfile({ name: undefined }));

    expect(prisma.organisation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "ada's Workspace",
        slug: expect.stringMatching(/^ada-[0-9a-f]{8}$/),
      }),
    });
  });
});
