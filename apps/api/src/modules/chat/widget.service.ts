import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

export type ResolvedDeployment = {
  id: string;
  organisationId: string;
  botId: string;
};

@Injectable()
export class WidgetService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Only an ACTIVE, published (has a current version) deployment is reachable publicly. */
  async resolveDeployment(deploymentId: string): Promise<ResolvedDeployment | null> {
    return this.prisma.botDeployment.findFirst({
      where: { id: deploymentId, status: 'ACTIVE', currentVersionId: { not: null } },
      select: { id: true, organisationId: true, botId: true },
    });
  }

  async getAllowedPatterns(botId: string): Promise<string[]> {
    const domains = await this.prisma.allowedDomain.findMany({
      where: { botId },
      select: { pattern: true },
    });

    return domains.map((domain) => domain.pattern);
  }
}
