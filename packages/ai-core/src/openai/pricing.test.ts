import { describe, expect, it } from 'vitest';
import { estimateCostUsd } from './pricing.js';

describe('estimateCostUsd', () => {
  it('computes cost from per-million-token pricing for a known model', () => {
    const cost = estimateCostUsd('gpt-4o-mini', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.15 + 0.6, 6);
  });

  it('returns zero without throwing for an unknown model', () => {
    expect(estimateCostUsd('some-future-model', 1_000, 1_000)).toBe(0);
  });
});
