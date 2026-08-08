import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WidgetService } from './widget.service.js';

function createPrismaMock() {
  return {
    botDeployment: { findFirst: vi.fn() },
    allowedDomain: { findMany: vi.fn() },
  };
}

describe('WidgetService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: WidgetService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new WidgetService(prisma as never);
  });

  it('resolves an ACTIVE, published deployment by its public id', async () => {
    prisma.botDeployment.findFirst.mockResolvedValue({
      id: 'dep_1',
      organisationId: 'org-1',
      botId: 'bot-1',
    });

    const result = await service.resolveDeployment('dep_1');

    expect(prisma.botDeployment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dep_1', status: 'ACTIVE', currentVersionId: { not: null } },
      }),
    );
    expect(result).toEqual({ id: 'dep_1', organisationId: 'org-1', botId: 'bot-1' });
  });

  it('returns null for an unknown, disabled, or never-published deployment', async () => {
    prisma.botDeployment.findFirst.mockResolvedValue(null);

    await expect(service.resolveDeployment('dep_missing')).resolves.toBeNull();
  });

  it('returns the bot allowed-domain patterns', async () => {
    prisma.allowedDomain.findMany.mockResolvedValue([
      { pattern: '*.acme.com' },
      { pattern: 'shop.acme.com' },
    ]);

    await expect(service.getAllowedPatterns('bot-1')).resolves.toEqual([
      '*.acme.com',
      'shop.acme.com',
    ]);
    expect(prisma.allowedDomain.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { botId: 'bot-1' } }),
    );
  });
});
