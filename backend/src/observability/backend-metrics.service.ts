import { Injectable } from '@nestjs/common';

type SearchEngine = 'elastic' | 'fallback';
type ElasticStatus = 'up' | 'down' | 'unknown';

type QueueSnapshot = {
  pendingJobs: number;
  dueJobs: number;
  oldestJobAgeMs: number | null;
  processing: boolean;
  workerRunning: boolean;
};

@Injectable()
export class BackendMetricsService {
  private readonly startedAt = Date.now();
  private readonly search = {
    elasticStatus: 'unknown' as ElasticStatus,
    lastElasticReason: null as string | null,
    lastElasticStatusAt: null as string | null,
    lastElasticUpAt: null as string | null,
    lastElasticDownAt: null as string | null,
    lastQueuedAt: null as string | null,
    lastWorkerRunAt: null as string | null,
    lastIndexedAt: null as string | null,
    lastIndexFailureAt: null as string | null,
    queue: {
      pendingJobs: 0,
      dueJobs: 0,
      oldestJobAgeMs: null as number | null,
      processing: false,
      workerRunning: false,
    },
    counters: {
      queued: 0,
      indexed: 0,
      indexFailures: 0,
      retries: 0,
      dropped: 0,
      queryElastic: 0,
      queryFallback: 0,
      reindexRuns: 0,
      reindexDocs: 0,
      reindexFailures: 0,
      elasticDownEvents: 0,
    },
  };

  getSnapshot() {
    // Snapshot is intentionally plain JSON for /health and /metrics style endpoints.
    return {
      startedAt: new Date(this.startedAt).toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      runtime: this.getRuntimeSnapshot(),
      services: {
        search: {
          elasticStatus: this.search.elasticStatus,
          lastElasticReason: this.search.lastElasticReason,
          lastElasticStatusAt: this.search.lastElasticStatusAt,
          lastElasticUpAt: this.search.lastElasticUpAt,
          lastElasticDownAt: this.search.lastElasticDownAt,
          lastQueuedAt: this.search.lastQueuedAt,
          lastWorkerRunAt: this.search.lastWorkerRunAt,
          lastIndexedAt: this.search.lastIndexedAt,
          lastIndexFailureAt: this.search.lastIndexFailureAt,
          queue: { ...this.search.queue },
          counters: { ...this.search.counters },
        },
      },
    };
  }

  recordSearchQueueEnqueued(snapshot: QueueSnapshot) {
    this.search.counters.queued += 1;
    this.search.lastQueuedAt = new Date().toISOString();
    this.updateSearchQueue(snapshot);
  }

  recordSearchQueueWorker(snapshot: QueueSnapshot) {
    this.search.lastWorkerRunAt = new Date().toISOString();
    this.updateSearchQueue(snapshot);
  }

  recordSearchIndexSuccess(snapshot: QueueSnapshot) {
    this.search.counters.indexed += 1;
    this.search.lastIndexedAt = new Date().toISOString();
    this.updateSearchQueue(snapshot);
  }

  recordSearchIndexFailure(snapshot: QueueSnapshot) {
    this.search.counters.indexFailures += 1;
    this.search.lastIndexFailureAt = new Date().toISOString();
    this.updateSearchQueue(snapshot);
  }

  recordSearchIndexRetry(snapshot: QueueSnapshot) {
    this.search.counters.retries += 1;
    this.search.lastIndexFailureAt = new Date().toISOString();
    this.updateSearchQueue(snapshot);
  }

  recordSearchIndexDropped(snapshot: QueueSnapshot) {
    this.search.counters.dropped += 1;
    this.search.lastIndexFailureAt = new Date().toISOString();
    this.updateSearchQueue(snapshot);
  }

  recordSearchQuery(engine: SearchEngine) {
    // Split counters by engine to track fallback pressure over time.
    if (engine === 'elastic') {
      this.search.counters.queryElastic += 1;
      return;
    }
    this.search.counters.queryFallback += 1;
  }

  recordSearchReindex(params: {
    total: number;
    failed: number;
    skipped?: boolean;
  }) {
    if (params.skipped) {
      return;
    }
    this.search.counters.reindexRuns += 1;
    this.search.counters.reindexDocs += Math.max(0, params.total);
    this.search.counters.reindexFailures += Math.max(0, params.failed);
  }

  recordElasticStatus(status: ElasticStatus, reason?: string | null) {
    if (
      this.search.elasticStatus === status &&
      this.search.lastElasticReason === (reason ?? null)
    ) {
      return;
    }
    const now = new Date().toISOString();
    this.search.elasticStatus = status;
    this.search.lastElasticReason = reason ?? null;
    this.search.lastElasticStatusAt = now;
    if (status === 'up') {
      this.search.lastElasticUpAt = now;
      return;
    }
    if (status === 'down') {
      // Count transitions to down (not every repeated failure) for cleaner alerting.
      this.search.lastElasticDownAt = now;
      this.search.counters.elasticDownEvents += 1;
    }
  }

  private updateSearchQueue(snapshot: QueueSnapshot) {
    this.search.queue = {
      pendingJobs: Math.max(0, snapshot.pendingJobs),
      dueJobs: Math.max(0, snapshot.dueJobs),
      oldestJobAgeMs:
        typeof snapshot.oldestJobAgeMs === 'number'
          ? Math.max(0, Math.round(snapshot.oldestJobAgeMs))
          : null,
      processing: snapshot.processing,
      workerRunning: snapshot.workerRunning,
    };
  }

  private getRuntimeSnapshot() {
    const memory = process.memoryUsage();
    return {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      rssMb: Number((memory.rss / 1024 / 1024).toFixed(2)),
      heapUsedMb: Number((memory.heapUsed / 1024 / 1024).toFixed(2)),
      heapTotalMb: Number((memory.heapTotal / 1024 / 1024).toFixed(2)),
      externalMb: Number((memory.external / 1024 / 1024).toFixed(2)),
    };
  }
}
