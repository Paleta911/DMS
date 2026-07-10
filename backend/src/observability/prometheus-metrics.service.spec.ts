import { BackendMetricsService } from './backend-metrics.service';
import { HttpMetricsService } from './http-metrics.service';
import { PrometheusMetricsService } from './prometheus-metrics.service';

// Validates Prometheus exporter emits expected metric families and labels.
describe('PrometheusMetricsService', () => {
  it('expone metricas http, runtime y busqueda en formato Prometheus', async () => {
    const httpMetrics = new HttpMetricsService();
    const backendMetrics = new BackendMetricsService();
    const service = new PrometheusMetricsService(httpMetrics, backendMetrics);

    httpMetrics.recordHttpRequest({
      method: 'GET',
      path: '/documents/15',
      statusCode: 200,
      durationMs: 125,
    });
    backendMetrics.recordElasticStatus('up');
    backendMetrics.recordSearchQueueEnqueued({
      pendingJobs: 2,
      dueJobs: 1,
      oldestJobAgeMs: 2500,
      processing: false,
      workerRunning: true,
    });
    backendMetrics.recordSearchQuery('elastic');

    service.recordHttpRequest({
      method: 'GET',
      route: '/documents/:id',
      statusCode: 200,
      durationMs: 125,
    });

    const metrics = await service.getMetricsText();

    expect(service.getContentType()).toContain('text/plain');
    expect(metrics).toContain('dms_http_requests_total');
    expect(metrics).toContain('route="/documents/:id"');
    expect(metrics).toContain('dms_http_total_requests');
    expect(metrics).toContain('dms_search_elastic_status');
    expect(metrics).toContain('dms_search_worker_running');
    expect(metrics).toContain('dms_search_queue_oldest_job_age_ms');
    expect(metrics).toContain('dms_search_query_count');
    expect(metrics).toContain('dms_search_index_event_count');
    expect(metrics).toContain('dms_search_reindex_runs');
    expect(metrics).toContain('dms_runtime_heap_used_mb');
  });
});
