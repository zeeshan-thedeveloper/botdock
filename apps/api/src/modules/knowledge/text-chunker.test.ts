import { describe, expect, it } from 'vitest';
import { chunkText } from './text-chunker.js';

describe('chunkText', () => {
  it('returns no chunks for empty or whitespace-only text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n  ')).toEqual([]);
  });

  it('returns a single chunk when text fits within the chunk size', () => {
    const text = 'Refunds are available within 30 days of purchase.';
    expect(chunkText(text, 1200, 150)).toEqual([text]);
  });

  it('splits long text into overlapping chunks that together cover the source text', () => {
    const text = Array.from({ length: 500 }, (_, i) => `word${i}`).join(' ');
    const chunks = chunkText(text, 100, 20);

    expect(chunks.length).toBeGreaterThan(1);
    // Every chunk should be within the configured bound.
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(100);
    }
    // Consecutive chunks should overlap in content (not lose the boundary).
    for (let i = 1; i < chunks.length; i += 1) {
      const prevTail = chunks[i - 1]!.slice(-10);
      expect(chunks[i]!.includes(prevTail.trim().split(' ').at(-1) ?? '')).toBe(true);
    }
  });

  it('normalizes CRLF line endings before chunking', () => {
    expect(chunkText('line one\r\nline two', 1200, 150)).toEqual(['line one\nline two']);
  });
});
