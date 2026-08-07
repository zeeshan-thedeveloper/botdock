import { TransportError, type ChatStreamEvent, type MessageTransport, type TransportResult } from './types.js';

const MOCK_REPLY =
  'Thanks for reaching out! I can help with setup, billing, and troubleshooting questions.';

const MOCK_CITATIONS = [
  { label: 'Getting started guide', location: 'Section 2', score: 0.91, knowledgeSourceId: 'src_1' },
  { label: 'Billing FAQ', location: null, score: 0.74, knowledgeSourceId: 'src_2' },
];

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

/**
 * Trigger phrases let every UI-015 state (error / rate-limit / not-found /
 * forbidden) be reached and screenshotted without a live backend. Removed
 * once CHAT-006 wires the real transport.
 */
export const createMockTransport: () => MessageTransport = () =>
  async function* mockTransport({ message, conversationId, signal }): AsyncGenerator<
    ChatStreamEvent,
    TransportResult | void
  > {
    const trimmed = message.trim().toLowerCase();

    if (trimmed === 'trigger:rate-limit') {
      await wait(400, signal);
      throw new TransportError('rate_limited', 'Too many messages sent. Please wait a moment and try again.', 8);
    }
    if (trimmed === 'trigger:forbidden') {
      await wait(400, signal);
      throw new TransportError('forbidden', "This domain isn't allowed to embed this bot.");
    }
    if (trimmed === 'trigger:not-found') {
      await wait(400, signal);
      throw new TransportError('not_found', 'This bot is not published.');
    }
    if (trimmed === 'trigger:network-error') {
      await wait(400, signal);
      throw new TransportError('network', 'Could not reach the assistant.');
    }

    for (const word of MOCK_REPLY.split(' ')) {
      await wait(60, signal);
      yield { type: 'token', delta: `${word} ` };
    }

    yield { type: 'citation', sources: MOCK_CITATIONS };
    yield { type: 'usage', promptTokens: 210, completionTokens: 28, latencyMs: 640, estCostUsd: 0.0009 };
    yield { type: 'done', conversationId: conversationId ?? 'conv_mock', messageId: `msg_${Date.now()}` };

    return { visitorId: 'visitor_mock' };
  };
