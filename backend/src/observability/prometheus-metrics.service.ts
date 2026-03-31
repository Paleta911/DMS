import { Injectable } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import { BackendMetricsService } from './backend-metrics.service';
import { HttpMetricsService } from './http-metrics.service';

@Injectable()
export class PrometheusMetricsService {
  private readonly registry = new Registry();
  private readonly httpRequestsTotal = new Counter({
    name: 'dms_http_requests_total',
    help: 'Total de solicitudes HTTP procesadas por ruta normalizada',
    labelNames: ['method', 'route', 'status_class'] as const,
    registers: [this.registry],
  });
  private readonly httpRequestDurationSeconds = new Histogram({
    name: 'dms_http_request_duration_seconds',
    help: 'Duracion de solicitudes HTTP en segundos',
    labelNames: ['method', 'route', 'status_class'] as const,
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
    registers: [this.registry],
  });
  private readonly httpTotalRequestsGauge = new Gauge({
    name: 'dms_http_total_requests',
    help: 'Total acumulado de solicitudes HTTP',
    registers: [this.registry],
  });
  private readonly httpTotalErrorsGauge = new Gauge({
    name: 'dms_http_total_errors',
    help: 'Total acumulado de errores HTTP',
    registers: [this.registry],
  });
  private readonly searchElasticStatusGauge = new Gauge({
    name: 'dms_search_elastic_status',
    help: 'Estado de Elasticsearch: 1=up, 0=unknown, -1=down',
    registers: [this.registry],
  });
  private readonly searchQueuePendingGauge = new Gauge({
    name: 'dms_search_queue_pending_jobs',
    help: 'Trabajos pendientes de indexacion',
    registers: [this.registry],
  });
  private readonly searchQueueDueGauge = new Gauge({
    name: 'dms_search_queue_due_jobs',
    help: 'Trabajos listos para procesarse',
    registers: [this.registry],
  });
  private readonly searchQueueFailedGauge = new Gauge({
    name: 'dms_search_queue_failed_jobs',
    help: 'Trabajos fallidos de indexacion',
    registers: [this.registry],
  });
  private readonly searchQueueOldestAgeGauge = new Gauge({
    name: 'dms_search_queue_oldest_job_age_ms',
    help: 'Edad en milisegundos del trabajo pendiente mas antiguo',
    registers: [this.registry],
  });
  private readonly searchWorkerRunningGauge = new Gauge({
    name: 'dms_search_worker_running',
    help: 'Estado del worker de indexacion: 1=activo, 0=inactivo',
    registers: [this.registry],
  });
  private readonly searchQueryCountGauge = new Gauge({
    name: 'dms_search_query_count',
    help: 'Conteo acumulado de consultas de busqueda por motor',
    labelNames: ['engine'] as const,
    registers: [this.registry],
  });
  private readonly searchIndexEventGauge = new Gauge({
    name: 'dms_search_index_event_count',
    help: 'Conteo acumulado de eventos de indexacion por tipo',
    labelNames: ['event'] as const,
    registers: [this.registry],
  });
  private readonly searchReindexRunsGauge = new Gauge({
    name: 'dms_search_reindex_runs',
    help: 'Cantidad acumulada de reindexaciones ejecutadas',
    registers: [this.registry],
  });
  private readonly searchReindexDocsGauge = new Gauge({
    name: 'dms_search_reindex_docs',
    help: 'Documentos procesados por reindexaciones acumuladas',
    registers: [this.registry],
  });
  private readonly searchReindexFailuresGauge = new Gauge({
    name: 'dms_search_reindex_failures',
    help: 'Fallos acumulados durante reindexaciones',
    registers: [this.registry],
  });
  private readonly runtimeHeapUsedGauge = new Gauge({
    name: 'dms_runtime_heap_used_mb',
    help: 'Heap usado del proceso Node en MB',
    registers: [this.registry],
  });
  private readonly runtimeRssGauge = new Gauge({
    name: 'dms_runtime_rss_mb',
    help: 'RSS del proceso Node en MB',
    registers: [this.registry],
  });

  constructor(
    private readonly httpMetricsService: HttpMetricsService,
    private readonly backendMetricsService: BackendMetricsService,
  ) {
    collectDefaultMetrics({ register: this.registry, prefix: 'dms_node_' });
  }

  recordHttpRequest(params: {
    method: string;
    route: string;
    statusCode: number;
    durationMs: number;
  }) {
    const statusClass = this.getStatusClass(params.statusCode);
    const labels = {
      method: params.method.toUpperCase(),
      route: params.route,
      status_class: statusClass,
    };
    this.httpRequestsTotal.inc(labels, 1);
    this.httpRequestDurationSeconds.observe(labels, params.durationMs / 1000);
  }

  async getMetricsText() {
    this.refreshSnapshotGauges();
    return this.registry.metrics();
  }

  getContentType() {
    return this.registry.contentType;
  }

  private refreshSnapshotGauges() {
    const httpSnapshot = this.httpMetricsService.getSnapshot(20);
    this.httpTotalRequestsGauge.set(httpSnapshot.totals.requests);
    this.httpTotalErrorsGauge.set(httpSnapshot.totals.errors);

    const backendSnapshot = this.backendMetricsService.getSnapshot();
    const search = backendSnapshot.services.search;
    this.searchElasticStatusGauge.set(
      search.elasticStatus === 'up'
        ? 1
        : search.elasticStatus === 'down'
          ? -1
          : 0,
    );
    this.searchQueuePendingGauge.set(search.queue.pendingJobs);
    this.searchQueueDueGauge.set(search.queue.dueJobs);
    this.searchQueueFailedGauge.set(search.counters.indexFailures);
    this.searchQueueOldestAgeGauge.set(search.queue.oldestJobAgeMs ?? 0);
    this.searchWorkerRunningGauge.set(search.queue.workerRunning ? 1 : 0);
    this.searchQueryCountGauge.set(
      { engine: 'elastic' },
      search.counters.queryElastic,
    );
    this.searchQueryCountGauge.set(
      { engine: 'fallback' },
      search.counters.queryFallback,
    );
    this.searchIndexEventGauge.set(
      { event: 'queued' },
      search.counters.queued,
    );
    this.searchIndexEventGauge.set(
      { event: 'indexed' },
      search.counters.indexed,
    );
    this.searchIndexEventGauge.set(
      { event: 'failed' },
      search.counters.indexFailures,
    );
    this.searchIndexEventGauge.set(
      { event: 'retry' },
      search.counters.retries,
    );
    this.searchIndexEventGauge.set(
      { event: 'dropped' },
      search.counters.dropped,
    );
    this.searchReindexRunsGauge.set(search.counters.reindexRuns);
    this.searchReindexDocsGauge.set(search.counters.reindexDocs);
    this.searchReindexFailuresGauge.set(search.counters.reindexFailures);
    this.runtimeHeapUsedGauge.set(backendSnapshot.runtime.heapUsedMb);
    this.runtimeRssGauge.set(backendSnapshot.runtime.rssMb);
  }

  private getStatusClass(statusCode: number) {
    if (statusCode >= 500) {
      return '5xx';
    }
    if (statusCode >= 400) {
      return '4xx';
    }
    if (statusCode >= 300) {
      return '3xx';
    }
    if (statusCode >= 200) {
      return '2xx';
    }
    return 'other';
  }
}
