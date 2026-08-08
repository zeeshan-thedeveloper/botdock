import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RetrievalService } from './retrieval.service.js';

function createPrismaMock() {
  return {
    bot: { findFirst: vi.fn() },
    knowledgeSource: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  };
}

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'chunk-1',
    documentId: 'doc-1',
    knowledgeSourceId: 'source-1',
    content: 'Refunds are available within 30 days.',
    metadata: { sourceName: 'Refund policy', chunkIndex: 0 },
    score: 0.42,
    ...overrides,
  };
}

describe('RetrievalService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let aiProviderFactory: { getEmbeddingProvider: ReturnType<typeof vi.fn> };
  let service: RetrievalService;

  beforeEach(() => {
    prisma = createPrismaMock();
    aiProviderFactory = { getEmbeddingProvider: vi.fn() };
    service = new RetrievalService(prisma as never, aiProviderFactory as never);
  });

  it('returns empty results for a blank query without touching the database', async () => {
    const result = await service.retrieve({ organisationId: 'org-1', botId: 'bot-1', query: '   ' });

    expect(result).toEqual({ chunks: [], hasRelevantKnowledge: false });
    expect(prisma.bot.findFirst).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the bot is outside the tenant scope', async () => {
    prisma.bot.findFirst.mockResolvedValue(null);

    await expect(
      service.retrieve({ organisationId: 'org-1', botId: 'bot-x', query: 'refund policy' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns empty cleanly when the bot has no connected provider credential', async () => {
    prisma.bot.findFirst.mockResolvedValue({ providerCredentialId: null });

    const result = await service.retrieve({ organisationId: 'org-1', botId: 'bot-1', query: 'refunds' });

    expect(result).toEqual({ chunks: [], hasRelevantKnowledge: false });
    expect(aiProviderFactory.getEmbeddingProvider).not.toHaveBeenCalled();
  });

  it('returns empty cleanly when the bot has no READY knowledge sources', async () => {
    prisma.bot.findFirst.mockResolvedValue({ providerCredentialId: 'cred-1' });
    prisma.knowledgeSource.findMany.mockResolvedValue([]);

    const result = await service.retrieve({ organisationId: 'org-1', botId: 'bot-1', query: 'refunds' });

    expect(result).toEqual({ chunks: [], hasRelevantKnowledge: false });
    expect(aiProviderFactory.getEmbeddingProvider).not.toHaveBeenCalled();
  });

  it('embeds the query, searches tenant+model-scoped chunks, and returns relevant results', async () => {
    prisma.bot.findFirst.mockResolvedValue({ providerCredentialId: 'cred-1' });
    prisma.knowledgeSource.findMany.mockResolvedValue([{ embeddingModel: 'text-embedding-3-small' }]);
    const generateEmbeddings = vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]);
    aiProviderFactory.getEmbeddingProvider.mockResolvedValue({ generateEmbeddings });
    prisma.$queryRaw.mockResolvedValue([row({ score: 0.6 })]);

    const result = await service.retrieve({
      organisationId: 'org-1',
      botId: 'bot-1',
      query: '  what is the refund policy?  ',
    });

    expect(aiProviderFactory.getEmbeddingProvider).toHaveBeenCalledWith({
      organisationId: 'org-1',
      providerCredentialId: 'cred-1',
      model: 'text-embedding-3-small',
    });
    expect(generateEmbeddings).toHaveBeenCalledWith(['what is the refund policy?']);

    const rawCallValues = prisma.$queryRaw.mock.calls[0]!.slice(1);
    expect(rawCallValues).toContain('org-1');
    expect(rawCallValues).toContain('bot-1');
    expect(rawCallValues).toContain('text-embedding-3-small');
    expect(rawCallValues).toContain('[0.1,0.2,0.3]');

    expect(result.hasRelevantKnowledge).toBe(true);
    expect(result.chunks).toEqual([
      {
        chunkId: 'chunk-1',
        documentId: 'doc-1',
        knowledgeSourceId: 'source-1',
        content: 'Refunds are available within 30 days.',
        score: 0.6,
        metadata: { sourceName: 'Refund policy', chunkIndex: 0 },
      },
    ]);
  });

  it('filters out chunks below the relevance floor and reports no relevant knowledge', async () => {
    prisma.bot.findFirst.mockResolvedValue({ providerCredentialId: 'cred-1' });
    prisma.knowledgeSource.findMany.mockResolvedValue([{ embeddingModel: 'text-embedding-3-small' }]);
    aiProviderFactory.getEmbeddingProvider.mockResolvedValue({
      generateEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    });
    prisma.$queryRaw.mockResolvedValue([row({ score: 0.05 })]);

    const result = await service.retrieve({ organisationId: 'org-1', botId: 'bot-1', query: 'unrelated topic' });

    expect(result).toEqual({ chunks: [], hasRelevantKnowledge: false });
  });

  it('clamps an oversized topK to the configured maximum', async () => {
    prisma.bot.findFirst.mockResolvedValue({ providerCredentialId: 'cred-1' });
    prisma.knowledgeSource.findMany.mockResolvedValue([{ embeddingModel: 'text-embedding-3-small' }]);
    aiProviderFactory.getEmbeddingProvider.mockResolvedValue({
      generateEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    });
    prisma.$queryRaw.mockResolvedValue([]);

    await service.retrieve({ organisationId: 'org-1', botId: 'bot-1', query: 'refunds', topK: 999 });

    const rawCallValues = prisma.$queryRaw.mock.calls[0]!.slice(1);
    expect(rawCallValues).toContain(12);
    expect(rawCallValues).not.toContain(999);
  });

  it('merges and re-sorts results across multiple distinct embedding models', async () => {
    prisma.bot.findFirst.mockResolvedValue({ providerCredentialId: 'cred-1' });
    prisma.knowledgeSource.findMany.mockResolvedValue([
      { embeddingModel: 'text-embedding-3-small' },
      { embeddingModel: 'text-embedding-3-large' },
    ]);
    aiProviderFactory.getEmbeddingProvider.mockResolvedValue({
      generateEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    });
    prisma.$queryRaw
      .mockResolvedValueOnce([row({ id: 'chunk-low', score: 0.2 })])
      .mockResolvedValueOnce([row({ id: 'chunk-high', score: 0.9 })]);

    const result = await service.retrieve({ organisationId: 'org-1', botId: 'bot-1', query: 'refunds' });

    expect(aiProviderFactory.getEmbeddingProvider).toHaveBeenCalledTimes(2);
    expect(result.chunks.map((chunk) => chunk.chunkId)).toEqual(['chunk-high', 'chunk-low']);
  });

  it('caps combined chunk content by the context character budget', async () => {
    prisma.bot.findFirst.mockResolvedValue({ providerCredentialId: 'cred-1' });
    prisma.knowledgeSource.findMany.mockResolvedValue([{ embeddingModel: 'text-embedding-3-small' }]);
    aiProviderFactory.getEmbeddingProvider.mockResolvedValue({
      generateEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    });
    const bigChunk = (id: string, score: number) => row({ id, score, content: 'x'.repeat(7000) });
    prisma.$queryRaw.mockResolvedValue([bigChunk('c1', 0.9), bigChunk('c2', 0.8), bigChunk('c3', 0.7)]);

    const result = await service.retrieve({ organisationId: 'org-1', botId: 'bot-1', query: 'refunds' });

    // 12,000 char budget: first chunk (7000) fits, second (14000 total) doesn't, third never reached.
    expect(result.chunks.map((chunk) => chunk.chunkId)).toEqual(['c1']);
  });
});
