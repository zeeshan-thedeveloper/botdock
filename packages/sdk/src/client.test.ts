import { afterEach, describe, expect, it, vi } from 'vitest';
import { BotDockClient } from './client.js';
import { BotDockClientError } from './errors.js';
import { InMemorySessionStorage } from './session.js';

function sseResponse(body: string, headers: Record<string, string> = {}): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers });
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) items.push(item);
  return items;
}

describe('BotDockClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts to the deployment endpoint and streams parsed events', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse('data: {"type":"token","delta":"Hi"}\n\n'));
    vi.stubGlobal('fetch', fetchMock);

    const client = new BotDockClient({ baseUrl: 'https://api.example.com', deploymentId: 'dep_1' });
    const events = await collect(client.sendMessage({ message: 'Hello' }));

    expect(events).toEqual([{ type: 'token', delta: 'Hi' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/public/bots/dep_1/messages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'Hello', conversationId: undefined, visitorId: undefined }),
      }),
    );
  });

  it('sends a previously persisted visitorId and stores a newly issued one', async () => {
    const storage = new InMemorySessionStorage();
    storage.setItem('botdock_visitor_dep_1', 'visitor_existing');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(sseResponse('data: {"type":"done","conversationId":"c1","messageId":"m1"}\n\n', {
        'X-BotDock-Visitor-Id': 'visitor_new',
      }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new BotDockClient({ baseUrl: 'https://api.example.com', deploymentId: 'dep_1', storage });
    await collect(client.sendMessage({ message: 'Hello' }));

    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(requestInit.body).visitorId).toBe('visitor_existing');
    expect(storage.getItem('botdock_visitor_dep_1')).toBe('visitor_new');
  });

  it('maps a 403 response to a forbidden BotDockClientError', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "This domain isn't allowed." }), { status: 403 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new BotDockClient({ baseUrl: 'https://api.example.com', deploymentId: 'dep_1' });

    await expect(collect(client.sendMessage({ message: 'Hi' }))).rejects.toMatchObject({
      kind: 'forbidden',
      message: "This domain isn't allowed.",
    });
  });

  it('maps a 404 response to a not_found BotDockClientError', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Not published.' }), { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new BotDockClient({ baseUrl: 'https://api.example.com', deploymentId: 'dep_1' });

    await expect(collect(client.sendMessage({ message: 'Hi' }))).rejects.toBeInstanceOf(BotDockClientError);
    await expect(collect(client.sendMessage({ message: 'Hi' }))).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('maps a 429 response to a rate_limited error with retryAfterSeconds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ message: 'Slow down.', retryAfterSeconds: 42 }), { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new BotDockClient({ baseUrl: 'https://api.example.com', deploymentId: 'dep_1' });

    await expect(collect(client.sendMessage({ message: 'Hi' }))).rejects.toMatchObject({
      kind: 'rate_limited',
      retryAfterSeconds: 42,
    });
  });

  it('maps a fetch rejection to a network BotDockClientError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    const client = new BotDockClient({ baseUrl: 'https://api.example.com', deploymentId: 'dep_1' });

    await expect(collect(client.sendMessage({ message: 'Hi' }))).rejects.toMatchObject({ kind: 'network' });
  });

  it('lets an aborted fetch reject with its original AbortError, not a network error', async () => {
    const controller = new AbortController();
    const abortError = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));
    controller.abort();

    const client = new BotDockClient({ baseUrl: 'https://api.example.com', deploymentId: 'dep_1' });

    await expect(collect(client.sendMessage({ message: 'Hi', signal: controller.signal }))).rejects.toBe(abortError);
  });
});
