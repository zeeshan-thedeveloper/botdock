import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

const RESERVED_KEYS = new Set(['statusCode', 'message', 'path', 'timestamp', 'error']);

/**
 * Some exceptions (e.g. WidgetRateLimitGuard's 429) attach machine-readable
 * fields like retryAfterSeconds in the HttpException body. Nest's default
 * error shape only surfaces `message`, so pull the rest through here.
 */
function extractExtraFields(exception: unknown): Record<string, unknown> {
  if (!(exception instanceof HttpException)) {
    return {};
  }
  const body = exception.getResponse();
  if (typeof body !== 'object' || body === null) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([key]) => !RESERVED_KEYS.has(key)),
  );
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const extraFields = extractExtraFields(exception);

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message:
        exception instanceof HttpException
          ? exception.message
          : 'An unexpected server error occurred.',
      ...extraFields,
    });
  }
}
