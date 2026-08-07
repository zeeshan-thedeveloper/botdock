import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderAuthError, ProviderNetworkError, ProviderRateLimitError, ProviderUpstreamError } from './errors.js';
import { fetchOpenAiWithRetry } from './http.js';

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

describe('fetchOpenAiWithRetry', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the response on success without retrying', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const response = await fetchOpenAiWithRetry({
      url: 'https://api.openai.com/v1/embeddings',
      apiKey: 'sk-test',
      body: { input: ['hi'] },
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces a 401 immediately without retrying', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'unauthorized' }));

    await expect(
      fetchOpenAiWithRetry({ url: 'https://api.openai.com/v1/embeddings', apiKey: 'bad', body: {} }),
    ).rejects.toBeInstanceOf(ProviderAuthError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a 429 with backoff and succeeds on a later attempt', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(429, { error: 'rate limited' }, { 'retry-after': '0' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const response = await fetchOpenAiWithRetry({
      url: 'https://api.openai.com/v1/embeddings',
      apiKey: 'sk-test',
      body: {},
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws ProviderRateLimitError after exhausting retries on repeated 429s', async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, { error: 'rate limited' }, { 'retry-after': '0' }));

    await expect(
      fetchOpenAiWithRetry({ url: 'https://api.openai.com/v1/embeddings', apiKey: 'sk-test', body: {} }),
    ).rejects.toBeInstanceOf(ProviderRateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws ProviderUpstreamError after exhausting retries on repeated 5xx', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { error: 'unavailable' }));

    await expect(
      fetchOpenAiWithRetry({ url: 'https://api.openai.com/v1/embeddings', apiKey: 'sk-test', body: {} }),
    ).rejects.toBeInstanceOf(ProviderUpstreamError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('wraps a raw network failure as ProviderNetworkError without retrying', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(
      fetchOpenAiWithRetry({ url: 'https://api.openai.com/v1/embeddings', apiKey: 'sk-test', body: {} }),
    ).rejects.toBeInstanceOf(ProviderNetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rethrows the original abort error when the caller cancels', async () => {
    const controller = new AbortController();
    const abortError = new DOMException('Aborted', 'AbortError');
    fetchMock.mockRejectedValueOnce(abortError);
    controller.abort();

    await expect(
      fetchOpenAiWithRetry({
        url: 'https://api.openai.com/v1/embeddings',
        apiKey: 'sk-test',
        body: {},
        signal: controller.signal,
      }),
    ).rejects.toBe(abortError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
