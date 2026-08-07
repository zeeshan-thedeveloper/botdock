export class ProviderAuthError extends Error {
  constructor(message = 'Provider credential is invalid or unauthorized.') {
    super(message);
    this.name = 'ProviderAuthError';
  }
}

export class ProviderRateLimitError extends Error {
  readonly retryAfterMs?: number;

  constructor(message = 'Provider rate limit exceeded.', retryAfterMs?: number) {
    super(message);
    this.name = 'ProviderRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class ProviderUpstreamError extends Error {
  readonly status: number;

  constructor(status: number, message = 'Provider upstream error.') {
    super(message);
    this.name = 'ProviderUpstreamError';
    this.status = status;
  }
}

export class ProviderNetworkError extends Error {
  constructor(message = 'Provider network error or timeout.') {
    super(message);
    this.name = 'ProviderNetworkError';
  }
}
