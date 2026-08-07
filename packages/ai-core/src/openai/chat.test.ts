import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatModelChunk } from '../index.js';
import { OpenAIChatModelProvider } from './chat.js';
import { ProviderAuthError } from './errors.js';

function sseResponse(lines: string[], status = 200, headers: Record<string, string> = {}) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line));
      }
      controller.close();
    },
  });
  return new Response(stream, { status, headers });
}

async function collect(chunks: AsyncIterable<ChatModelChunk>) {
  const result: ChatModelChunk[] = [];
  for await (const chunk of chunks) {
    result.push(chunk);
  }
  return result;
}

describe('OpenAIChatModelProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('streams content deltas and a final metadata + done chunk', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hel' } }] })}\n\n`,
        `data: ${JSON.stringify({ choices: [{ delta: { content: 'lo' } }] })}\n\n`,
        `data: ${JSON.stringify({ choices: [{ delta: {} }], usage: { prompt_tokens: 10, completion_tokens: 2 } })}\n\n`,
        'data: [DONE]\n\n',
      ]),
    );

    const provider = new OpenAIChatModelProvider({ apiKey: 'sk-test' });
    const chunks = await collect(
      provider.streamChat({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] }),
    );

    expect(chunks.filter((c) => c.type === 'content').map((c) => c.content)).toEqual(['Hel', 'lo']);
    const metadata = chunks.find((c) => c.type === 'metadata');
    expect(metadata?.metadata).toMatchObject({
      model: 'gpt-4o-mini',
      provider: 'openai',
      promptTokens: 10,
      completionTokens: 2,
    });
    expect(chunks.at(-1)?.type).toBe('done');
  });

  it('flags an unknown model with a pricing note instead of throwing', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([`data: ${JSON.stringify({ choices: [{ delta: { content: 'hi' } }] })}\n\n`, 'data: [DONE]\n\n']),
    );

    const provider = new OpenAIChatModelProvider({ apiKey: 'sk-test' });
    const chunks = await collect(
      provider.streamChat({ model: 'future-model', messages: [{ role: 'user', content: 'hi' }] }),
    );

    const metadata = chunks.find((c) => c.type === 'metadata');
    expect(metadata?.metadata?.estCostUsd).toBe(0);
    expect(metadata?.metadata?.pricingNote).toBe('unknown_model_default_zero_cost');
  });

  it('propagates a 401 as ProviderAuthError', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }));

    const provider = new OpenAIChatModelProvider({ apiKey: 'sk-bad' });
    await expect(
      collect(provider.streamChat({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] })),
    ).rejects.toBeInstanceOf(ProviderAuthError);
  });

  it('stops streaming promptly and yields no further chunks when aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const abortError = new DOMException('Aborted', 'AbortError');
    fetchMock.mockRejectedValueOnce(abortError);

    const provider = new OpenAIChatModelProvider({ apiKey: 'sk-test' });
    const chunks = await collect(
      provider.streamChat({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }],
        signal: controller.signal,
      }),
    );

    expect(chunks).toEqual([]);
  });
});
