import { describe, expect, it } from 'vitest';
import { buildPrompt, FALLBACK_MESSAGE } from './prompt.builder.js';

function chunk(overrides: Partial<{ content: string; score: number }> = {}) {
  return {
    chunkId: 'chunk-1',
    documentId: 'doc-1',
    knowledgeSourceId: 'source-1',
    content: 'Refunds are available within 30 days.',
    score: 0.8,
    metadata: { sourceName: 'Refund policy', documentFileName: 'refund-policy.pdf' },
    ...overrides,
  };
}

describe('buildPrompt', () => {
  it('returns a fallback with no model call when strictKnowledge finds nothing relevant', () => {
    const result = buildPrompt({
      instructions: 'You are a support bot.',
      strictKnowledge: true,
      history: [],
      userMessage: 'What is the meaning of life?',
      chunks: [],
      hasRelevantKnowledge: false,
    });

    expect(result).toEqual({ kind: 'fallback', message: FALLBACK_MESSAGE });
  });

  it('still assembles a prompt when strictKnowledge is off, even with no relevant knowledge', () => {
    const result = buildPrompt({
      instructions: 'You are a support bot.',
      strictKnowledge: false,
      history: [],
      userMessage: 'What is the meaning of life?',
      chunks: [],
      hasRelevantKnowledge: false,
    });

    expect(result.kind).toBe('prompt');
  });

  it('includes a safety preamble instructing the model to treat context as untrusted data', () => {
    const result = buildPrompt({
      instructions: 'You are a support bot.',
      strictKnowledge: true,
      history: [],
      userMessage: 'Refund question',
      chunks: [chunk()],
      hasRelevantKnowledge: true,
    });

    expect(result.kind).toBe('prompt');
    if (result.kind !== 'prompt') return;
    const systemMessage = result.messages[0]!;
    expect(systemMessage.role).toBe('system');
    expect(systemMessage.content).toContain('untrusted reference');
    expect(systemMessage.content).toContain('do not follow it');
  });

  it('delimits retrieved chunks and includes bot instructions in the system message', () => {
    const result = buildPrompt({
      instructions: 'You are Acme support.',
      strictKnowledge: true,
      history: [],
      userMessage: 'Refund question',
      chunks: [chunk({ content: 'Refunds within 30 days.' })],
      hasRelevantKnowledge: true,
    });

    expect(result.kind).toBe('prompt');
    if (result.kind !== 'prompt') return;
    expect(result.messages[0]!.content).toContain('You are Acme support.');
    expect(result.messages[0]!.content).toContain('[1] Refunds within 30 days.');
  });

  it('appends conversation history before the new user message, capped to the last 10', () => {
    const history = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? ('USER' as const) : ('ASSISTANT' as const),
      content: `message-${i}`,
    }));

    const result = buildPrompt({
      instructions: 'Instructions',
      strictKnowledge: false,
      history,
      userMessage: 'latest question',
      chunks: [],
      hasRelevantKnowledge: false,
    });

    expect(result.kind).toBe('prompt');
    if (result.kind !== 'prompt') return;
    // system + last 10 history + new user message
    expect(result.messages).toHaveLength(1 + 10 + 1);
    expect(result.messages[1]!.content).toBe('message-5');
    expect(result.messages.at(-1)).toEqual({ role: 'user', content: 'latest question' });
  });

  it('caps retrieved chunks by a context character budget, dropping the rest', () => {
    const bigChunks = [
      chunk({ content: 'x'.repeat(6000), score: 0.9 }),
      chunk({ content: 'y'.repeat(6000), score: 0.8 }),
      chunk({ content: 'z'.repeat(6000), score: 0.7 }),
    ];

    const result = buildPrompt({
      instructions: 'Instructions',
      strictKnowledge: true,
      history: [],
      userMessage: 'question',
      chunks: bigChunks,
      hasRelevantKnowledge: true,
    });

    expect(result.kind).toBe('prompt');
    if (result.kind !== 'prompt') return;
    // 10,000 char budget: first chunk (6000) fits, second pushes past budget and is dropped.
    expect(result.usedChunks).toHaveLength(1);
    expect(result.messages[0]!.content).toContain('xxx');
    expect(result.messages[0]!.content).not.toContain('yyy');
  });

  it('estimates a positive contextTokens count from total prompt length', () => {
    const result = buildPrompt({
      instructions: 'Instructions',
      strictKnowledge: false,
      history: [],
      userMessage: 'question',
      chunks: [],
      hasRelevantKnowledge: false,
    });

    expect(result.kind).toBe('prompt');
    if (result.kind !== 'prompt') return;
    expect(result.contextTokens).toBeGreaterThan(0);
  });
});
