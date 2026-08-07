import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { ChatStreamEvent } from '@botdock/contracts';
import {
  ProviderAuthError,
  ProviderNetworkError,
  ProviderRateLimitError,
  ProviderUpstreamError,
} from '@botdock/ai-core';
import { AiProviderFactory } from '../ai/ai-provider.factory.js';
import { ProviderNotConfiguredError } from '../ai/ai.errors.js';
import { PrismaService } from '../database/prisma.service.js';
import { RetrievalService } from '../knowledge/retrieval.service.js';
import { buildPrompt } from './prompt.builder.js';
import type { ChatRunInput } from './chat.types.js';

type ResolvedBot = {
  id: string;
  instructions: string;
  model: string;
  temperature: number;
  maxSources: number;
  strictKnowledge: boolean;
  providerCredentialId: string | null;
  providerCredential: { status: 'ACTIVE' | 'INVALID' } | null;
};

/** Shape written by BotsService.toConfigSnapshot (DEPLOY-001) — trusted, not runtime-validated. */
type BotConfigSnapshot = {
  instructions: string;
  model: string;
  temperature: number;
  maxSources: number;
  strictKnowledge: boolean;
  providerCredentialId: string | null;
};

@Injectable()
export class ChatService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AiProviderFactory) private readonly aiProviderFactory: AiProviderFactory,
    @Inject(RetrievalService) private readonly retrievalService: RetrievalService,
  ) {}

  async *runChat(input: ChatRunInput): AsyncIterable<ChatStreamEvent> {
    const requestId = randomUUID();

    const bot = await this.resolveBot(input);
    if (!bot) {
      yield { type: 'error', code: 'bot_not_found', message: 'Bot was not found.' };
      return;
    }

    if (!bot.providerCredentialId || bot.providerCredential?.status !== 'ACTIVE') {
      yield {
        type: 'error',
        code: 'no_provider_key',
        message: 'Connect an active provider key for this bot before chatting.',
      };
      return;
    }

    const conversation = await this.resolveConversation(input, bot.id);
    if (!conversation) {
      yield {
        type: 'error',
        code: 'conversation_not_found',
        message: 'That conversation was not found.',
      };
      return;
    }

    const history = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });

    await this.prisma.message.create({
      data: { conversationId: conversation.id, role: 'USER', content: input.userMessage },
    });

    const retrieval = await this.retrievalService.retrieve({
      organisationId: input.organisationId,
      botId: bot.id,
      query: input.userMessage,
      topK: bot.maxSources,
    });

    const promptResult = buildPrompt({
      instructions: bot.instructions,
      strictKnowledge: bot.strictKnowledge,
      history: history.map((message) => ({
        role: message.role === 'USER' ? ('USER' as const) : ('ASSISTANT' as const),
        content: message.content,
      })),
      userMessage: input.userMessage,
      chunks: retrieval.chunks,
      hasRelevantKnowledge: retrieval.hasRelevantKnowledge,
    });

    if (input.debug) {
      yield {
        type: 'trace',
        requestId,
        model: bot.model,
        contextTokens: promptResult.kind === 'prompt' ? promptResult.contextTokens : 0,
        retrievedChunks: retrieval.chunks.map((chunk) => ({
          label: this.chunkLabel(chunk),
          score: chunk.score,
        })),
        promptPreview:
          promptResult.kind === 'prompt' ? promptResult.promptPreview : '(fallback — no model call)',
      };
    }

    if (promptResult.kind === 'fallback') {
      yield { type: 'token', delta: promptResult.message };

      const assistantMessage = await this.prisma.message.create({
        data: { conversationId: conversation.id, role: 'ASSISTANT', content: promptResult.message },
      });

      await this.touchConversation(conversation.id);
      yield { type: 'done', conversationId: conversation.id, messageId: assistantMessage.id };
      return;
    }

    let chatProvider;
    try {
      chatProvider = await this.aiProviderFactory.getChatProvider({
        organisationId: input.organisationId,
        providerCredentialId: bot.providerCredentialId,
      });
    } catch (error) {
      yield this.toErrorEvent(error);
      return;
    }

    let content = '';
    let usageMetadata: Record<string, string | number> = {};
    let aborted = false;
    let errorEvent: ChatStreamEvent | null = null;

    try {
      for await (const chunk of chatProvider.streamChat({
        model: bot.model,
        messages: promptResult.messages,
        temperature: bot.temperature,
        signal: input.signal,
      })) {
        if (chunk.type === 'content' && chunk.content) {
          content += chunk.content;
          yield { type: 'token', delta: chunk.content };
        } else if (chunk.type === 'metadata' && chunk.metadata) {
          usageMetadata = chunk.metadata;
        }
      }
    } catch (error) {
      if (input.signal?.aborted) {
        aborted = true;
      } else {
        errorEvent = this.toErrorEvent(error);
        yield errorEvent;
      }
    }

    // ai-core's providers stop gracefully (no thrown error) on abort, so the
    // catch above may never run even though generation really was cancelled.
    if (input.signal?.aborted) {
      aborted = true;
    }

    if (promptResult.usedChunks.length > 0) {
      yield {
        type: 'citation',
        sources: promptResult.usedChunks.map((chunk) => ({
          label: this.chunkLabel(chunk),
          location: this.chunkLocation(chunk),
          score: chunk.score,
          knowledgeSourceId: chunk.knowledgeSourceId,
        })),
      };
    }

    const promptTokens = Number(usageMetadata.promptTokens ?? 0);
    const completionTokens = Number(usageMetadata.completionTokens ?? 0);
    const latencyMs = Number(usageMetadata.latencyMs ?? 0);
    const estCostUsd = Number(usageMetadata.estCostUsd ?? 0);

    if (!aborted && !errorEvent) {
      yield { type: 'usage', promptTokens, completionTokens, latencyMs, estCostUsd };
    }

    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content,
        model: bot.model,
        promptTokens,
        completionTokens,
        latencyMs,
        estCostUsd,
      },
    });

    if (promptResult.usedChunks.length > 0) {
      await this.prisma.messageSource.createMany({
        data: promptResult.usedChunks.map((chunk) => ({
          messageId: assistantMessage.id,
          knowledgeSourceId: chunk.knowledgeSourceId,
          documentChunkId: chunk.chunkId,
          label: this.chunkLabel(chunk),
          location: this.chunkLocation(chunk),
          score: chunk.score,
        })),
      });
    }

    if (!aborted && !errorEvent) {
      // Only a real completion has meaningful usage numbers to bill/track.
      await this.prisma.usageRecord.create({
        data: {
          organisationId: input.organisationId,
          botId: bot.id,
          conversationId: conversation.id,
          messageId: assistantMessage.id,
          provider: 'openai',
          model: bot.model,
          promptTokens,
          completionTokens,
          latencyMs,
          estCostUsd,
          source: input.source,
        },
      });
    }

    await this.touchConversation(conversation.id);

    if (!aborted && !errorEvent) {
      yield { type: 'done', conversationId: conversation.id, messageId: assistantMessage.id };
    }
  }

  private async resolveBot(input: ChatRunInput): Promise<ResolvedBot | null> {
    if (input.configVersion === 'published') {
      return this.resolvePublishedBot(input);
    }

    return this.prisma.bot.findFirst({
      where: { id: input.botId, organisationId: input.organisationId },
      select: {
        id: true,
        instructions: true,
        model: true,
        temperature: true,
        maxSources: true,
        strictKnowledge: true,
        providerCredentialId: true,
        providerCredential: { select: { status: true } },
      },
    });
  }

  private async resolvePublishedBot(input: ChatRunInput): Promise<ResolvedBot | null> {
    const deployment = await this.prisma.botDeployment.findFirst({
      where: {
        botId: input.botId,
        organisationId: input.organisationId,
        environment: 'PRODUCTION',
        status: 'ACTIVE',
      },
      select: {
        currentVersion: { select: { configSnapshot: true } },
      },
    });

    if (!deployment?.currentVersion) {
      return null;
    }

    const snapshot = deployment.currentVersion.configSnapshot as unknown as BotConfigSnapshot;

    // Credential status must be re-checked live — it may have been revoked
    // since this version was published, and the snapshot only carries the id.
    const providerCredential = snapshot.providerCredentialId
      ? await this.prisma.providerCredential.findUnique({
          where: { id: snapshot.providerCredentialId },
          select: { status: true },
        })
      : null;

    return {
      id: input.botId,
      instructions: snapshot.instructions,
      model: snapshot.model,
      temperature: snapshot.temperature,
      maxSources: snapshot.maxSources,
      strictKnowledge: snapshot.strictKnowledge,
      providerCredentialId: snapshot.providerCredentialId,
      providerCredential,
    };
  }

  private async resolveConversation(input: ChatRunInput, botId: string) {
    if (input.conversationId) {
      return this.prisma.conversation.findFirst({
        where: { id: input.conversationId, organisationId: input.organisationId, botId },
      });
    }

    return this.prisma.conversation.create({
      data: { organisationId: input.organisationId, botId, source: input.source },
    });
  }

  private async touchConversation(conversationId: string) {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });
  }

  private chunkLabel(chunk: { metadata: Record<string, unknown> }): string {
    const sourceName = chunk.metadata.sourceName;
    return typeof sourceName === 'string' && sourceName.length > 0 ? sourceName : 'Knowledge source';
  }

  private chunkLocation(chunk: { metadata: Record<string, unknown> }): string | null {
    const fileName = chunk.metadata.documentFileName;
    return typeof fileName === 'string' && fileName.length > 0 ? fileName : null;
  }

  private toErrorEvent(error: unknown): ChatStreamEvent {
    if (error instanceof ProviderAuthError || error instanceof ProviderNotConfiguredError) {
      return {
        type: 'error',
        code: 'provider_auth_error',
        message: 'The connected provider key is invalid. Reconnect it and try again.',
      };
    }

    if (error instanceof ProviderRateLimitError) {
      return {
        type: 'error',
        code: 'provider_rate_limited',
        message: 'The model provider is rate-limiting requests. Please try again shortly.',
      };
    }

    if (error instanceof ProviderUpstreamError) {
      return {
        type: 'error',
        code: 'provider_upstream_error',
        message: 'The model provider is temporarily unavailable. Please try again shortly.',
      };
    }

    if (error instanceof ProviderNetworkError) {
      return {
        type: 'error',
        code: 'provider_network_error',
        message: 'Could not reach the model provider. Please try again.',
      };
    }

    return {
      type: 'error',
      code: 'internal_error',
      message: 'Something went wrong generating a response.',
    };
  }
}
