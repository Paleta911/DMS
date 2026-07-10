import { Module } from '@nestjs/common';
import { RequestLoggingInterceptor } from '../common/interceptors/request-logging.interceptor';
import { HttpMetricsService } from './http-metrics.service';
import { ObservabilityController } from './observability.controller';
import { BackendMetricsService } from './backend-metrics.service';
import { PrometheusMetricsService } from './prometheus-metrics.service';

// Observability module wires HTTP/app metrics services and exposes them for cross-module instrumentation.
@Module({
  controllers: [ObservabilityController],
  providers: [
    HttpMetricsService,
    BackendMetricsService,
    PrometheusMetricsService,
    RequestLoggingInterceptor,
  ],
  exports: [
    HttpMetricsService,
    BackendMetricsService,
    PrometheusMetricsService,
    RequestLoggingInterceptor,
  ],
})
export class ObservabilityModule {}
