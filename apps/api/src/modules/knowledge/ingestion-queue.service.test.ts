import { beforeEach, describe, expect, it, vi } from 'vitest';

const addMock = vi.fn();
const closeMock = vi.fn();
const disconnectMock = vi.fn();

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({ add: addMock, close: closeMock })),
}));

vi.mock('ioredis', () => ({
  Redis: vi.fn().mockImplementation(() => ({ disconnect: disconnectMock })),
}));

const { IngestionQueueService, KNOWLEDGE_INGESTION_QUEUE } = await import('./ingestion-queue.service.js');

function createConfigServiceMock() {
  return { getOrThrow: vi.fn().mockReturnValue('redis://localhost:6379') };
}

describe('IngestionQueueService', () => {
  beforeEach(() => {
    addMock.mockReset();
    closeMock.mockReset();
    disconnectMock.mockReset();
  });

  it('uses the shared knowledge-ingestion queue name', () => {
    expect(KNOWLEDGE_INGESTION_QUEUE).toBe('knowledge-ingestion');
  });

  it('enqueues a job with retry/backoff and drops it once complete', async () => {
    const service = new IngestionQueueService(createConfigServiceMock() as never);

    await service.enqueue({ organisationId: 'org-1', botId: 'bot-1', knowledgeSourceId: 'source-1' });

    expect(addMock).toHaveBeenCalledWith(
      'ingest',
      { organisationId: 'org-1', botId: 'bot-1', knowledgeSourceId: 'source-1' },
      expect.objectContaining({
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      }),
    );
  });

  it('closes the queue and disconnects redis on module destroy', async () => {
    const service = new IngestionQueueService(createConfigServiceMock() as never);

    await service.onModuleDestroy();

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });
});
