import type { ChatStreamEvent } from '@botdock/contracts';
import { BotDockClientError } from './errors.js';
import { InMemorySessionStorage, type SessionStorageLike } from './session.js';
import { consumeSseEvents } from './stream.js';

export interface BotDockClientOptions {
  /** Public API origin, e.g. https://api.botdock.dev */
  baseUrl: string;
  /** Public, deployment-scoped id (dep_...) — not a secret. */
  deploymentId: string;
  /** Defaults to an in-memory store; browsers should pass a localStorage adapter. */
  storage?: SessionStorageLike;
}

export interface SendMessageInput {
  message: string;
  /** Omit to start a new conversation; the caller owns tracking/persisting this across turns. */
  conversationId?: string;
  signal?: AbortSignal;
}

async function toClientError(response: Response): Promise<BotDockClientError> {
  let message = 'Something went wrong. Please try again.';
  let retryAfterSeconds: number | undefined;

  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object') {
      const { message: bodyMessage, retryAfterSeconds: bodyRetry } = body as Record<string, unknown>;
      if (typeof bodyMessage === 'string') message = bodyMessage;
      if (typeof bodyRetry === 'number') retryAfterSeconds = bodyRetry;
    }
  } catch {
    // Non-JSON error body; fall back to the defaults above.
  }

  if (response.status === 403) return new BotDockClientError('forbidden', message);
  if (response.status === 404) return new BotDockClientError('not_found', message);
  if (response.status === 429) return new BotDockClientError('rate_limited', message, retryAfterSeconds);
  return new BotDockClientError('network', message);
}

/**
 * Framework-agnostic, dependency-light client over the public widget runtime
 * (`POST /public/bots/:deploymentId/messages`). Used directly by developers
 * building custom chat UIs, and by @botdock/widget as its transport.
 */
export class BotDockClient {
  private readonly baseUrl: string;
  private readonly deploymentId: string;
  private readonly storage: SessionStorageLike;
  private readonly visitorStorageKey: string;

  constructor(options: BotDockClientOptions) {
    this.baseUrl = options.baseUrl;
    this.deploymentId = options.deploymentId;
    this.storage = options.storage ?? new InMemorySessionStorage();
    this.visitorStorageKey = `botdock_visitor_${options.deploymentId}`;
  }

  async *sendMessage(input: SendMessageInput): AsyncGenerator<ChatStreamEvent> {
    const signal = input.signal;
    const endpoint = new URL(`/public/bots/${this.deploymentId}/messages`, this.baseUrl).toString();
    const visitorId = (await this.storage.getItem(this.visitorStorageKey)) ?? undefined;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.message, conversationId: input.conversationId, visitorId }),
        signal,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new BotDockClientError('network', 'Could not reach the assistant. Please try again.');
    }

    if (!response.ok) {
      throw await toClientError(response);
    }

    const nextVisitorId = response.headers.get('X-BotDock-Visitor-Id');
    if (nextVisitorId) {
      await this.storage.setItem(this.visitorStorageKey, nextVisitorId);
    }

    yield* consumeSseEvents(response);
  }
}
