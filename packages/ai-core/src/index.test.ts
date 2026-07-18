import { describe, expect, it } from 'vitest';
import { MockChatModelProvider, MockEmbeddingProvider } from './index.js';

describe('mock AI providers', () => {
  it('streams a deterministic local response', async () => {
    const provider = new MockChatModelProvider();
    const chunks = [];

    for await (const chunk of provider.streamChat({
      model: 'mock-local',
      messages: [{ role: 'user', content: 'Hello' }],
    })) {
      chunks.push(chunk);
    }

    expect(chunks.at(0)?.content).toBe('Mock ');
    expect(chunks.at(-1)?.type).toBe('done');
  });

  it('generates simple deterministic embeddings', async () => {
    const provider = new MockEmbeddingProvider();
    await expect(provider.generateEmbeddings(['hello world'])).resolves.toEqual([[11, 2, 1]]);
  });
});
