import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeploymentService } from './deployment.service.js';

const now = new Date('2026-08-08T00:00:00.000Z');

function createPrismaMock() {
  return {
    organisationMember: { findUnique: vi.fn() },
    bot: { findFirst: vi.fn() },
    allowedDomain: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    botDeployment: { findFirst: vi.fn() },
  };
}

function createConfigServiceMock() {
  return { getOrThrow: vi.fn().mockReturnValue('https://api.botdock.dev') };
}

describe('DeploymentService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let configService: ReturnType<typeof createConfigServiceMock>;
  let service: DeploymentService;

  beforeEach(() => {
    prisma = createPrismaMock();
    configService = createConfigServiceMock();
    service = new DeploymentService(prisma as never, configService as never);
  });

  it('blocks access when the user is not an organisation member', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue(null);

    await expect(service.listAllowedDomains('org-1', 'bot-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.bot.findFirst).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the bot is outside the tenant scope', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.bot.findFirst.mockResolvedValue(null);

    await expect(service.listAllowedDomains('org-1', 'bot-x', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists allowed domains scoped to the tenant', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.bot.findFirst.mockResolvedValue({ id: 'bot-1' });
    prisma.allowedDomain.findMany.mockResolvedValue([
      { id: 'dom-1', botId: 'bot-1', pattern: '*.acme.com', createdAt: now },
    ]);

    await expect(service.listAllowedDomains('org-1', 'bot-1', 'user-1')).resolves.toEqual({
      domains: [{ id: 'dom-1', botId: 'bot-1', pattern: '*.acme.com', createdAt: now.toISOString() }],
    });
    expect(prisma.allowedDomain.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organisationId: 'org-1', botId: 'bot-1' } }),
    );
  });

  it('normalizes the pattern (trim + lowercase) and upserts idempotently', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.bot.findFirst.mockResolvedValue({ id: 'bot-1' });
    prisma.allowedDomain.upsert.mockResolvedValue({
      id: 'dom-1',
      botId: 'bot-1',
      pattern: 'shop.acme.com',
      createdAt: now,
    });

    await service.createAllowedDomain('org-1', 'bot-1', 'user-1', { pattern: '  Shop.Acme.com  ' });

    expect(prisma.allowedDomain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { botId_pattern: { botId: 'bot-1', pattern: 'shop.acme.com' } },
        create: expect.objectContaining({
          organisationId: 'org-1',
          botId: 'bot-1',
          pattern: 'shop.acme.com',
          createdById: 'user-1',
        }),
      }),
    );
  });

  it('throws NotFoundException deleting a domain outside the tenant scope', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.allowedDomain.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      service.deleteAllowedDomain('org-1', 'bot-1', 'dom-x', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a null-ish shape when the bot has never been published', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.bot.findFirst.mockResolvedValue({ id: 'bot-1' });
    prisma.botDeployment.findFirst.mockResolvedValue(null);

    await expect(service.getDeploymentInfo('org-1', 'bot-1', 'user-1')).resolves.toEqual({
      deploymentId: null,
      environment: 'production',
      status: null,
      currentVersionNumber: null,
      publishedAt: null,
      embedSnippet: null,
    });
  });

  it('returns deployment info with a working embed snippet once published', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.bot.findFirst.mockResolvedValue({ id: 'bot-1' });
    prisma.botDeployment.findFirst.mockResolvedValue({
      id: 'dep_abc123',
      status: 'ACTIVE',
      publishedAt: now,
      currentVersion: { versionNumber: 3 },
    });

    const result = await service.getDeploymentInfo('org-1', 'bot-1', 'user-1');

    expect(result).toEqual({
      deploymentId: 'dep_abc123',
      environment: 'production',
      status: 'active',
      currentVersionNumber: 3,
      publishedAt: now.toISOString(),
      embedSnippet:
        '<script src="https://api.botdock.dev/widget.js" data-deployment-id="dep_abc123" defer></script>',
    });
  });
});
