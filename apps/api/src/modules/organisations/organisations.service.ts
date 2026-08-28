import { Inject, Injectable } from '@nestjs/common';
import type { OrganisationMembership } from '@botdock/contracts';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class OrganisationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listMine(userId: string): Promise<OrganisationMembership[]> {
    const memberships = await this.prisma.organisationMember.findMany({
      where: { userId },
      select: {
        role: true,
        organisation: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((membership) => ({
      id: membership.organisation.id,
      name: membership.organisation.name,
      slug: membership.organisation.slug,
      role: membership.role,
    }));
  }
}
