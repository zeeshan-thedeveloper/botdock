import { describe, expect, it, vi } from 'vitest';
import { OrganisationsService } from './organisations.service.js';

function createPrismaMock() {
  return { organisationMember: { findMany: vi.fn() } };
}

describe('OrganisationsService.listMine', () => {
  it('returns the organisations the user is a member of, with their role', async () => {
    const prisma = createPrismaMock();
    prisma.organisationMember.findMany.mockResolvedValue([
      { role: 'OWNER', organisation: { id: 'org-1', name: "Ada's Workspace", slug: 'ada-abc123' } },
    ]);
    const service = new OrganisationsService(prisma as never);

    const result = await service.listMine('user-1');

    expect(prisma.organisationMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
    expect(result).toEqual([{ id: 'org-1', name: "Ada's Workspace", slug: 'ada-abc123', role: 'OWNER' }]);
  });

  it('returns an empty list for a user with no memberships', async () => {
    const prisma = createPrismaMock();
    prisma.organisationMember.findMany.mockResolvedValue([]);
    const service = new OrganisationsService(prisma as never);

    const result = await service.listMine('user-orphan');

    expect(result).toEqual([]);
  });
});
