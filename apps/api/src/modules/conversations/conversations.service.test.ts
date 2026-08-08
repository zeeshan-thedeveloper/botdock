import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationsService } from './conversations.service.js';

const now = new Date('2026-08-08T00:00:00.000Z');
const startedAt = new Date('2026-08-07T23:50:00.000Z');

function createPrismaMock() {
  return {
    organisationMember: { findUnique: vi.fn() },
    conversation: { findMany: vi.fn(), findFirst: vi.fn() },
  };
}

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conv-1',
    botId: 'bot-1',
    source: 'WIDGET',
    visitorId: 'visitor_abc',
    lastMessageAt: now,
    bot: { name: 'Support Bot' },
    messages: [{ content: 'Thanks, that resolved it!' }],
    usageRecords: [{ promptTokens: 100, completionTokens: 20, estCostUsd: { toString: () => '0.002' } }],
    _count: { messages: 4 },
    ...overrides,
  };
}

describe('ConversationsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ConversationsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ConversationsService(prisma as never);
  });

  describe('listConversations', () => {
    it('blocks access when the user is not an organisation member', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue(null);

      await expect(service.listConversations('org-1', 'user-1', {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.conversation.findMany).not.toHaveBeenCalled();
    });

    it('excludes PLAYGROUND traffic by default', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
      prisma.conversation.findMany.mockResolvedValue([]);

      await service.listConversations('org-1', 'user-1', {});

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ source: { not: 'PLAYGROUND' } }),
        }),
      );
    });

    it('includes PLAYGROUND traffic when explicitly requested', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
      prisma.conversation.findMany.mockResolvedValue([]);

      await service.listConversations('org-1', 'user-1', { source: 'PLAYGROUND' });

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ source: 'PLAYGROUND' }) }),
      );
    });

    it('filters by botId and search when provided', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
      prisma.conversation.findMany.mockResolvedValue([]);

      await service.listConversations('org-1', 'user-1', { botId: 'bot-1', search: 'refund' });

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            botId: 'bot-1',
            messages: { some: { content: { contains: 'refund', mode: 'insensitive' } } },
          }),
        }),
      );
    });

    it('applies cursor pagination and reports nextCursor when there are more results', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
      const rows = Array.from({ length: 3 }, (_, i) => baseRow({ id: `conv-${i}` }));
      prisma.conversation.findMany.mockResolvedValue(rows);

      const result = await service.listConversations('org-1', 'user-1', { limit: 2, cursor: 'conv-x' });

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3, cursor: { id: 'conv-x' }, skip: 1 }),
      );
      expect(result.conversations).toHaveLength(2);
      expect(result.nextCursor).toBe('conv-1');
    });

    it('reports a null nextCursor when there are no more results', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
      prisma.conversation.findMany.mockResolvedValue([baseRow()]);

      const result = await service.listConversations('org-1', 'user-1', { limit: 25 });

      expect(result.nextCursor).toBeNull();
    });

    it('rolls up usage across multiple usage records', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
      prisma.conversation.findMany.mockResolvedValue([
        baseRow({
          usageRecords: [
            { promptTokens: 100, completionTokens: 20, estCostUsd: { toString: () => '0.002' } },
            { promptTokens: 50, completionTokens: 10, estCostUsd: { toString: () => '0.001' } },
          ],
        }),
      ]);

      const result = await service.listConversations('org-1', 'user-1', {});

      expect(result.conversations[0]?.usage).toEqual({
        promptTokens: 150,
        completionTokens: 30,
        estCostUsd: 0.003,
      });
    });

    it('truncates a long last-message preview and returns null when there are no messages', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
      prisma.conversation.findMany.mockResolvedValue([
        baseRow({ id: 'conv-long', messages: [{ content: 'x'.repeat(200) }] }),
        baseRow({ id: 'conv-empty', messages: [] }),
      ]);

      const result = await service.listConversations('org-1', 'user-1', {});

      expect(result.conversations[0]?.lastMessagePreview).toHaveLength(161);
      expect(result.conversations[0]?.lastMessagePreview?.endsWith('…')).toBe(true);
      expect(result.conversations[1]?.lastMessagePreview).toBeNull();
    });
  });

  describe('getConversation', () => {
    it('blocks access when the user is not an organisation member', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue(null);

      await expect(service.getConversation('org-1', 'user-1', 'conv-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.conversation.findFirst).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the conversation is outside the tenant scope', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
      prisma.conversation.findFirst.mockResolvedValue(null);

      await expect(service.getConversation('org-1', 'user-1', 'conv-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.conversation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'conv-x', organisationId: 'org-1' } }),
      );
    });

    it('returns the full transcript with citations and per-message usage', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
      prisma.conversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        botId: 'bot-1',
        source: 'WIDGET',
        visitorId: 'visitor_abc',
        startedAt,
        lastMessageAt: now,
        bot: { name: 'Support Bot' },
        messages: [
          {
            id: 'msg-1',
            role: 'USER',
            content: 'What is your return policy?',
            createdAt: startedAt,
            model: null,
            promptTokens: null,
            completionTokens: null,
            latencyMs: null,
            estCostUsd: null,
            sources: [],
          },
          {
            id: 'msg-2',
            role: 'ASSISTANT',
            content: 'You can return items within 30 days.',
            createdAt: now,
            model: 'gpt-4o-mini',
            promptTokens: 120,
            completionTokens: 18,
            latencyMs: 640,
            estCostUsd: { toString: () => '0.0021' },
            sources: [{ label: 'Return Policy', location: 'Section 1', score: 0.92, knowledgeSourceId: 'src-1' }],
          },
        ],
      });

      const result = await service.getConversation('org-1', 'user-1', 'conv-1');

      expect(result.botName).toBe('Support Bot');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[1]).toEqual({
        id: 'msg-2',
        role: 'ASSISTANT',
        content: 'You can return items within 30 days.',
        createdAt: now.toISOString(),
        model: 'gpt-4o-mini',
        promptTokens: 120,
        completionTokens: 18,
        latencyMs: 640,
        estCostUsd: 0.0021,
        citations: [{ label: 'Return Policy', location: 'Section 1', score: 0.92, knowledgeSourceId: 'src-1' }],
      });
      expect(result.messages[0]?.estCostUsd).toBeNull();
    });
  });
});
