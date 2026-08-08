import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AllowedDomain as AllowedDomainResponse,
  AllowedDomainsResponse,
  CreateAllowedDomainInput,
  DeploymentInfo,
} from '@botdock/contracts';
import { PrismaService } from '../database/prisma.service.js';

type StoredAllowedDomain = {
  id: string;
  botId: string;
  pattern: string;
  createdAt: Date;
};

@Injectable()
export class DeploymentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async listAllowedDomains(
    organisationId: string,
    botId: string,
    userId: string,
  ): Promise<AllowedDomainsResponse> {
    await this.ensureOrganisationMember(organisationId, userId);
    await this.ensureBotInOrganisation(organisationId, botId);

    const domains = await this.prisma.allowedDomain.findMany({
      where: { organisationId, botId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, botId: true, pattern: true, createdAt: true },
    });

    return { domains: domains.map((domain) => this.toResponse(domain)) };
  }

  async createAllowedDomain(
    organisationId: string,
    botId: string,
    userId: string,
    input: CreateAllowedDomainInput,
  ): Promise<AllowedDomainResponse> {
    await this.ensureOrganisationMember(organisationId, userId);
    await this.ensureBotInOrganisation(organisationId, botId);

    const pattern = input.pattern.trim().toLowerCase();

    const domain = await this.prisma.allowedDomain.upsert({
      where: { botId_pattern: { botId, pattern } },
      create: { organisationId, botId, pattern, createdById: userId },
      update: {},
      select: { id: true, botId: true, pattern: true, createdAt: true },
    });

    return this.toResponse(domain);
  }

  async deleteAllowedDomain(
    organisationId: string,
    botId: string,
    domainId: string,
    userId: string,
  ): Promise<void> {
    await this.ensureOrganisationMember(organisationId, userId);

    const result = await this.prisma.allowedDomain.deleteMany({
      where: { id: domainId, organisationId, botId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Allowed domain was not found.');
    }
  }

  async getDeploymentInfo(
    organisationId: string,
    botId: string,
    userId: string,
  ): Promise<DeploymentInfo> {
    await this.ensureOrganisationMember(organisationId, userId);
    await this.ensureBotInOrganisation(organisationId, botId);

    const deployment = await this.prisma.botDeployment.findFirst({
      where: { organisationId, botId, environment: 'PRODUCTION' },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        currentVersion: { select: { versionNumber: true } },
      },
    });

    if (!deployment) {
      return {
        deploymentId: null,
        environment: 'production',
        status: null,
        currentVersionNumber: null,
        publishedAt: null,
        embedSnippet: null,
      };
    }

    return {
      deploymentId: deployment.id,
      environment: 'production',
      status: deployment.status === 'ACTIVE' ? 'active' : 'disabled',
      currentVersionNumber: deployment.currentVersion?.versionNumber ?? null,
      publishedAt: deployment.publishedAt?.toISOString() ?? null,
      embedSnippet: this.buildEmbedSnippet(deployment.id),
    };
  }

  private buildEmbedSnippet(deploymentId: string): string {
    const apiPublicUrl = this.configService.getOrThrow<string>('API_PUBLIC_URL');
    // /widget.js is a deliberately stable, unversioned public path — the
    // widget build itself is versioned by path internally
    // (dist/v1/botdock-widget.js, see apps/widget/vite.config.ts) so the
    // wire protocol can take a breaking v2 without customers ever touching
    // this snippet; whatever serves this route maps it to the current
    // version. `defer` (not `async`) so mountBotDockWidget() can always
    // rely on document.body existing by the time the script runs.
    return `<script src="${apiPublicUrl}/widget.js" data-deployment-id="${deploymentId}" defer></script>`;
  }

  private async ensureOrganisationMember(organisationId: string, userId: string) {
    const membership = await this.prisma.organisationMember.findUnique({
      where: { organisationId_userId: { organisationId, userId } },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organisation.');
    }
  }

  private async ensureBotInOrganisation(organisationId: string, botId: string) {
    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, organisationId },
      select: { id: true },
    });

    if (!bot) {
      throw new NotFoundException('Bot was not found.');
    }
  }

  private toResponse(domain: StoredAllowedDomain): AllowedDomainResponse {
    return {
      id: domain.id,
      botId: domain.botId,
      pattern: domain.pattern,
      createdAt: domain.createdAt.toISOString(),
    };
  }
}
