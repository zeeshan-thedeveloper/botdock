import { describe, expect, it } from 'vitest';
import { consumeSseEvents } from './stream.js';

function sseResponse(chunks: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream);
}

async function collect(response: Response) {
  const events = [];
  for await (const event of consumeSseEvents(response)) {
    events.push(event);
  }
  return events;
}

describe('consumeSseEvents', () => {
  it('parses token, citation, usage, done, and error events', async () => {
    const response = sseResponse([
      'data: {"type":"token","delta":"Hi"}\n\n',
      'data: {"type":"citation","sources":[{"label":"Doc","location":null,"score":0.9,"knowledgeSourceId":"src_1"}]}\n\n',
      'data: {"type":"usage","promptTokens":1,"completionTokens":1,"latencyMs":1,"estCostUsd":0}\n\n',
      'data: {"type":"done","conversationId":"conv_1","messageId":"msg_1"}\n\n',
    ]);

    const events = await collect(response);

    expect(events).toEqual([
      { type: 'token', delta: 'Hi' },
      { type: 'citation', sources: [{ label: 'Doc', location: null, score: 0.9, knowledgeSourceId: 'src_1' }] },
      { type: 'usage', promptTokens: 1, completionTokens: 1, latencyMs: 1, estCostUsd: 0 },
      { type: 'done', conversationId: 'conv_1', messageId: 'msg_1' },
    ]);
  });

  it('reassembles an event split across multiple stream chunks', async () => {
    const response = sseResponse(['data: {"type":"tok', 'en","delta":"Hi"}\n\n']);

    const events = await collect(response);

    expect(events).toEqual([{ type: 'token', delta: 'Hi' }]);
  });

  it('ignores heartbeat comment lines', async () => {
    const response = sseResponse([': heartbeat\n\n', 'data: {"type":"token","delta":"Hi"}\n\n']);

    const events = await collect(response);

    expect(events).toEqual([{ type: 'token', delta: 'Hi' }]);
  });

  it('silently drops an unrecognized event type (e.g. a stray trace event)', async () => {
    const response = sseResponse([
      'data: {"type":"trace","requestId":"r1"}\n\n',
      'data: {"type":"token","delta":"Hi"}\n\n',
    ]);

    const events = await collect(response);

    expect(events).toEqual([{ type: 'token', delta: 'Hi' }]);
  });

  it('yields nothing for a response with no body', async () => {
    const response = new Response(null);

    const events = await collect(response);

    expect(events).toEqual([]);
  });
});
