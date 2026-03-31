import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { finalize } from 'rxjs/operators';
import { getRequestId } from '../request-context';
import { HttpMetricsService } from '../../observability/http-metrics.service';
import { writeAppLog } from '../logging.utils';
import { PrometheusMetricsService } from '../../observability/prometheus-metrics.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly httpMetricsService: HttpMetricsService,
    private readonly prometheusMetricsService: PrometheusMetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - start;
        const requestId = getRequestId() ?? 'n/a';
        const method = request.method;
        const path = request.originalUrl ?? request.url;
        const status = response.statusCode;
        const normalizedPath = this.httpMetricsService.normalizePath(path);

        this.httpMetricsService.recordHttpRequest({
          method,
          path,
          statusCode: status,
          durationMs,
        });
        this.prometheusMetricsService.recordHttpRequest({
          method,
          route: normalizedPath,
          statusCode: status,
          durationMs,
        });

        writeAppLog({
          level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
          event: 'http_request',
          message: `${method} ${normalizedPath} ${status} ${durationMs}ms`,
          data: {
            requestId,
            method,
            path,
            normalizedPath,
            status,
            durationMs,
          },
        });
      }),
    );
  }
}
