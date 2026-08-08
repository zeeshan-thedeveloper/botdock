import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
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

/**
 * HttpException#message is NOT the response body's `message` field: Nest's
 * initMessage() only copies it over when it's a string. class-validator's
 * ValidationPipe throws BadRequestException with `message` as a string
 * ARRAY (one entry per failed field), so that check fails and Nest falls
 * back to deriving a generic message from the constructor name instead —
 * "BadRequestException" -> "Bad Request Exception". Every DTO validation
 * message (e.g. the allowed-domain pattern hint) was silently getting
 * replaced by that generic string. Read the real message straight from the
 * response body instead, string or array.
 */
function extractMessage(exception: unknown): string {
  if (!(exception instanceof HttpException)) {
    return 'An unexpected server error occurred.';
  }

  const body = exception.getResponse();
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = (body as Record<string, unknown>).message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message)) {
      return message.filter((entry): entry is string => typeof entry === 'string').join(' ');
    }
  }

  return exception.message;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const extraFields = extractExtraFields(exception);

    // 4xx are expected/handled cases (validation, auth, not-found); only
    // 5xx are real bugs worth a server-side trace. Without this, an
    // unhandled exception silently returns "An unexpected server error
    // occurred." with zero evidence in the logs — which is exactly what
    // happened investigating a real report of this in production.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message: extractMessage(exception),
      ...extraFields,
    });
  }
}
