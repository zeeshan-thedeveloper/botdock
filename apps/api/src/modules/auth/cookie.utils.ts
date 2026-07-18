import type { Request } from 'express';

type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  domain?: string;
  maxAgeSeconds?: number;
};

export function readCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return undefined;
  }

  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .map((cookie) => {
      const separatorIndex = cookie.indexOf('=');
      return {
        name: separatorIndex >= 0 ? cookie.slice(0, separatorIndex) : cookie,
        value: separatorIndex >= 0 ? cookie.slice(separatorIndex + 1) : '',
      };
    })
    .find((cookie) => cookie.name === name)?.value;
}

export function serializeCookie(name: string, value: string, options: CookieOptions) {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAgeSeconds !== undefined) {
    segments.push(`Max-Age=${options.maxAgeSeconds}`);
  }

  segments.push(`Path=${options.path ?? '/'}`);

  if (options.domain) {
    segments.push(`Domain=${options.domain}`);
  }

  if (options.httpOnly) {
    segments.push('HttpOnly');
  }

  if (options.secure) {
    segments.push('Secure');
  }

  segments.push(`SameSite=${options.sameSite ?? 'lax'}`);

  return segments.join('; ');
}
