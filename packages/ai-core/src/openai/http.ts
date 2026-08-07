import { ProviderAuthError, ProviderNetworkError, ProviderRateLimitError, ProviderUpstreamError } from './errors.js';

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 300;

export interface FetchOpenAiOptions {
  url: string;
  apiKey: string;
  body: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(response: Response): number | undefined {
  const header = response.headers.get('retry-after');
  if (!header) {
    return undefined;
  }

  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds * 1000 : undefined;
}

async function toProviderError(response: Response): Promise<Error> {
  if (response.status === 401) {
    return new ProviderAuthError();
  }

  if (response.status === 429) {
    return new ProviderRateLimitError('Provider rate limit exceeded.', parseRetryAfterMs(response));
  }

  if (response.status >= 500) {
    return new ProviderUpstreamError(response.status);
  }

  const detail = await response.text().catch(() => '');
  return new Error(`OpenAI request failed with status ${response.status}${detail ? `: ${detail}` : ''}`);
}

/**
 * POSTs to the OpenAI API with a shared timeout/retry/error-mapping policy.
 * Retries only 429/5xx (exponential backoff, max 3 attempts); 401 and network
 * errors surface immediately. Caller owns interpreting the returned Response body.
 */
export async function fetchOpenAiWithRetry(options: FetchOpenAiOptions): Promise<Response> {
  const { url, apiKey, body, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = options;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const internalController = new AbortController();
    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      internalController.abort();
    }, timeoutMs);
    const onExternalAbort = () => internalController.abort();
    signal?.addEventListener('abort', onExternalAbort);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: internalController.signal,
      });

      if (response.ok) {
        return response;
      }

      const error = await toProviderError(response);
      const retryable = error instanceof ProviderRateLimitError || error instanceof ProviderUpstreamError;
      if (retryable && attempt < MAX_ATTEMPTS) {
        await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
        continue;
      }
      throw error;
    } catch (caughtError) {
      if (
        caughtError instanceof ProviderAuthError ||
        caughtError instanceof ProviderRateLimitError ||
        caughtError instanceof ProviderUpstreamError
      ) {
        throw caughtError;
      }

      if (signal?.aborted && !timedOut) {
        // Caller-initiated cancellation, not a provider failure: let the caller detect it.
        throw caughtError;
      }

      throw new ProviderNetworkError(
        timedOut ? 'Provider request timed out.' : 'Provider request network error.',
      );
    } finally {
      clearTimeout(timeoutHandle);
      signal?.removeEventListener('abort', onExternalAbort);
    }
  }

  throw new ProviderNetworkError('Provider request failed after retries.');
}
