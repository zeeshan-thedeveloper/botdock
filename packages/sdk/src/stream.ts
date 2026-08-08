import type { ChatStreamEvent } from '@botdock/contracts';

const KNOWN_EVENT_TYPES = new Set(['token', 'citation', 'usage', 'done', 'error']);

/**
 * Deliberately a lightweight shape check rather than
 * chatStreamEventSchema.safeParse: the primary consumer of this package is
 * the embeddable widget (apps/widget), which has a hard small-bundle
 * requirement — pulling zod's runtime into every page that loads the widget
 * isn't a trade worth making to validate a first-party, already
 * contract-tested endpoint. `@botdock/contracts` is still a real dependency
 * for the *type* import above, which costs nothing at runtime (type-only
 * imports are elided by the compiler). `trace` is never sent on the public
 * path but is ignored defensively rather than treated as a parse failure if
 * it ever were.
 */
function parseChatStreamEvent(raw: unknown): ChatStreamEvent | null {
  if (typeof raw !== 'object' || raw === null || !('type' in raw)) {
    return null;
  }
  const type = (raw as { type: unknown }).type;
  return typeof type === 'string' && KNOWN_EVENT_TYPES.has(type) ? (raw as ChatStreamEvent) : null;
}

export async function* consumeSseEvents(response: Response): AsyncGenerator<ChatStreamEvent> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const rawEvents = buffer.split('\n\n');
      buffer = rawEvents.pop() ?? '';

      for (const rawEvent of rawEvents) {
        const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data:'));
        if (!dataLine) continue;

        const data = dataLine.slice(5).trim();
        if (!data) continue;

        const event = parseChatStreamEvent(JSON.parse(data));
        if (event) yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
