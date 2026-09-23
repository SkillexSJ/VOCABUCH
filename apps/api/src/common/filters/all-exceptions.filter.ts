import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '../../../prisma/generated/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected server error occurred. Please try again later.';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (status >= 500) {
        // Internal server errors are logged on backend and never exposed
        this.logger.error(
          `HttpException [${status}]: ${exception.message}`,
          exception.stack,
        );
        message = 'An unexpected server error occurred. Please try again later.';
        code = 'INTERNAL_SERVER_ERROR';
      } else if (typeof res === 'string') {
        message = res;
        code = HttpStatus[status] || 'BAD_REQUEST';
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, any>;
        message = body['message'] || message;
        code = body['error'] || (HttpStatus[status] as string) || code;
        details = body['issues'] || body['details'] || undefined;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Log Prisma database errors internally with full query context
      this.logger.error(
        `Prisma KnownRequestError [${exception.code}]: ${exception.message}`,
        exception.stack,
      );

      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          code = 'CONFLICT';
          message = 'A vocabulary record with this entry already exists.';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          code = 'NOT_FOUND';
          message = 'The requested record was not found.';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          code = 'INVALID_RELATION';
          message = 'Cannot complete request because a referenced item was not found.';
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          code = 'DATABASE_ERROR';
          message = 'A database error occurred. Please try again later.';
          break;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(
        `Prisma ValidationError: ${exception.message}`,
        exception.stack,
      );
      status = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      message = 'Invalid data provided for database operation.';
    } else if (exception instanceof Error) {
      // Catch-all for other unhandled errors: log securely, send safe message
      this.logger.error(
        `Unhandled Exception: ${exception.message}`,
        exception.stack,
      );
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_SERVER_ERROR';
      message = 'An unexpected server error occurred. Please try again later.';
    } else {
      this.logger.error('Unknown exception thrown:', String(exception));
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

