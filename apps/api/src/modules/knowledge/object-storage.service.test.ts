import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();

vi.mock('@aws-sdk/client-s3', () => {
  class FakeCommand {
    constructor(public readonly input: unknown) {}
  }

  return {
    S3Client: vi.fn().mockImplementation(() => ({ send: sendMock })),
    HeadBucketCommand: FakeCommand,
    CreateBucketCommand: FakeCommand,
    PutObjectCommand: FakeCommand,
    DeleteObjectsCommand: FakeCommand,
    GetObjectCommand: FakeCommand,
  };
});

async function* asyncBytes(chunks: string[]) {
  for (const chunk of chunks) {
    yield Buffer.from(chunk);
  }
}

const { ObjectStorageService } = await import('./object-storage.service.js');

function createConfigServiceMock() {
  const values: Record<string, string> = {
    MINIO_BUCKET: 'botdock-knowledge',
    MINIO_ENDPOINT: 'http://localhost:9000',
    MINIO_ACCESS_KEY: 'botdock',
    MINIO_SECRET_KEY: 'botdock-local-password',
  };
  return { getOrThrow: vi.fn((key: string) => values[key]) };
}

describe('ObjectStorageService', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('does not create the bucket when HeadBucket succeeds', async () => {
    sendMock.mockResolvedValueOnce({});
    const service = new ObjectStorageService(createConfigServiceMock() as never);

    await service.onModuleInit();

    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('creates the bucket when HeadBucket fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('not found')).mockResolvedValueOnce({});
    const service = new ObjectStorageService(createConfigServiceMock() as never);

    await service.onModuleInit();

    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('does not throw when the storage endpoint is unreachable at boot (degrades gracefully)', async () => {
    sendMock
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED'))
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    const service = new ObjectStorageService(createConfigServiceMock() as never);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('putObject sends a PutObjectCommand with the given key/body/content-type', async () => {
    sendMock.mockResolvedValueOnce({});
    const service = new ObjectStorageService(createConfigServiceMock() as never);

    await service.putObject('org-1/bot-1/source-1/content.txt', Buffer.from('hi'), 'text/plain');

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'botdock-knowledge',
          Key: 'org-1/bot-1/source-1/content.txt',
          ContentType: 'text/plain',
        }),
      }),
    );
  });

  it('getObject concatenates the response body stream into a Buffer', async () => {
    sendMock.mockResolvedValueOnce({ Body: asyncBytes(['hel', 'lo']) });
    const service = new ObjectStorageService(createConfigServiceMock() as never);

    const buffer = await service.getObject('org-1/bot-1/source-1/content.txt');

    expect(buffer.toString('utf8')).toBe('hello');
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'botdock-knowledge',
          Key: 'org-1/bot-1/source-1/content.txt',
        }),
      }),
    );
  });

  it('deleteObjects is a no-op for an empty key list', async () => {
    const service = new ObjectStorageService(createConfigServiceMock() as never);

    await service.deleteObjects([]);

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('deleteObjects sends a DeleteObjectsCommand for the given keys', async () => {
    sendMock.mockResolvedValueOnce({});
    const service = new ObjectStorageService(createConfigServiceMock() as never);

    await service.deleteObjects(['a', 'b']);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'botdock-knowledge',
          Delete: { Objects: [{ Key: 'a' }, { Key: 'b' }] },
        }),
      }),
    );
  });
});
