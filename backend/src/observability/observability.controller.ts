import { Controller, Get, Header, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HttpMetricsService } from './http-metrics.service';
import { BackendMetricsService } from './backend-metrics.service';
import { PrometheusMetricsService } from './prometheus-metrics.service';

@Controller('metrics')
export class ObservabilityController {
  constructor(
    private readonly httpMetricsService: HttpMetricsService,
    private readonly backendMetricsService: BackendMetricsService,
    private readonly prometheusMetricsService: PrometheusMetricsService,
  ) {}

  @Get()
  @SkipThrottle()
  getHttpMetrics(@Query('maxRoutes') maxRoutes?: string) {
    const parsed =
      typeof maxRoutes === 'string' && maxRoutes.trim().length > 0
        ? Number(maxRoutes)
        : undefined;
    const limit = Number.isFinite(parsed) ? Math.min(Math.max(Number(parsed), 1), 200) : 30;
    return {
      ...this.httpMetricsService.getSnapshot(limit),
      backend: this.backendMetricsService.getSnapshot(),
    };
  }

  @Get('prometheus')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @SkipThrottle()
  async getPrometheusMetrics() {
    return this.prometheusMetricsService.getMetricsText();
  }
}
