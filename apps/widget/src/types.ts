export type WidgetConfig = {
  deploymentId: string;
  apiBaseUrl: string;
  welcomeMessage: string;
  accentColor: string;
  position: 'bottom-right' | 'bottom-left';
};

export type ChatCitationSource = {
  label: string;
  location: string | null;
  score: number;
  knowledgeSourceId: string | null;
};

export type ChatStreamEvent =
  | { type: 'token'; delta: string }
  | { type: 'citation'; sources: ChatCitationSource[] }
  | { type: 'usage'; promptTokens: number; completionTokens: number; latencyMs: number; estCostUsd: number }
  | { type: 'done'; conversationId: string; messageId: string }
  | { type: 'error'; code: string; message: string };

export type WidgetMessageStatus = 'complete' | 'streaming' | 'error';

export type WidgetMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: WidgetMessageStatus;
  citations?: ChatCitationSource[];
  errorMessage?: string;
};

export type TransportInput = {
  message: string;
  conversationId?: string;
  visitorId?: string;
  signal: AbortSignal;
};

export type TransportErrorKind = 'forbidden' | 'not_found' | 'rate_limited' | 'network';

export class TransportError extends Error {
  readonly kind: TransportErrorKind;
  readonly retryAfterSeconds?: number;

  constructor(kind: TransportErrorKind, message: string, retryAfterSeconds?: number) {
    super(message);
    this.kind = kind;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export type TransportResult = {
  visitorId?: string;
};

/**
 * Abstracts how a chat turn is actually sent so the rendering/state-machine
 * code in widget.ts can be exercised (and visually verified) without a live
 * backend, then reused unmodified once wired to the real endpoint. The
 * generator's return value (available on the final `{ done: true }` step)
 * carries the visitor id the server assigned/echoed for continuity.
 */
export type MessageTransport = (
  input: TransportInput,
) => AsyncGenerator<ChatStreamEvent, TransportResult | void>;
