import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KnowledgeService } from './knowledge.service.js';

const now = new Date('2026-08-07T10:00:00.000Z');

function createPrismaMock() {
  return {
    organisationMember: {
      findUnique: vi.fn(),
    },
    bot: {
      findFirst: vi.fn(),
    },
    knowledgeSource: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    document: {
      create: vi.fn(),
    },
  };
}

describe('KnowledgeService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let objectStorage: { putObject: ReturnType<typeof vi.fn>; deleteObjects: ReturnType<typeof vi.fn> };
  let ingestionQueue: { enqueue: ReturnType<typeof vi.fn> };
  let service: KnowledgeService;

  beforeEach(() => {
    prisma = createPrismaMock();
    objectStorage = { putObject: vi.fn(), deleteObjects: vi.fn() };
    ingestionQueue = { enqueue: vi.fn() };
    service = new KnowledgeService(prisma as never, objectStorage as never, ingestionQueue as never);
  });

  const activeBot = {
    id: 'bot-1',
    providerCredential: { provider: 'OPENAI' as const, status: 'ACTIVE' as const },
  };

  it('blocks access when the user is not an organisation member', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue(null);

    await expect(
      service.createSource('org-1', 'bot-1', 'user-1', { type: 'text', name: 'FAQ', content: 'hi' }, undefined),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.bot.findFirst).not.toHaveBeenCalled();
  });

  it('rejects when the bot has no active provider credential (BYOK gate)', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.bot.findFirst.mockResolvedValue({ id: 'bot-1', providerCredential: null });

    await expect(
      service.createSource('org-1', 'bot-1', 'user-1', { type: 'text', name: 'FAQ', content: 'hi' }, undefined),
    ).rejects.toThrow(/connect a provider key/i);
    expect(prisma.knowledgeSource.create).not.toHaveBeenCalled();
  });

  it('rejects text/FAQ sources with no content', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.bot.findFirst.mockResolvedValue(activeBot);

    await expect(
      service.createSource('org-1', 'bot-1', 'user-1', { type: 'text', name: 'FAQ' }, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects file sources with no uploaded file', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.bot.findFirst.mockResolvedValue(activeBot);

    await expect(
      service.createSource('org-1', 'bot-1', 'user-1', { type: 'file', name: 'Doc' }, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unsupported file mime type', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.bot.findFirst.mockResolvedValue(activeBot);

    await expect(
      service.createSource('org-1', 'bot-1', 'user-1', { type: 'file', name: 'Doc' }, {
        originalname: 'malware.exe',
        mimetype: 'application/octet-stream',
        size: 10,
        buffer: Buffer.from('x'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a PROCESSING source, stores the object, and enqueues ingestion for text content', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.bot.findFirst.mockResolvedValue(activeBot);
    prisma.knowledgeSource.create.mockResolvedValue({
      id: 'source-1',
      organisationId: 'org-1',
      botId: 'bot-1',
      type: 'TEXT',
      name: 'Refund policy',
      status: 'PROCESSING',
      embeddingProvider: 'OPENAI',
      embeddingModel: 'text-embedding-3-small',
      chunkCount: 0,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.createSource(
      'org-1',
      'bot-1',
      'user-1',
      { type: 'text', name: 'Refund policy', content: 'Refunds within 30 days.' },
      undefined,
    );

    expect(prisma.knowledgeSource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organisationId: 'org-1',
          botId: 'bot-1',
          type: 'TEXT',
          status: 'PROCESSING',
          embeddingProvider: 'OPENAI',
          embeddingModel: 'text-embedding-3-small',
          embeddingDimensions: 1536,
        }),
      }),
    );
    expect(objectStorage.putObject).toHaveBeenCalledWith(
      'org-1/bot-1/source-1/content.txt',
      Buffer.from('Refunds within 30 days.', 'utf8'),
      'text/plain',
    );
    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          knowledgeSourceId: 'source-1',
          parseStatus: 'PENDING',
          objectStorageKey: 'org-1/bot-1/source-1/content.txt',
        }),
      }),
    );
    expect(ingestionQueue.enqueue).toHaveBeenCalledWith({
      organisationId: 'org-1',
      botId: 'bot-1',
      knowledgeSourceId: 'source-1',
    });
    expect(result).toMatchObject({ id: 'source-1', type: 'text', status: 'processing' });
  });

  it('marks the source FAILED and rethrows when object storage fails', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.bot.findFirst.mockResolvedValue(activeBot);
    prisma.knowledgeSource.create.mockResolvedValue({
      id: 'source-1',
      organisationId: 'org-1',
      botId: 'bot-1',
      type: 'TEXT',
      name: 'Refund policy',
      status: 'PROCESSING',
      embeddingProvider: 'OPENAI',
      embeddingModel: 'text-embedding-3-small',
      chunkCount: 0,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    });
    objectStorage.putObject.mockRejectedValue(new Error('minio unreachable'));

    await expect(
      service.createSource(
        'org-1',
        'bot-1',
        'user-1',
        { type: 'text', name: 'Refund policy', content: 'Refunds within 30 days.' },
        undefined,
      ),
    ).rejects.toThrow('minio unreachable');

    expect(prisma.knowledgeSource.update).toHaveBeenCalledWith({
      where: { id: 'source-1' },
      data: { status: 'FAILED', errorMessage: 'Failed to store the uploaded content.' },
    });
    expect(ingestionQueue.enqueue).not.toHaveBeenCalled();
  });

  it('deletes object storage keys and cascades the source on delete', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.knowledgeSource.findFirst.mockResolvedValue({
      id: 'source-1',
      documents: [{ objectStorageKey: 'org-1/bot-1/source-1/content.txt' }, { objectStorageKey: null }],
    });

    await service.deleteSource('org-1', 'bot-1', 'source-1', 'user-1');

    expect(objectStorage.deleteObjects).toHaveBeenCalledWith(['org-1/bot-1/source-1/content.txt']);
    expect(prisma.knowledgeSource.delete).toHaveBeenCalledWith({ where: { id: 'source-1' } });
  });

  it('throws NotFoundException deleting a source outside the tenant scope', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.knowledgeSource.findFirst.mockResolvedValue(null);

    await expect(service.deleteSource('org-1', 'bot-1', 'source-x', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(objectStorage.deleteObjects).not.toHaveBeenCalled();
  });
});
