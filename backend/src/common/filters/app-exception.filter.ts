import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';
import { writeAppLog } from '../logging.utils';
import {
  buildApiErrorResponse,
  mapMulterMessage,
  normalizeApiMessage,
  normalizeApiMessages,
  type RequestWithId,
} from '../http-error.utils';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithId>();
    const response = ctx.getResponse<Response>();

    if (exception instanceof MulterError) {
      return response.status(HttpStatus.BAD_REQUEST).json(
        buildApiErrorResponse({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Solicitud inválida',
          message: mapMulterMessage(exception.code, exception.message),
          code: exception.code,
          request,
        }),
      );
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const rawResponse = exception.getResponse();
      const payload =
        typeof rawResponse === 'string'
          ? { message: rawResponse }
          : ((rawResponse ?? {}) as {
              message?: unknown;
              error?: string;
              errors?: unknown;
              code?: string;
            });

      const errors =
        normalizeApiMessages(payload.errors).length > 0
          ? normalizeApiMessages(payload.errors)
          : normalizeApiMessages(payload.message);

      const message =
        typeof payload.message === 'string'
          ? normalizeApiMessage(payload.message)
          : errors.join(', ') || normalizeApiMessage(exception.message);

      return response.status(statusCode).json(
        buildApiErrorResponse({
          statusCode,
          error: payload.error,
          message,
          errors: errors.length > 0 ? errors : undefined,
          code: payload.code,
          request,
        }),
      );
    }

    const message =
      exception instanceof Error ? exception.message : 'Error interno del servidor';

    writeAppLog({
      level: 'error',
      event: 'unhandled_exception',
      message: 'Error no controlado en el backend',
      data: {
        path: request.originalUrl ?? request.url ?? '/',
        error: message,
      },
    });

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      buildApiErrorResponse({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error interno del servidor',
        request,
      }),
    );
  }
}
