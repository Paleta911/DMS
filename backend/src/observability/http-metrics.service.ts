import { Injectable } from '@nestjs/common';
import { getEnvNumber } from '../common/env.utils';

type RouteStats = {
  count: number;
  errors: number;
  slowRequests: number;
  totalDurationMs: number;
  maxDurationMs: number;
  statusCounts: StatusCounts;
};

type StatusBucket = '2xx' | '3xx' | '4xx' | '5xx' | 'other';
type StatusCounts = Record<StatusBucket, number>;

@Injectable()
export class HttpMetricsService {
  private readonly startedAt = Date.now();
  private readonly slowRequestThresholdMs = getEnvNumber('HTTP_SLOW_REQUEST_MS', 1000);
  private totalRequests = 0;
  private totalErrors = 0;
  private totalSlowRequests = 0;
  private totalDurationMs = 0;
  private maxDurationMs = 0;
  private readonly totalStatusCounts = this.createStatusCounts();
  private readonly routeStats = new Map<string, RouteStats>();

  recordHttpRequest(params: {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
  }) {
    const method = params.method.toUpperCase();
    const path = this.normalizePath(params.path);
    const key = `${method} ${path}`;
    const stats = this.routeStats.get(key) ?? {
      count: 0,
      errors: 0,
      slowRequests: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
      statusCounts: this.createStatusCounts(),
    };
    const statusBucket = this.getStatusBucket(params.statusCode);

    stats.count += 1;
    stats.totalDurationMs += params.durationMs;
    stats.maxDurationMs = Math.max(stats.maxDurationMs, params.durationMs);
    stats.statusCounts[statusBucket] += 1;

    if (params.statusCode >= 400) {
      stats.errors += 1;
      this.totalErrors += 1;
    }
    if (params.durationMs >= this.slowRequestThresholdMs) {
      stats.slowRequests += 1;
      this.totalSlowRequests += 1;
    }

    this.totalRequests += 1;
    this.totalDurationMs += params.durationMs;
    this.maxDurationMs = Math.max(this.maxDurationMs, params.durationMs);
    this.totalStatusCounts[statusBucket] += 1;
    this.routeStats.set(key, stats);
  }

  getSnapshot(maxRoutes = 30) {
    const routes = Array.from(this.routeStats.entries())
      .map(([route, stats]) => ({
        route,
        requests: stats.count,
        errors: stats.errors,
        slowRequests: stats.slowRequests,
        errorRate: stats.count > 0 ? Number((stats.errors / stats.count).toFixed(4)) : 0,
        slowRate:
          stats.count > 0 ? Number((stats.slowRequests / stats.count).toFixed(4)) : 0,
        avgDurationMs:
          stats.count > 0 ? Number((stats.totalDurationMs / stats.count).toFixed(2)) : 0,
        maxDurationMs: stats.maxDurationMs,
        statusCounts: { ...stats.statusCounts },
      }))
      .sort((a, b) => b.requests - a.requests);

    const topRoutes = routes.slice(0, maxRoutes);
    const slowestRoutes = [...routes]
      .sort((a, b) => {
        if (b.maxDurationMs !== a.maxDurationMs) {
          return b.maxDurationMs - a.maxDurationMs;
        }
        return b.avgDurationMs - a.avgDurationMs;
      })
      .slice(0, maxRoutes);

    return {
      startedAt: new Date(this.startedAt).toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      slowRequestThresholdMs: this.slowRequestThresholdMs,
      totals: {
        requests: this.totalRequests,
        errors: this.totalErrors,
        slowRequests: this.totalSlowRequests,
        errorRate:
          this.totalRequests > 0
            ? Number((this.totalErrors / this.totalRequests).toFixed(4))
            : 0,
        slowRate:
          this.totalRequests > 0
            ? Number((this.totalSlowRequests / this.totalRequests).toFixed(4))
            : 0,
        avgDurationMs:
          this.totalRequests > 0
            ? Number((this.totalDurationMs / this.totalRequests).toFixed(2))
            : 0,
        maxDurationMs: this.maxDurationMs,
        statusCounts: { ...this.totalStatusCounts },
      },
      routes: topRoutes,
      slowestRoutes,
    };
  }

  normalizePath(path: string) {
    const [cleanPath] = (path ?? '/').split('?');
    const normalized = (cleanPath || '/')
      .split('/')
      .map((segment) => this.normalizeSegment(segment))
      .join('/');
    return normalized || '/';
  }

  private normalizeSegment(segment: string) {
    if (!segment) {
      return segment;
    }
    if (/^\d+$/.test(segment)) {
      return ':id';
    }
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        segment,
      )
    ) {
      return ':uuid';
    }
    if (/^[0-9a-f]{24,}$/i.test(segment)) {
      return ':token';
    }
    return segment;
  }

  private getStatusBucket(statusCode: number): StatusBucket {
    if (statusCode >= 200 && statusCode < 300) {
      return '2xx';
    }
    if (statusCode >= 300 && statusCode < 400) {
      return '3xx';
    }
    if (statusCode >= 400 && statusCode < 500) {
      return '4xx';
    }
    if (statusCode >= 500 && statusCode < 600) {
      return '5xx';
    }
    return 'other';
  }

  private createStatusCounts(): StatusCounts {
    return {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
      other: 0,
    };
  }
}
