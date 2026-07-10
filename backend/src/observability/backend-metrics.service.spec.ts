import { BackendMetricsService } from './backend-metrics.service';

// Verifies metric counters and status transitions used by operational dashboards.
describe('BackendMetricsService', () => {
  it('tracks search queue, retries and queries', () => {
    const service = new BackendMetricsService();

    service.recordSearchQueueEnqueued({
      pendingJobs: 3,
      dueJobs: 1,
      oldestJobAgeMs: 2500,
      processing: false,
      workerRunning: true,
    });
    service.recordSearchIndexRetry({
      pendingJobs: 3,
      dueJobs: 1,
      oldestJobAgeMs: 2500,
      processing: true,
      workerRunning: true,
    });
    service.recordSearchIndexSuccess({
      pendingJobs: 2,
      dueJobs: 0,
      oldestJobAgeMs: 1200,
      processing: false,
      workerRunning: true,
    });
    service.recordSearchQuery('fallback');
    service.recordElasticStatus('down', 'ping timeout');

    const snapshot = service.getSnapshot();
    const search = snapshot.services.search;

    expect(search.queue.pendingJobs).toBe(2);
    expect(search.queue.oldestJobAgeMs).toBe(1200);
    expect(search.counters.queued).toBe(1);
    expect(search.counters.retries).toBe(1);
    expect(search.counters.indexed).toBe(1);
    expect(search.counters.queryFallback).toBe(1);
    expect(search.elasticStatus).toBe('down');
    expect(search.lastElasticReason).toBe('ping timeout');
  });

  it('does not double-count unchanged elastic state', () => {
    const service = new BackendMetricsService();

    service.recordElasticStatus('down', 'ping timeout');
    service.recordElasticStatus('down', 'ping timeout');

    const snapshot = service.getSnapshot();
    expect(snapshot.services.search.counters.elasticDownEvents).toBe(1);
  });
});
