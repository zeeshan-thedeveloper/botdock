import { consumeSseEvents } from './stream.js';
import { TransportError, type MessageTransport, type TransportInput, type WidgetConfig } from './types.js';

async function toTransportError(response: Response): Promise<TransportError> {
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

  if (response.status === 403) return new TransportError('forbidden', message);
  if (response.status === 404) return new TransportError('not_found', message);
  if (response.status === 429) return new TransportError('rate_limited', message, retryAfterSeconds);
  return new TransportError('network', message);
}

export function createHttpTransport(config: WidgetConfig): MessageTransport {
  const endpoint = new URL(`/public/bots/${config.deploymentId}/messages`, config.apiBaseUrl).toString();

  return async function* httpTransport({ message, conversationId, visitorId, signal }: TransportInput) {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversationId, visitorId }),
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw error;
      throw new TransportError('network', 'Could not reach the assistant. Please try again.');
    }

    if (!response.ok) {
      throw await toTransportError(response);
    }

    const nextVisitorId = response.headers.get('X-BotDock-Visitor-Id') ?? undefined;
    yield* consumeSseEvents(response);
    return { visitorId: nextVisitorId };
  };
}
