import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Bot as BotResponse,
  BotBehaviorConfig,
  BotCitationStyle,
  BotRetrievalMode,
  BotResponseLength,
  BotsResponse,
  BotStats,
  CreateBotInput,
  ModelProvider,
  UpdateBotInput,
} from '@botdock/contracts';
import { Prisma } from '@botdock/database';
import { PrismaService } from '../database/prisma.service.js';

type MessageAggregateRow = {
  botId: string;
  messageCount: number;
  assistantMessageCount: number;
  citedMessageCount: number;
  ratedMessageCount: number;
  positiveMessageCount: number;
};

type StoredBot = {
  id: string;
  organisationId: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  initials: string | null;
  welcomeMessage: string;
  instructions: string;
  tone: string;
  handoffBehavior: string;
  providerCredentialId: string | null;
  model: string;
  temperature: number;
  responseLength: string;
  retrievalMode: string;
  maxSources: number;
  citationStyle: string;
  widgetTheme: string;
  widgetPosition: string;
  strictKnowledge: boolean;
  promptInjectionProtection: boolean;
  piiRedaction: boolean;
  collectFeedback: boolean;
  humanHandoff: boolean;
  createdAt: Date;
  updatedAt: Date;
  providerCredential: {
    provider: 'OPENAI' | 'ANTHROPIC';
    label: string;
    status: 'ACTIVE' | 'INVALID';
  } | null;
};

type ModelConfigInput = NonNullable<UpdateBotInput['modelConfig']>;
type BehaviorConfigInput = NonNullable<UpdateBotInput['behaviorConfig']>;

const defaultModelConfig: ModelConfigInput = {
  providerCredentialId: null,
  model: 'gpt-4o-mini',
  temperature: 0.35,
  responseLength: 'balanced',
  retrievalMode: 'hybrid',
  maxSources: 6,
  citationStyle: 'inline_source_chips',
};

const defaultBehaviorConfig: BehaviorConfigInput = {
  initials: '',
  welcomeMessage: "Hi! I'm here to help with orders, returns, and account questions.",
  instructions: `You are a customer support assistant for this account.
Answer only using the provided knowledge sources.
Be concise, friendly, and professional.
If policy details conflict, prefer the most recent source.
Escalate billing disputes, account access issues, and refund exceptions.`,
  tone: 'Friendly, precise, and calm',
  handoffBehavior: 'Escalate after low-confidence answer',
  widgetTheme: 'Dark system default',
  widgetPosition: 'Bottom right',
  strictKnowledge: true,
  promptInjectionProtection: true,
  piiRedaction: true,
  collectFeedback: true,
  humanHandoff: true,
};

@Injectable()
export class BotsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listBots(organisationId: string, userId: string): Promise<BotsResponse> {
    await this.ensureOrganisationMember(organisationId, userId);

    const bots = await this.prisma.bot.findMany({
      where: { organisationId },
      orderBy: { updatedAt: 'desc' },
      select: this.botSelect(),
    });

    const stats = await this.computeStats(
      organisationId,
      bots.map((bot) => bot.id),
    );

    return { bots: bots.map((bot) => this.toResponse(bot, stats.get(bot.id) ?? this.zeroStats())) };
  }

  async createBot(
    userId: string,
    input: CreateBotInput & {
      behaviorConfig?: BehaviorConfigInput;
      modelConfig?: ModelConfigInput;
    },
  ) {
    const organisationId = input.organisationId.trim();
    await this.ensureOrganisationMember(organisationId, userId);

    const modelConfig = input.modelConfig ?? defaultModelConfig;
    const behaviorConfig = input.behaviorConfig ?? {
      ...defaultBehaviorConfig,
      initials: this.getInitials(input.name),
    };
    await this.ensureActiveCredential(organisationId, modelConfig.providerCredentialId);

    const bot = await this.prisma.bot.create({
      data: {
        organisationId,
        createdById: userId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        ...this.toBehaviorConfigData(behaviorConfig),
        ...this.toModelConfigData(modelConfig),
      },
      select: this.botSelect(),
    });

    return this.toResponse(bot, this.zeroStats());
  }

  async updateBot(
    organisationId: string,
    userId: string,
    botId: string,
    input: UpdateBotInput,
  ): Promise<BotResponse> {
    await this.ensureOrganisationMember(organisationId, userId);

    const existingBot = await this.prisma.bot.findFirst({
      where: { id: botId, organisationId },
      select: { id: true },
    });

    if (!existingBot) {
      throw new NotFoundException('Bot was not found.');
    }

    if (input.modelConfig) {
      await this.ensureActiveCredential(organisationId, input.modelConfig.providerCredentialId);
    }

    const bot = await this.prisma.bot.update({
      where: { id: botId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
        ...(input.behaviorConfig ? this.toBehaviorConfigData(input.behaviorConfig) : {}),
        ...(input.modelConfig ? this.toModelConfigData(input.modelConfig) : {}),
      },
      select: this.botSelect(),
    });

    const stats = (await this.computeStats(organisationId, [botId])).get(botId) ?? this.zeroStats();
    return this.toResponse(bot, stats);
  }

  async publishBot(organisationId: string, userId: string, botId: string): Promise<BotResponse> {
    await this.ensureOrganisationMember(organisationId, userId);

    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, organisationId },
      select: this.botSelect(),
    });

    if (!bot) {
      throw new NotFoundException('Bot was not found.');
    }

    const configSnapshot = this.toConfigSnapshot(bot);
    const publishedAt = new Date();

    const updatedBot = await this.prisma.$transaction(async (tx) => {
      const lastVersion = await tx.botVersion.findFirst({
        where: { botId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });
      const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

      const version = await tx.botVersion.create({
        data: {
          id: `ver_${randomUUID()}`,
          organisationId,
          botId,
          versionNumber,
          configSnapshot,
          publishedById: userId,
        },
      });

      await tx.botDeployment.upsert({
        where: { botId_environment: { botId, environment: 'PRODUCTION' } },
        create: {
          id: `dep_${randomUUID()}`,
          organisationId,
          botId,
          environment: 'PRODUCTION',
          currentVersionId: version.id,
          publishedAt,
        },
        update: {
          currentVersionId: version.id,
          publishedAt,
          status: 'ACTIVE',
        },
      });

      return tx.bot.update({
        where: { id: botId },
        data: { status: 'PUBLISHED' },
        select: this.botSelect(),
      });
    });

    const stats = (await this.computeStats(organisationId, [botId])).get(botId) ?? this.zeroStats();
    return this.toResponse(updatedBot, stats);
  }

  private toConfigSnapshot(bot: StoredBot): Prisma.InputJsonValue {
    return {
      name: bot.name,
      description: bot.description,
      initials: bot.initials,
      welcomeMessage: bot.welcomeMessage,
      instructions: bot.instructions,
      tone: bot.tone,
      handoffBehavior: bot.handoffBehavior,
      providerCredentialId: bot.providerCredentialId,
      model: bot.model,
      temperature: bot.temperature,
      responseLength: bot.responseLength,
      retrievalMode: bot.retrievalMode,
      maxSources: bot.maxSources,
      citationStyle: bot.citationStyle,
      widgetTheme: bot.widgetTheme,
      widgetPosition: bot.widgetPosition,
      strictKnowledge: bot.strictKnowledge,
      promptInjectionProtection: bot.promptInjectionProtection,
      piiRedaction: bot.piiRedaction,
      collectFeedback: bot.collectFeedback,
      humanHandoff: bot.humanHandoff,
    };
  }

  private async ensureOrganisationMember(organisationId: string, userId: string) {
    const membership = await this.prisma.organisationMember.findUnique({
      where: {
        organisationId_userId: {
          organisationId,
          userId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organisation.');
    }
  }

  private async ensureActiveCredential(
    organisationId: string,
    providerCredentialId: string | null,
  ) {
    if (!providerCredentialId) {
      return;
    }

    const credential = await this.prisma.providerCredential.findFirst({
      where: {
        id: providerCredentialId,
        organisationId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (!credential) {
      throw new BadRequestException('Select an active provider credential for this workspace.');
    }
  }

  private toModelConfigData(modelConfig: ModelConfigInput) {
    return {
      providerCredentialId: modelConfig.providerCredentialId,
      model: modelConfig.model.trim(),
      temperature: modelConfig.temperature,
      responseLength: modelConfig.responseLength,
      retrievalMode: modelConfig.retrievalMode,
      maxSources: modelConfig.maxSources,
      citationStyle: modelConfig.citationStyle,
    };
  }

  private toBehaviorConfigData(behaviorConfig: BehaviorConfigInput) {
    return {
      initials: behaviorConfig.initials.trim().toUpperCase() || null,
      welcomeMessage: behaviorConfig.welcomeMessage,
      instructions: behaviorConfig.instructions,
      tone: behaviorConfig.tone,
      handoffBehavior: behaviorConfig.handoffBehavior,
      widgetTheme: behaviorConfig.widgetTheme,
      widgetPosition: behaviorConfig.widgetPosition,
      strictKnowledge: behaviorConfig.strictKnowledge,
      promptInjectionProtection: behaviorConfig.promptInjectionProtection,
      piiRedaction: behaviorConfig.piiRedaction,
      collectFeedback: behaviorConfig.collectFeedback,
      humanHandoff: behaviorConfig.humanHandoff,
    };
  }

  private toResponse(bot: StoredBot, stats: BotStats): BotResponse {
    const activeCredential =
      bot.providerCredential?.status === 'ACTIVE' ? bot.providerCredential : null;

    return {
      id: bot.id,
      organisationId: bot.organisationId,
      name: bot.name,
      description: bot.description,
      status: this.toResponseStatus(bot.status),
      behaviorConfig: this.toBehaviorConfig(bot),
      modelConfig: {
        providerCredentialId: activeCredential ? bot.providerCredentialId : null,
        provider: activeCredential ? this.toResponseProvider(activeCredential.provider) : null,
        credentialLabel: activeCredential?.label ?? null,
        model: bot.model,
        temperature: bot.temperature,
        responseLength: this.toResponseLength(bot.responseLength),
        retrievalMode: this.toRetrievalMode(bot.retrievalMode),
        maxSources: bot.maxSources,
        citationStyle: this.toCitationStyle(bot.citationStyle),
      },
      stats,
      createdAt: bot.createdAt.toISOString(),
      updatedAt: bot.updatedAt.toISOString(),
    };
  }

  private zeroStats(): BotStats {
    return {
      conversationCount: 0,
      messageCount: 0,
      estCostUsd: 0,
      knowledgeSourceCount: 0,
      readyKnowledgeSourceCount: 0,
      totalIndexedChunks: 0,
      allowedDomainCount: 0,
      citationCoverage: null,
      positiveFeedbackRate: null,
    };
  }

  /** Batched, real aggregates — never a fabricated fallback number. */
  private async computeStats(organisationId: string, botIds: string[]): Promise<Map<string, BotStats>> {
    const stats = new Map<string, BotStats>();
    if (botIds.length === 0) {
      return stats;
    }

    const [conversationCounts, costSums, knowledgeGroups, domainCounts, messageAggregates] = await Promise.all([
      this.prisma.conversation.groupBy({
        by: ['botId'],
        where: { organisationId, botId: { in: botIds } },
        _count: { _all: true },
      }),
      this.prisma.usageRecord.groupBy({
        by: ['botId'],
        where: { organisationId, botId: { in: botIds } },
        _sum: { estCostUsd: true },
      }),
      this.prisma.knowledgeSource.groupBy({
        by: ['botId', 'status'],
        where: { organisationId, botId: { in: botIds } },
        _count: { _all: true },
        _sum: { chunkCount: true },
      }),
      this.prisma.allowedDomain.groupBy({
        by: ['botId'],
        where: { organisationId, botId: { in: botIds } },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<MessageAggregateRow[]>`
        SELECT
          c."botId" AS "botId",
          COUNT(*)::int AS "messageCount",
          COUNT(*) FILTER (WHERE m.role = 'ASSISTANT')::int AS "assistantMessageCount",
          COUNT(*) FILTER (
            WHERE m.role = 'ASSISTANT' AND EXISTS (
              SELECT 1 FROM "message_sources" ms WHERE ms."messageId" = m.id
            )
          )::int AS "citedMessageCount",
          COUNT(*) FILTER (WHERE m.feedback IS NOT NULL)::int AS "ratedMessageCount",
          COUNT(*) FILTER (WHERE m.feedback = 'UP')::int AS "positiveMessageCount"
        FROM "messages" m
        JOIN "conversations" c ON c.id = m."conversationId"
        WHERE c."organisationId" = ${organisationId} AND c."botId" IN (${Prisma.join(botIds)})
        GROUP BY c."botId"
      `,
    ]);

    for (const botId of botIds) {
      stats.set(botId, this.zeroStats());
    }

    for (const row of conversationCounts) {
      const entry = stats.get(row.botId);
      if (entry) entry.conversationCount = row._count._all;
    }

    for (const row of costSums) {
      const entry = stats.get(row.botId);
      if (entry) entry.estCostUsd = Number(row._sum.estCostUsd ?? 0);
    }

    for (const row of knowledgeGroups) {
      const entry = stats.get(row.botId);
      if (!entry) continue;
      entry.knowledgeSourceCount += row._count._all;
      if (row.status === 'READY') {
        entry.readyKnowledgeSourceCount += row._count._all;
        entry.totalIndexedChunks += row._sum.chunkCount ?? 0;
      }
    }

    for (const row of domainCounts) {
      const entry = stats.get(row.botId);
      if (entry) entry.allowedDomainCount = row._count._all;
    }

    for (const row of messageAggregates) {
      const entry = stats.get(row.botId);
      if (!entry) continue;
      entry.messageCount = row.messageCount;
      entry.citationCoverage =
        row.assistantMessageCount > 0 ? row.citedMessageCount / row.assistantMessageCount : null;
      entry.positiveFeedbackRate =
        row.ratedMessageCount > 0 ? row.positiveMessageCount / row.ratedMessageCount : null;
    }

    return stats;
  }

  private toBehaviorConfig(bot: StoredBot): BotBehaviorConfig {
    return {
      initials: bot.initials ?? this.getInitials(bot.name),
      welcomeMessage: bot.welcomeMessage,
      instructions: bot.instructions,
      tone: bot.tone,
      handoffBehavior: bot.handoffBehavior,
      widgetTheme: bot.widgetTheme,
      widgetPosition: bot.widgetPosition,
      strictKnowledge: bot.strictKnowledge,
      promptInjectionProtection: bot.promptInjectionProtection,
      piiRedaction: bot.piiRedaction,
      collectFeedback: bot.collectFeedback,
      humanHandoff: bot.humanHandoff,
    };
  }

  private getInitials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 3)
      .toUpperCase();
  }

  private toResponseProvider(provider: 'OPENAI' | 'ANTHROPIC'): ModelProvider {
    if (provider === 'OPENAI') {
      return 'openai';
    }

    throw new BadRequestException('Provider is not supported.');
  }

  private toResponseStatus(status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') {
    if (status === 'PUBLISHED') {
      return 'published' as const;
    }

    if (status === 'ARCHIVED') {
      return 'archived' as const;
    }

    return 'draft' as const;
  }

  private toResponseLength(value: string): BotResponseLength {
    return value === 'brief' || value === 'detailed' ? value : 'balanced';
  }

  private toRetrievalMode(value: string): BotRetrievalMode {
    if (value === 'semantic' || value === 'keyword') {
      return value;
    }

    return 'hybrid';
  }

  private toCitationStyle(value: string): BotCitationStyle {
    if (value === 'footer_source_list' || value === 'hidden') {
      return value;
    }

    return 'inline_source_chips';
  }

  private botSelect() {
    return {
      id: true,
      organisationId: true,
      name: true,
      description: true,
      status: true,
      initials: true,
      welcomeMessage: true,
      instructions: true,
      tone: true,
      handoffBehavior: true,
      providerCredentialId: true,
      model: true,
      temperature: true,
      responseLength: true,
      retrievalMode: true,
      maxSources: true,
      citationStyle: true,
      widgetTheme: true,
      widgetPosition: true,
      strictKnowledge: true,
      promptInjectionProtection: true,
      piiRedaction: true,
      collectFeedback: true,
      humanHandoff: true,
      createdAt: true,
      updatedAt: true,
      providerCredential: {
        select: {
          provider: true,
          label: true,
          status: true,
        },
      },
    } as const;
  }
}
