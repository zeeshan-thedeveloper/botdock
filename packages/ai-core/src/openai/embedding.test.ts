import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAIEmbeddingProvider } from './embedding.js';
import { ProviderUpstreamError } from './errors.js';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

describe('OpenAIEmbeddingProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns vectors in input order for a single batch', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        data: [
          { index: 1, embedding: [0.2] },
          { index: 0, embedding: [0.1] },
        ],
      }),
    );

    const provider = new OpenAIEmbeddingProvider({ apiKey: 'sk-test' });
    const result = await provider.generateEmbeddings(['a', 'b']);

    expect(result).toEqual([[0.1], [0.2]]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('batches large input sets and reassembles vectors in original order', async () => {
    const inputs = Array.from({ length: 150 }, (_, i) => `text-${i}`);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: Array.from({ length: 100 }, (_, i) => ({ index: i, embedding: [i] })),
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: Array.from({ length: 50 }, (_, i) => ({ index: i, embedding: [100 + i] })),
        }),
      );

    const provider = new OpenAIEmbeddingProvider({ apiKey: 'sk-test' });
    const result = await provider.generateEmbeddings(inputs);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(150);
    expect(result[0]).toEqual([0]);
    expect(result[99]).toEqual([99]);
    expect(result[100]).toEqual([100]);
    expect(result[149]).toEqual([149]);
  });

  it('propagates a mapped provider error after retries are exhausted', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { error: 'unavailable' }));

    const provider = new OpenAIEmbeddingProvider({ apiKey: 'sk-test' });
    await expect(provider.generateEmbeddings(['a'])).rejects.toBeInstanceOf(ProviderUpstreamError);
  });
});
