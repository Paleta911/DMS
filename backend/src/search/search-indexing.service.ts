import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { performance } from 'perf_hooks';
import { Document } from '../documents/document.entity';
import { Version } from '../versions/version.entity';
import { getEnvNumber } from '../common/env.utils';
import { SearchStateService } from './search-state.service';
import { writeAppLog } from '../common/logging.utils';
import { BackendMetricsService } from '../observability/backend-metrics.service';
import {
  SearchIndexJob,
  SearchIndexJobStatus,
} from './search-index-job.entity';
import { SearchEngineService } from './search-engine.service';

@Injectable()
export class SearchIndexingService implements OnModuleInit, OnModuleDestroy {
  private readonly indexingMaxRetries: number;
  private readonly indexingRetryBaseMs: number;
  private readonly indexingRetryMaxMs: number;
  private readonly indexingWorkerIntervalMs: number;
  private readonly indexingBatchSize: number;
  private readonly runtimeRole: 'both' | 'web' | 'worker' | 'disabled';
  private indexingWorker: ReturnType<typeof setInterval> | null = null;
  private processingIndexQueue = false;

  constructor(
    private readonly searchEngineService: SearchEngineService,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(Version)
    private readonly versionRepo: Repository<Version>,
    @InjectRepository(SearchIndexJob)
    private readonly searchIndexJobRepo: Repository<SearchIndexJob>,
    private readonly searchStateService: SearchStateService,
    private readonly backendMetricsService: BackendMetricsService,
  ) {
    this.indexingMaxRetries = Math.max(
      1,
      getEnvNumber('SEARCH_INDEX_MAX_RETRIES', 5),
    );
    this.indexingRetryBaseMs = Math.max(
      200,
      getEnvNumber('SEARCH_INDEX_RETRY_BASE_MS', 2000),
    );
    this.indexingRetryMaxMs = Math.max(
      this.indexingRetryBaseMs,
      getEnvNumber('SEARCH_INDEX_RETRY_MAX_MS', 30000),
    );
    this.indexingWorkerIntervalMs = Math.max(
      500,
      getEnvNumber('SEARCH_INDEX_WORKER_MS', 3000),
    );
    this.indexingBatchSize = Math.max(
      1,
      getEnvNumber('SEARCH_INDEX_BATCH_SIZE', 10),
    );
    this.runtimeRole = this.resolveRuntimeRole();
  }

  async onModuleInit() {
    await this.searchEngineService.ensureElasticReady();
    this.startIndexingWorker();
  }

  onModuleDestroy() {
    if (this.indexingWorker) {
      clearInterval(this.indexingWorker);
      this.indexingWorker = null;
    }
  }

  enqueueIndexDocument(documentId: number) {
    if (this.searchEngineService.isFallbackMode()) {
      return;
    }
    if (!Number.isInteger(documentId) || documentId <= 0) {
      return;
    }
    void this.enqueueIndexDocumentJob(documentId);
  }

  async indexDocument(documentId: number) {
    await this.indexDocumentNow(documentId);
  }

  async reindexAll() {
    if (this.searchEngineService.isFallbackMode()) {
      return {
        engine: 'fallback' as const,
        indexed: 0,
        failed: 0,
        total: 0,
        durationMs: 0,
        skipped: true,
        reason: 'SEARCH_MODE=fallback',
      };
    }

    const ready = await this.searchEngineService.ensureElasticReady();
    if (!ready) {
      if (this.searchEngineService.isElasticOnlyMode()) {
        throw new ServiceUnavailableException('Elasticsearch no disponible');
      }
      return {
        engine: 'fallback' as const,
        indexed: 0,
        failed: 0,
        total: 0,
        durationMs: 0,
        skipped: true,
        reason: 'Elasticsearch no disponible',
      };
    }

    const startedAt = new Date();
    const started = performance.now();
    const documents = await this.documentRepo.find({ select: ['id'] });
    const failures: Array<{ documentId: number; error: string }> = [];
    let indexed = 0;

    for (const document of documents) {
      try {
        await this.indexDocument(document.id);
        indexed += 1;
      } catch (error) {
        failures.push({
          documentId: document.id,
          error: (error as Error).message,
        });
      }
    }

    try {
      await this.searchEngineService
        .getClient()
        .indices.refresh({ index: this.searchEngineService.getIndexName() });
    } catch (error) {
      writeAppLog({
        level: 'warn',
        event: 'search_refresh_failed',
        message: 'Fallo el refresh del indice de Elasticsearch',
        data: {
          indexName: this.searchEngineService.getIndexName(),
          error: (error as Error).message,
        },
      });
    }

    const durationMs = Math.round(performance.now() - started);
    this.searchStateService.setReindexResult({
      startedAt,
      durationMs,
      total: documents.length,
      failed: failures.length,
    });
    this.backendMetricsService.recordSearchReindex({
      total: documents.length,
      failed: failures.length,
    });

    return {
      engine: 'elastic' as const,
      indexed,
      failed: failures.length,
      total: documents.length,
      durationMs,
      failures,
    };
  }

  async getIndexStatus() {
    const state = this.searchStateService.getSnapshot();
    const queue = await this.getIndexQueueSnapshot();
    const failedIndexJobs = await this.searchIndexJobRepo.count({
      where: { status: SearchIndexJobStatus.Failed },
    });

    if (this.searchEngineService.isFallbackMode()) {
      return {
        engine: 'fallback' as const,
        indexName: this.searchEngineService.getIndexName(),
        esAvailable: false,
        pendingIndexJobs: queue.pendingJobs,
        failedIndexJobs,
        queue,
        docsCount: null,
        ...state,
      };
    }

    const ready = await this.searchEngineService.ensureElasticReady();
    if (!ready) {
      if (this.searchEngineService.isElasticOnlyMode()) {
        throw new ServiceUnavailableException('Elasticsearch no disponible');
      }
      return {
        engine: 'fallback' as const,
        indexName: this.searchEngineService.getIndexName(),
        esAvailable: false,
        pendingIndexJobs: queue.pendingJobs,
        failedIndexJobs,
        queue,
        docsCount: null,
        ...state,
      };
    }

    const count = await this.searchEngineService.getClient().count({
      index: this.searchEngineService.getIndexName(),
    });

    return {
      engine: 'elastic' as const,
      indexName: this.searchEngineService.getIndexName(),
      esAvailable: true,
      pendingIndexJobs: queue.pendingJobs,
      failedIndexJobs,
      queue,
      docsCount: count.count ?? 0,
      ...state,
    };
  }

  private async enqueueIndexDocumentJob(documentId: number) {
    try {
      const now = new Date();
      const current = await this.searchIndexJobRepo.findOne({
        where: { documentId },
        select: ['id'],
      });

      if (!current) {
        try {
          await this.searchIndexJobRepo.insert({
            documentId,
            status: SearchIndexJobStatus.Pending,
            attempts: 0,
            nextAttemptAt: now,
            lastError: null,
          });
        } catch (error) {
          if (!this.isUniqueConstraintError(error)) {
            throw error;
          }
          await this.searchIndexJobRepo.update(
            { documentId },
            {
              status: SearchIndexJobStatus.Pending,
              attempts: 0,
              nextAttemptAt: now,
              lastError: null,
            },
          );
        }
      } else {
        await this.searchIndexJobRepo.update(
          { documentId },
          {
            status: SearchIndexJobStatus.Pending,
            attempts: 0,
            nextAttemptAt: now,
            lastError: null,
          },
        );
      }

      this.backendMetricsService.recordSearchQueueEnqueued(
        await this.getIndexQueueSnapshot(),
      );
      void this.processIndexQueue();
    } catch (error) {
      writeAppLog({
        level: 'warn',
        event: 'search_queue_enqueue_failed',
        message: 'No se pudo encolar el trabajo de indexacion',
        data: { documentId, error: (error as Error).message },
      });
    }
  }

  private async indexDocumentNow(documentId: number) {
    await this.searchEngineService.ensureElasticReadyOrThrow();

    const document = await this.documentRepo.findOne({
      where: { id: documentId },
      relations: ['category', 'documentType', 'areaCode'],
    });
    if (!document) {
      return;
    }

    const latestVersion = await this.versionRepo.findOne({
      where: { document: { id: documentId } },
      order: { createdAt: 'DESC' },
    });

    const body = {
      documentId: String(document.id),
      codigo: document.codigo ?? null,
      nombre: document.nombre,
      status: document.status,
      categoryId: document.category?.id?.toString() ?? null,
      categoryNombre: document.category?.nombre ?? null,
      documentTypeCode: document.documentType?.code ?? null,
      documentTypeNombre: document.documentType?.nombreLargo ?? null,
      areaCode: document.areaCode?.code ?? null,
      areaNombre: document.areaCode?.nombre ?? null,
      latestVersionId: latestVersion?.id?.toString() ?? null,
      latestComentario: latestVersion?.comentario ?? null,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      content: latestVersion?.contentText ?? null,
    };

    try {
      await this.searchEngineService.getClient().index({
        index: this.searchEngineService.getIndexName(),
        id: String(documentId),
        document: body,
      });
      await this.searchIndexJobRepo.delete({ documentId });
      this.backendMetricsService.recordSearchIndexSuccess(
        await this.getIndexQueueSnapshot(),
      );
    } catch (error) {
      writeAppLog({
        level: 'warn',
        event: 'search_index_failed',
        message: 'No se pudo indexar el documento en Elasticsearch',
        data: { documentId, error: (error as Error).message },
      });
      this.backendMetricsService.recordSearchIndexFailure(
        await this.getIndexQueueSnapshot(),
      );
      throw error;
    }
  }

  private startIndexingWorker() {
    if (
      this.searchEngineService.isFallbackMode() ||
      this.indexingWorker ||
      !this.shouldRunWorker()
    ) {
      return;
    }
    this.indexingWorker = setInterval(() => {
      void this.processIndexQueue();
    }, this.indexingWorkerIntervalMs);
    void this.recordQueueWorkerSnapshot();
  }

  private async processIndexQueue() {
    if (
      this.searchEngineService.isFallbackMode() ||
      this.processingIndexQueue ||
      !this.shouldRunWorker()
    ) {
      return;
    }
    this.processingIndexQueue = true;
    try {
      const now = new Date();
      this.backendMetricsService.recordSearchQueueWorker(
        await this.getIndexQueueSnapshot(now),
      );
      const dueJobs = await this.searchIndexJobRepo.find({
        where: {
          status: SearchIndexJobStatus.Pending,
          nextAttemptAt: LessThanOrEqual(now),
        },
        order: {
          nextAttemptAt: 'ASC',
          id: 'ASC',
        },
        take: this.indexingBatchSize,
      });

      for (const job of dueJobs) {
        const documentId = job.documentId;
        try {
          await this.indexDocumentNow(documentId);
        } catch (error) {
          const attempts = job.attempts + 1;
          if (attempts >= this.indexingMaxRetries) {
            await this.searchIndexJobRepo.update(
              { id: job.id },
              {
                status: SearchIndexJobStatus.Failed,
                attempts,
                nextAttemptAt: new Date(),
                lastError: (error as Error).message,
              },
            );
            writeAppLog({
              level: 'warn',
              event: 'search_index_dropped',
              message:
                'Se descarto un trabajo de indexacion por superar reintentos',
              data: {
                documentId,
                attempts,
                error: (error as Error).message,
              },
            });
            this.backendMetricsService.recordSearchIndexDropped(
              await this.getIndexQueueSnapshot(),
            );
            continue;
          }
          const delay = this.getRetryDelayMs(attempts);
          await this.searchIndexJobRepo.update(
            { id: job.id },
            {
              status: SearchIndexJobStatus.Pending,
              attempts,
              nextAttemptAt: new Date(Date.now() + delay),
              lastError: (error as Error).message,
            },
          );
          writeAppLog({
            level: 'warn',
            event: 'search_index_retry',
            message: 'Reintentando indexacion de documento',
            data: {
              documentId,
              attempts,
              maxRetries: this.indexingMaxRetries,
              retryInMs: delay,
            },
          });
          this.backendMetricsService.recordSearchIndexRetry(
            await this.getIndexQueueSnapshot(),
          );
        }
      }
    } finally {
      this.processingIndexQueue = false;
      this.backendMetricsService.recordSearchQueueWorker(
        await this.getIndexQueueSnapshot(),
      );
    }
  }

  private getRetryDelayMs(attempt: number) {
    const exponential =
      this.indexingRetryBaseMs * 2 ** Math.max(attempt - 1, 0);
    return Math.min(exponential, this.indexingRetryMaxMs);
  }

  private isUniqueConstraintError(error: unknown) {
    const code =
      typeof error === 'object' && error != null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';
    return code === '2601' || code === '2627';
  }

  private async recordQueueWorkerSnapshot(now = new Date()) {
    this.backendMetricsService.recordSearchQueueWorker(
      await this.getIndexQueueSnapshot(now),
    );
  }

  private async getIndexQueueSnapshot(now = new Date()) {
    const queueStats = await this.searchIndexJobRepo
      .createQueryBuilder('job')
      .select('COUNT(1)', 'pendingJobs')
      .addSelect(
        'SUM(CASE WHEN job.nextAttemptAt <= :now THEN 1 ELSE 0 END)',
        'dueJobs',
      )
      .addSelect('MIN(job.nextAttemptAt)', 'oldestNextAttemptAt')
      .where('job.status = :status', { status: SearchIndexJobStatus.Pending })
      .setParameter('now', now)
      .getRawOne<{
        pendingJobs?: string | number | null;
        dueJobs?: string | number | null;
        oldestNextAttemptAt?: string | Date | null;
      }>();

    const pendingJobs = Number(queueStats?.pendingJobs ?? 0);
    const dueJobs = Number(queueStats?.dueJobs ?? 0);
    const oldestNextAttemptAt = queueStats?.oldestNextAttemptAt
      ? new Date(queueStats.oldestNextAttemptAt)
      : null;

    return {
      pendingJobs,
      dueJobs,
      oldestJobAgeMs:
        oldestNextAttemptAt == null
          ? null
          : Math.max(0, now.getTime() - oldestNextAttemptAt.getTime()),
      processing: this.processingIndexQueue,
      workerRunning: this.indexingWorker != null,
    };
  }

  private shouldRunWorker() {
    return this.runtimeRole === 'both' || this.runtimeRole === 'worker';
  }

  private resolveRuntimeRole() {
    const value = (process.env.APP_RUNTIME_ROLE ?? 'both').trim().toLowerCase();
    if (
      value === 'both' ||
      value === 'web' ||
      value === 'worker' ||
      value === 'disabled'
    ) {
      return value;
    }
    return 'both';
  }
}
