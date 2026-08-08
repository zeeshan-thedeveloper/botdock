import { describe, expect, it } from 'vitest';
import { InMemorySessionStorage } from './session.js';

describe('InMemorySessionStorage', () => {
  it('returns null for an unset key', () => {
    const storage = new InMemorySessionStorage();

    expect(storage.getItem('missing')).toBeNull();
  });

  it('round-trips a stored value', () => {
    const storage = new InMemorySessionStorage();

    storage.setItem('visitor', 'visitor_123');

    expect(storage.getItem('visitor')).toBe('visitor_123');
  });

  it('keeps separate instances isolated', () => {
    const a = new InMemorySessionStorage();
    const b = new InMemorySessionStorage();

    a.setItem('visitor', 'visitor_a');

    expect(b.getItem('visitor')).toBeNull();
  });
});
