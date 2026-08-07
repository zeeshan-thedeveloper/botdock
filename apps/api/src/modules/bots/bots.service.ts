import {
  BadRequestException,
  ForbiddenException,
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
  CreateBotInput,
  ModelProvider,
  UpdateBotInput,
} from '@botdock/contracts';
import { PrismaService } from '../database/prisma.service.js';

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
  constructor(private readonly prisma: PrismaService) {}

  async listBots(organisationId: string, userId: string): Promise<BotsResponse> {
    await this.ensureOrganisationMember(organisationId, userId);

    const bots = await this.prisma.bot.findMany({
      where: { organisationId },
      orderBy: { updatedAt: 'desc' },
      select: this.botSelect(),
    });

    return { bots: bots.map((bot) => this.toResponse(bot)) };
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

    return this.toResponse(bot);
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

    return this.toResponse(bot);
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

  private toResponse(bot: StoredBot): BotResponse {
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
      createdAt: bot.createdAt.toISOString(),
      updatedAt: bot.updatedAt.toISOString(),
    };
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
