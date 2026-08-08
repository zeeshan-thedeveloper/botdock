export type BotDockClientErrorKind = 'forbidden' | 'not_found' | 'rate_limited' | 'network';

/**
 * Typed failure surface for BotDockClient.sendMessage — callers should
 * branch on `kind` rather than parsing `message`, which is a human-readable
 * string from the server and not a stable contract.
 */
export class BotDockClientError extends Error {
  readonly kind: BotDockClientErrorKind;
  readonly retryAfterSeconds?: number;

  constructor(kind: BotDockClientErrorKind, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'BotDockClientError';
    this.kind = kind;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
