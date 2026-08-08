import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

function createHost(request: { url: string }) {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const response = { status };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  };
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes through extra machine-readable fields from an HttpException body', () => {
    const filter = new AllExceptionsFilter();
    const exception = new HttpException(
      { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: 'Slow down.', retryAfterSeconds: 42 },
      HttpStatus.TOO_MANY_REQUESTS,
    );
    const { host, status, json } = createHost({ url: '/public/bots/dep_1/messages' });

    filter.catch(exception, host as never);

    expect(status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Slow down.', retryAfterSeconds: 42 }),
    );
  });

  it('omits extra fields for a plain string-message HttpException', () => {
    const filter = new AllExceptionsFilter();
    const exception = new HttpException('Not found.', HttpStatus.NOT_FOUND);
    const { host, json } = createHost({ url: '/some/path' });

    filter.catch(exception, host as never);

    const body = json.mock.calls[0]?.[0];
    expect(body.message).toBe('Not found.');
    expect(Object.keys(body).sort()).toEqual(['message', 'path', 'statusCode', 'timestamp']);
  });

  it('maps a non-HttpException to a generic 500 with no leaked details', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const filter = new AllExceptionsFilter();
    const { host, status, json } = createHost({ url: '/boom' });

    filter.catch(new Error('db connection string leaked'), host as never);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'An unexpected server error occurred.' }),
    );
  });

  it('logs a server-side trace for a 5xx so an unhandled exception is never silently invisible', () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const filter = new AllExceptionsFilter();
    const { host } = createHost({ url: '/organisations/org-1/bots/bot-1/knowledge' });
    const exception = new Error('db connection string leaked');

    filter.catch(exception, host as never);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('/organisations/org-1/bots/bot-1/knowledge'),
      exception.stack,
    );
  });

  it('does not log a server-side trace for an expected 4xx', () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const filter = new AllExceptionsFilter();
    const { host } = createHost({ url: '/some/path' });

    filter.catch(new HttpException('Not found.', HttpStatus.NOT_FOUND), host as never);

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
