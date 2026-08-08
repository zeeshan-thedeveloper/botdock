import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ActivityTimeseriesResponse,
  ConversationDetailResponse,
  ConversationsListResponse,
  ConversationUsageSummary,
  MessageFeedback,
  MessageFeedbackResponse,
} from '@botdock/contracts';
import { PrismaService } from '../database/prisma.service.js';
import type { ListConversationsQueryDto } from './conversations.dto.js';

function toStoredFeedback(feedback: MessageFeedback | null): 'UP' | 'DOWN' | null {
  if (feedback === 'up') return 'UP';
  if (feedback === 'down') return 'DOWN';
  return null;
}

function toResponseFeedback(feedback: 'UP' | 'DOWN' | null): MessageFeedback | null {
  if (feedback === 'UP') return 'up';
  if (feedback === 'DOWN') return 'down';
  return null;
}

const DEFAULT_LIST_LIMIT = 25;
const PREVIEW_MAX_LENGTH = 160;

@Injectable()
export class ConversationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listConversations(
    organisationId: string,
    userId: string,
    query: ListConversationsQueryDto,
  ): Promise<ConversationsListResponse> {
    await this.ensureOrganisationMember(organisationId, userId);

    const limit = query.limit ?? DEFAULT_LIST_LIMIT;

    const conversations = await this.prisma.conversation.findMany({
      where: {
        organisationId,
        ...(query.botId ? { botId: query.botId } : {}),
        // Playground traffic is test traffic, not product analytics — excluded
        // by default, only included when explicitly requested.
        source: query.source ?? { not: 'PLAYGROUND' },
        ...(query.search
          ? { messages: { some: { content: { contains: query.search, mode: 'insensitive' } } } }
          : {}),
      },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        botId: true,
        source: true,
        visitorId: true,
        lastMessageAt: true,
        bot: { select: { name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true },
        },
        usageRecords: {
          select: { promptTokens: true, completionTokens: true, estCostUsd: true },
        },
        _count: { select: { messages: true } },
      },
    });

    const hasMore = conversations.length > limit;
    const page = hasMore ? conversations.slice(0, limit) : conversations;
    const lastRow = page.at(-1);

    return {
      conversations: page.map((conversation) => ({
        id: conversation.id,
        botId: conversation.botId,
        botName: conversation.bot.name,
        source: conversation.source,
        visitorId: conversation.visitorId,
        messageCount: conversation._count.messages,
        lastMessagePreview: this.buildPreview(conversation.messages[0]?.content),
        lastMessageAt: conversation.lastMessageAt.toISOString(),
        usage: this.rollUpUsage(conversation.usageRecords),
      })),
      nextCursor: hasMore && lastRow ? lastRow.id : null,
    };
  }

  async getConversation(
    organisationId: string,
    userId: string,
    conversationId: string,
  ): Promise<ConversationDetailResponse> {
    await this.ensureOrganisationMember(organisationId, userId);

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organisationId },
      select: {
        id: true,
        botId: true,
        source: true,
        visitorId: true,
        startedAt: true,
        lastMessageAt: true,
        bot: { select: { name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
            model: true,
            promptTokens: true,
            completionTokens: true,
            latencyMs: true,
            estCostUsd: true,
            feedback: true,
            sources: {
              select: { label: true, location: true, score: true, knowledgeSourceId: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation was not found.');
    }

    return {
      id: conversation.id,
      botId: conversation.botId,
      botName: conversation.bot.name,
      source: conversation.source,
      visitorId: conversation.visitorId,
      startedAt: conversation.startedAt.toISOString(),
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        model: message.model,
        promptTokens: message.promptTokens,
        completionTokens: message.completionTokens,
        latencyMs: message.latencyMs,
        estCostUsd: message.estCostUsd ? Number(message.estCostUsd) : null,
        citations: message.sources,
        feedback: toResponseFeedback(message.feedback),
      })),
    };
  }

  async setMessageFeedback(
    organisationId: string,
    userId: string,
    conversationId: string,
    messageId: string,
    feedback: MessageFeedback | null,
  ): Promise<MessageFeedbackResponse> {
    await this.ensureOrganisationMember(organisationId, userId);

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organisationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation was not found.');
    }

    const result = await this.prisma.message.updateMany({
      where: { id: messageId, conversationId, role: 'ASSISTANT' },
      data: { feedback: toStoredFeedback(feedback) },
    });

    if (result.count === 0) {
      throw new NotFoundException('Message was not found in this conversation.');
    }

    return { messageId, feedback };
  }

  /** Real, zero-filled daily counts for the last 30 days — excludes PLAYGROUND traffic, same convention as listConversations. */
  async getActivityTimeseries(
    organisationId: string,
    userId: string,
  ): Promise<ActivityTimeseriesResponse> {
    await this.ensureOrganisationMember(organisationId, userId);

    const rows = await this.prisma.$queryRaw<{ day: Date; conversations: number; messages: number }[]>`
      SELECT
        d::date AS day,
        COALESCE(conv.count, 0)::int AS conversations,
        COALESCE(msg.count, 0)::int AS messages
      FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') AS d
      LEFT JOIN (
        SELECT date_trunc('day', "startedAt") AS day, COUNT(*) AS count
        FROM "conversations"
        WHERE "organisationId" = ${organisationId} AND source != 'PLAYGROUND'
        GROUP BY 1
      ) conv ON conv.day = d
      LEFT JOIN (
        SELECT date_trunc('day', m."createdAt") AS day, COUNT(*) AS count
        FROM "messages" m
        JOIN "conversations" c ON c.id = m."conversationId"
        WHERE c."organisationId" = ${organisationId} AND c.source != 'PLAYGROUND'
        GROUP BY 1
      ) msg ON msg.day = d
      ORDER BY d
    `;

    return {
      days: rows.map((row) => ({
        date: row.day.toISOString().slice(0, 10),
        conversations: row.conversations,
        messages: row.messages,
      })),
    };
  }

  private buildPreview(content: string | undefined): string | null {
    if (!content) return null;
    return content.length > PREVIEW_MAX_LENGTH ? `${content.slice(0, PREVIEW_MAX_LENGTH)}…` : content;
  }

  private rollUpUsage(
    records: { promptTokens: number; completionTokens: number; estCostUsd: { toString(): string } }[],
  ): ConversationUsageSummary {
    return records.reduce<ConversationUsageSummary>(
      (acc, record) => ({
        promptTokens: acc.promptTokens + record.promptTokens,
        completionTokens: acc.completionTokens + record.completionTokens,
        estCostUsd: acc.estCostUsd + Number(record.estCostUsd),
      }),
      { promptTokens: 0, completionTokens: 0, estCostUsd: 0 },
    );
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
}
