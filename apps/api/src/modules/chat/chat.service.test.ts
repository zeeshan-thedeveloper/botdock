import { ProviderRateLimitError } from '@botdock/ai-core';
import type { ChatStreamEvent } from '@botdock/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatService } from './chat.service.js';
import type { ChatRunInput } from './chat.types.js';

function createPrismaMock() {
  return {
    bot: { findFirst: vi.fn() },
    conversation: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    message: { findMany: vi.fn(), create: vi.fn() },
    messageSource: { createMany: vi.fn() },
    usageRecord: { create: vi.fn() },
  };
}

async function collect(events: AsyncIterable<ChatStreamEvent>): Promise<ChatStreamEvent[]> {
  const out: ChatStreamEvent[] = [];
  for await (const event of events) out.push(event);
  return out;
}

function baseInput(overrides: Partial<ChatRunInput> = {}): ChatRunInput {
  return {
    organisationId: 'org-1',
    botId: 'bot-1',
    configVersion: 'draft',
    userMessage: 'What is your refund policy?',
    source: 'PLAYGROUND',
    debug: false,
    ...overrides,
  };
}

const activeBot = {
  id: 'bot-1',
  instructions: 'You are a support bot.',
  model: 'gpt-4o-mini',
  temperature: 0.35,
  maxSources: 6,
  strictKnowledge: true,
  providerCredentialId: 'cred-1',
  providerCredential: { status: 'ACTIVE' as const },
};

const relevantRetrieval = {
  hasRelevantKnowledge: true,
  chunks: [
    {
      chunkId: 'chunk-1',
      documentId: 'doc-1',
      knowledgeSourceId: 'source-1',
      content: 'Refunds are available within 30 days.',
      score: 0.82,
      metadata: { sourceName: 'Refund policy', documentFileName: 'refund-policy.pdf' },
    },
  ],
};

function mockStreamingProvider(chunks: { type: string; content?: string; metadata?: Record<string, unknown> }[]) {
  return {
    streamChat: vi.fn(async function* (request: { signal?: AbortSignal }) {
      for (const chunk of chunks) {
        if (request.signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        yield chunk;
      }
    }),
  };
}

describe('ChatService.runChat', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let aiProviderFactory: { getChatProvider: ReturnType<typeof vi.fn> };
  let retrievalService: { retrieve: ReturnType<typeof vi.fn> };
  let service: ChatService;

  beforeEach(() => {
    prisma = createPrismaMock();
    aiProviderFactory = { getChatProvider: vi.fn() };
    retrievalService = { retrieve: vi.fn() };
    service = new ChatService(prisma as never, aiProviderFactory as never, retrievalService as never);

    prisma.message.create.mockResolvedValue({ id: 'msg-user' });
    prisma.conversation.create.mockResolvedValue({ id: 'conv-1' });
    prisma.message.findMany.mockResolvedValue([]);
  });

  it('emits bot_not_found and stops when the bot is outside the tenant scope', async () => {
    prisma.bot.findFirst.mockResolvedValue(null);

    const events = await collect(service.runChat(baseInput()));

    expect(events).toEqual([{ type: 'error', code: 'bot_not_found', message: expect.any(String) }]);
    expect(prisma.conversation.create).not.toHaveBeenCalled();
  });

  it('emits no_provider_key and stops when the bot has no active credential', async () => {
    prisma.bot.findFirst.mockResolvedValue({ ...activeBot, providerCredentialId: null, providerCredential: null });

    const events = await collect(service.runChat(baseInput()));

    expect(events).toEqual([{ type: 'error', code: 'no_provider_key', message: expect.any(String) }]);
    expect(retrievalService.retrieve).not.toHaveBeenCalled();
  });

  it('emits conversation_not_found when a given conversationId is outside the tenant scope', async () => {
    prisma.bot.findFirst.mockResolvedValue(activeBot);
    prisma.conversation.findFirst.mockResolvedValue(null);

    const events = await collect(service.runChat(baseInput({ conversationId: 'conv-x' })));

    expect(events).toEqual([
      { type: 'error', code: 'conversation_not_found', message: expect.any(String) },
    ]);
  });

  it('runs the full pipeline: tokens, citation, usage, done — and persists everything', async () => {
    prisma.bot.findFirst.mockResolvedValue(activeBot);
    retrievalService.retrieve.mockResolvedValue(relevantRetrieval);
    prisma.message.create
      .mockResolvedValueOnce({ id: 'msg-user' })
      .mockResolvedValueOnce({ id: 'msg-assistant' });
    aiProviderFactory.getChatProvider.mockResolvedValue(
      mockStreamingProvider([
        { type: 'content', content: 'Sure, ' },
        { type: 'content', content: 'refunds are available.' },
        {
          type: 'metadata',
          metadata: { promptTokens: 120, completionTokens: 18, latencyMs: 800, estCostUsd: 0.0003 },
        },
      ]),
    );

    const events = await collect(service.runChat(baseInput()));

    expect(events.map((e) => e.type)).toEqual(['token', 'token', 'citation', 'usage', 'done']);
    expect(events[0]).toEqual({ type: 'token', delta: 'Sure, ' });
    expect(events[2]).toEqual({
      type: 'citation',
      sources: [
        {
          label: 'Refund policy',
          location: 'refund-policy.pdf',
          score: 0.82,
          knowledgeSourceId: 'source-1',
        },
      ],
    });
    expect(events[3]).toEqual({
      type: 'usage',
      promptTokens: 120,
      completionTokens: 18,
      latencyMs: 800,
      estCostUsd: 0.0003,
    });
    expect(events[4]).toEqual({ type: 'done', conversationId: 'conv-1', messageId: 'msg-assistant' });

    expect(prisma.message.create).toHaveBeenNthCalledWith(1, {
      data: { conversationId: 'conv-1', role: 'USER', content: 'What is your refund policy?' },
    });
    expect(prisma.message.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        conversationId: 'conv-1',
        role: 'ASSISTANT',
        content: 'Sure, refunds are available.',
        model: 'gpt-4o-mini',
        promptTokens: 120,
        completionTokens: 18,
      }),
    });
    expect(prisma.messageSource.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          messageId: 'msg-assistant',
          knowledgeSourceId: 'source-1',
          documentChunkId: 'chunk-1',
        }),
      ],
    });
    expect(prisma.usageRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ botId: 'bot-1', conversationId: 'conv-1', source: 'PLAYGROUND' }),
    });
    expect(prisma.conversation.update).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
      data: { lastMessageAt: expect.any(Date) },
    });
  });

  it('emits a trace event only when debug is true', async () => {
    prisma.bot.findFirst.mockResolvedValue(activeBot);
    retrievalService.retrieve.mockResolvedValue(relevantRetrieval);
    aiProviderFactory.getChatProvider.mockResolvedValue(
      mockStreamingProvider([{ type: 'content', content: 'hi' }, { type: 'metadata', metadata: {} }]),
    );

    const withDebug = await collect(service.runChat(baseInput({ debug: true })));
    expect(withDebug[0]).toMatchObject({ type: 'trace', model: 'gpt-4o-mini' });

    const withoutDebug = await collect(service.runChat(baseInput({ debug: false })));
    expect(withoutDebug.some((event) => event.type === 'trace')).toBe(false);
  });

  it('falls back without calling the model when strictKnowledge finds nothing relevant', async () => {
    prisma.bot.findFirst.mockResolvedValue(activeBot);
    retrievalService.retrieve.mockResolvedValue({ hasRelevantKnowledge: false, chunks: [] });
    prisma.message.create
      .mockResolvedValueOnce({ id: 'msg-user' })
      .mockResolvedValueOnce({ id: 'msg-assistant' });

    const events = await collect(service.runChat(baseInput()));

    expect(aiProviderFactory.getChatProvider).not.toHaveBeenCalled();
    expect(events.map((e) => e.type)).toEqual(['token', 'done']);
    expect(events[0]).toMatchObject({ type: 'token' });
    expect(prisma.message.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ role: 'ASSISTANT' }),
    });
    expect(prisma.usageRecord.create).not.toHaveBeenCalled();
  });

  it('maps a provider error mid-stream to an error event and persists partial content without usage', async () => {
    prisma.bot.findFirst.mockResolvedValue(activeBot);
    retrievalService.retrieve.mockResolvedValue(relevantRetrieval);
    prisma.message.create
      .mockResolvedValueOnce({ id: 'msg-user' })
      .mockResolvedValueOnce({ id: 'msg-assistant' });
    aiProviderFactory.getChatProvider.mockResolvedValue({
      streamChat: vi.fn(async function* () {
        yield { type: 'content', content: 'Partial' };
        throw new ProviderRateLimitError('rate limited', 2000);
      }),
    });

    const events = await collect(service.runChat(baseInput()));

    expect(events.map((e) => e.type)).toEqual(['token', 'error', 'citation']);
    expect(events[1]).toEqual({
      type: 'error',
      code: 'provider_rate_limited',
      message: expect.any(String),
    });
    expect(prisma.message.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ content: 'Partial' }),
    });
    expect(prisma.usageRecord.create).not.toHaveBeenCalled();
  });

  it('stops cleanly on cancellation: no error/usage/done, but persists partial content', async () => {
    prisma.bot.findFirst.mockResolvedValue(activeBot);
    retrievalService.retrieve.mockResolvedValue(relevantRetrieval);
    prisma.message.create
      .mockResolvedValueOnce({ id: 'msg-user' })
      .mockResolvedValueOnce({ id: 'msg-assistant' });

    const controller = new AbortController();
    aiProviderFactory.getChatProvider.mockResolvedValue({
      streamChat: vi.fn(async function* (request: { signal?: AbortSignal }) {
        yield { type: 'content', content: 'Partial answer' };
        controller.abort();
        if (request.signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
      }),
    });

    const events = await collect(service.runChat(baseInput({ signal: controller.signal })));

    expect(events.map((e) => e.type)).toEqual(['token', 'citation']);
    expect(prisma.message.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ content: 'Partial answer' }),
    });
    expect(prisma.usageRecord.create).not.toHaveBeenCalled();
  });

  it('treats a graceful abort stop (no thrown error, matching real ai-core behavior) as cancelled too', async () => {
    // ai-core's OpenAIChatModelProvider stops silently on abort (`if (aborted) return;`)
    // rather than throwing — the pipeline must not mistake that for a real completion.
    prisma.bot.findFirst.mockResolvedValue(activeBot);
    retrievalService.retrieve.mockResolvedValue(relevantRetrieval);
    prisma.message.create
      .mockResolvedValueOnce({ id: 'msg-user' })
      .mockResolvedValueOnce({ id: 'msg-assistant' });

    const controller = new AbortController();
    aiProviderFactory.getChatProvider.mockResolvedValue({
      streamChat: vi.fn(async function* (request: { signal?: AbortSignal }) {
        yield { type: 'content', content: 'Partial' };
        controller.abort();
        if (request.signal?.aborted) {
          return; // graceful stop, no throw — this is the real ai-core contract
        }
        yield { type: 'metadata', metadata: { promptTokens: 999, completionTokens: 999 } };
      }),
    });

    const events = await collect(service.runChat(baseInput({ signal: controller.signal })));

    expect(events.map((e) => e.type)).toEqual(['token', 'citation']);
    expect(prisma.message.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ content: 'Partial' }),
    });
    expect(prisma.usageRecord.create).not.toHaveBeenCalled();
  });
});
