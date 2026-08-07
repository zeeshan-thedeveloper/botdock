import { describe, expect, it } from 'vitest';
import { isOriginAllowed } from './origin.util.js';

describe('isOriginAllowed', () => {
  it('rejects everything when the pattern list is empty (fail closed)', () => {
    expect(isOriginAllowed('https://shop.acme.com', [])).toBe(false);
  });

  it('rejects a missing (null) Origin even with permissive patterns', () => {
    expect(isOriginAllowed(null, ['*.acme.com', 'null'])).toBe(false);
  });

  it('rejects the literal "null" Origin unless a pattern explicitly allows it', () => {
    expect(isOriginAllowed('null', ['shop.acme.com'])).toBe(false);
    expect(isOriginAllowed('null', ['null'])).toBe(true);
  });

  it('matches an exact host, ignoring scheme and port', () => {
    expect(isOriginAllowed('https://shop.acme.com', ['shop.acme.com'])).toBe(true);
    expect(isOriginAllowed('http://shop.acme.com:8080', ['shop.acme.com'])).toBe(true);
    expect(isOriginAllowed('https://other.com', ['shop.acme.com'])).toBe(false);
  });

  it('matches a wildcard subdomain pattern but never the bare apex', () => {
    expect(isOriginAllowed('https://shop.acme.com', ['*.acme.com'])).toBe(true);
    expect(isOriginAllowed('https://a.b.acme.com', ['*.acme.com'])).toBe(true);
    expect(isOriginAllowed('https://acme.com', ['*.acme.com'])).toBe(false);
    expect(isOriginAllowed('https://notacme.com', ['*.acme.com'])).toBe(false);
  });

  it('allows the apex too when both the apex and wildcard are registered', () => {
    expect(isOriginAllowed('https://acme.com', ['acme.com', '*.acme.com'])).toBe(true);
  });

  it('matches localhost and 127.0.0.1 on any port', () => {
    expect(isOriginAllowed('http://localhost:3000', ['localhost'])).toBe(true);
    expect(isOriginAllowed('http://localhost:5173', ['localhost'])).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:4000', ['127.0.0.1'])).toBe(true);
  });

  it('is case-insensitive and tolerant of surrounding whitespace in patterns', () => {
    expect(isOriginAllowed('https://Shop.Acme.com', [' SHOP.ACME.COM '])).toBe(true);
  });

  it('rejects a malformed Origin string', () => {
    expect(isOriginAllowed('not-a-url', ['acme.com'])).toBe(false);
  });
});
