import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => ({ close: vi.fn() })),
}));

vi.mock('ioredis', () => ({
  Redis: vi.fn().mockImplementation(() => ({ disconnect: vi.fn() })),
}));

const pdfGetText = vi.fn();
const pdfDestroy = vi.fn().mockResolvedValue(undefined);

vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn().mockImplementation(() => ({ getText: pdfGetText, destroy: pdfDestroy })),
}));

const { IngestionWorkerService } = await import('./ingestion-worker.service.js');

function createConfigServiceMock() {
  return { getOrThrow: vi.fn().mockReturnValue('redis://localhost:6379') };
}

function createPrismaMock() {
  return {
    knowledgeSource: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    documentChunk: {
      deleteMany: vi.fn(),
    },
    $executeRaw: vi.fn().mockResolvedValue(1),
  };
}

const textSource = {
  id: 'source-1',
  organisationId: 'org-1',
  botId: 'bot-1',
  name: 'Refund policy',
  embeddingModel: 'text-embedding-3-small',
  bot: { providerCredentialId: 'cred-1' },
  documents: [
    { id: 'doc-1', fileName: 'content.txt', mimeType: 'text/plain', objectStorageKey: 'org-1/bot-1/source-1/content.txt' },
  ],
};

describe('IngestionWorkerService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let objectStorage: { getObject: ReturnType<typeof vi.fn> };
  let aiProviderFactory: { getEmbeddingProvider: ReturnType<typeof vi.fn> };
  let service: InstanceType<typeof IngestionWorkerService>;

  beforeEach(() => {
    prisma = createPrismaMock();
    objectStorage = { getObject: vi.fn() };
    aiProviderFactory = { getEmbeddingProvider: vi.fn() };
    service = new IngestionWorkerService(
      createConfigServiceMock() as never,
      prisma as never,
      objectStorage as never,
      aiProviderFactory as never,
    );
  });

  it('returns early when the source was deleted before the job ran', async () => {
    prisma.knowledgeSource.findFirst.mockResolvedValue(null);

    await service.processJob({ organisationId: 'org-1', botId: 'bot-1', knowledgeSourceId: 'gone' });

    expect(prisma.knowledgeSource.update).not.toHaveBeenCalled();
    expect(aiProviderFactory.getEmbeddingProvider).not.toHaveBeenCalled();
  });

  it('parses, chunks, embeds, and stores a text source, ending READY', async () => {
    prisma.knowledgeSource.findFirst.mockResolvedValue(textSource);
    objectStorage.getObject.mockResolvedValue(Buffer.from('Refunds are available within 30 days.'));
    const generateEmbeddings = vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]);
    aiProviderFactory.getEmbeddingProvider.mockResolvedValue({ generateEmbeddings });

    await service.processJob({ organisationId: 'org-1', botId: 'bot-1', knowledgeSourceId: 'source-1' });

    expect(prisma.documentChunk.deleteMany).toHaveBeenCalledWith({
      where: { knowledgeSourceId: 'source-1' },
    });
    expect(aiProviderFactory.getEmbeddingProvider).toHaveBeenCalledWith({
      organisationId: 'org-1',
      providerCredentialId: 'cred-1',
      model: 'text-embedding-3-small',
    });
    expect(generateEmbeddings).toHaveBeenCalledWith(['Refunds are available within 30 days.']);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prisma.knowledgeSource.update).toHaveBeenCalledWith({
      where: { id: 'source-1' },
      data: { status: 'READY', chunkCount: 1, errorMessage: null },
    });
  });

  it('marks READY with zero chunks when the document has no extractable text', async () => {
    prisma.knowledgeSource.findFirst.mockResolvedValue(textSource);
    objectStorage.getObject.mockResolvedValue(Buffer.from('   '));

    await service.processJob({ organisationId: 'org-1', botId: 'bot-1', knowledgeSourceId: 'source-1' });

    expect(aiProviderFactory.getEmbeddingProvider).not.toHaveBeenCalled();
    expect(prisma.knowledgeSource.update).toHaveBeenCalledWith({
      where: { id: 'source-1' },
      data: { status: 'READY', chunkCount: 0, errorMessage: null },
    });
  });

  it('marks the source FAILED and rethrows when the bot has no provider credential', async () => {
    prisma.knowledgeSource.findFirst.mockResolvedValue({
      ...textSource,
      bot: { providerCredentialId: null },
    });

    await expect(
      service.processJob({ organisationId: 'org-1', botId: 'bot-1', knowledgeSourceId: 'source-1' }),
    ).rejects.toThrow(/no connected provider credential/i);

    expect(prisma.knowledgeSource.update).toHaveBeenCalledWith({
      where: { id: 'source-1' },
      data: { status: 'FAILED', errorMessage: 'Bot has no connected provider credential.' },
    });
    expect(aiProviderFactory.getEmbeddingProvider).not.toHaveBeenCalled();
  });

  it('extracts real text from a PDF document, ending READY', async () => {
    prisma.knowledgeSource.findFirst.mockResolvedValue({
      ...textSource,
      documents: [
        { id: 'doc-1', fileName: 'policy.pdf', mimeType: 'application/pdf', objectStorageKey: 'key' },
      ],
    });
    objectStorage.getObject.mockResolvedValue(Buffer.from('%PDF-1.4 fake bytes'));
    pdfGetText.mockResolvedValue({ text: 'Refunds are available within 30 days.' });
    const generateEmbeddings = vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]);
    aiProviderFactory.getEmbeddingProvider.mockResolvedValue({ generateEmbeddings });

    await service.processJob({ organisationId: 'org-1', botId: 'bot-1', knowledgeSourceId: 'source-1' });

    expect(pdfDestroy).toHaveBeenCalled();
    expect(generateEmbeddings).toHaveBeenCalledWith(['Refunds are available within 30 days.']);
    expect(prisma.knowledgeSource.update).toHaveBeenCalledWith({
      where: { id: 'source-1' },
      data: { status: 'READY', chunkCount: 1, errorMessage: null },
    });
  });

  it('marks the source FAILED with a clear reason when a PDF cannot be parsed at all', async () => {
    prisma.knowledgeSource.findFirst.mockResolvedValue({
      ...textSource,
      documents: [
        { id: 'doc-1', fileName: 'corrupt.pdf', mimeType: 'application/pdf', objectStorageKey: 'key' },
      ],
    });
    objectStorage.getObject.mockResolvedValue(Buffer.from('not a real pdf'));
    pdfGetText.mockRejectedValue(new Error('Invalid PDF structure'));

    await expect(
      service.processJob({ organisationId: 'org-1', botId: 'bot-1', knowledgeSourceId: 'source-1' }),
    ).rejects.toThrow(/could not parse this pdf.*invalid pdf structure/i);

    expect(pdfDestroy).toHaveBeenCalled();
    expect(prisma.knowledgeSource.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'source-1' },
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });

  it('propagates embedding provider failures as a FAILED source', async () => {
    prisma.knowledgeSource.findFirst.mockResolvedValue(textSource);
    objectStorage.getObject.mockResolvedValue(Buffer.from('Some knowledge content.'));
    aiProviderFactory.getEmbeddingProvider.mockResolvedValue({
      generateEmbeddings: vi.fn().mockRejectedValue(new Error('rate limited')),
    });

    await expect(
      service.processJob({ organisationId: 'org-1', botId: 'bot-1', knowledgeSourceId: 'source-1' }),
    ).rejects.toThrow('rate limited');

    expect(prisma.knowledgeSource.update).toHaveBeenCalledWith({
      where: { id: 'source-1' },
      data: { status: 'FAILED', errorMessage: 'rate limited' },
    });
  });
});
