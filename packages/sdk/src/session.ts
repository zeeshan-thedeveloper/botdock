/**
 * Injectable so the SDK stays usable outside browsers (Node, React Native,
 * SSR) — a browser caller passes a `localStorage` adapter; everything else
 * gets an in-memory default. Methods may return synchronously or a Promise
 * so both `localStorage` and async stores (e.g. AsyncStorage) fit.
 */
export interface SessionStorageLike {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
}

export class InMemorySessionStorage implements SessionStorageLike {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}
