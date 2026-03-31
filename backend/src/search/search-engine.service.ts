import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { getEnv } from '../common/env.utils';
import { BackendMetricsService } from '../observability/backend-metrics.service';
import { writeAppLog } from '../common/logging.utils';

@Injectable()
export class SearchEngineService {
  private readonly indexName: string;
  private readonly mode: 'auto' | 'elastic' | 'fallback';
  private esAvailable = true;
  private indexReady = false;
  private lastHealthCheck: { status: 'up' | 'down'; checkedAt: number } | null =
    null;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly backendMetricsService: BackendMetricsService,
  ) {
    this.indexName = getEnv('ES_INDEX_DOCUMENTS', 'dms_documents')!;
    const mode = (getEnv('SEARCH_MODE', 'auto') ?? 'auto').toLowerCase();
    this.mode = mode === 'elastic' || mode === 'fallback' ? mode : 'auto';
  }

  getIndexName() {
    return this.indexName;
  }

  getMode() {
    return this.mode;
  }

  getClient() {
    return this.elasticsearchService;
  }

  isFallbackMode() {
    return this.mode === 'fallback';
  }

  isElasticOnlyMode() {
    return this.mode === 'elastic';
  }

  async checkElasticHealth(timeoutMs = 1000) {
    if (this.isFallbackMode()) {
      return { status: 'down' as const };
    }
    const ready = await this.ensureElasticReady(timeoutMs);
    return { status: ready ? ('up' as const) : ('down' as const) };
  }

  async checkElasticHealthCached(timeoutMs = 200, ttlMs = 10000) {
    if (this.isFallbackMode()) {
      return { status: 'down' as const };
    }

    const now = Date.now();
    if (this.lastHealthCheck && now - this.lastHealthCheck.checkedAt < ttlMs) {
      return { status: this.lastHealthCheck.status };
    }

    try {
      await this.pingWithTimeout(timeoutMs);
      this.esAvailable = true;
      this.lastHealthCheck = { status: 'up', checkedAt: now };
      return { status: 'up' as const };
    } catch {
      this.esAvailable = false;
      this.lastHealthCheck = { status: 'down', checkedAt: now };
      return { status: 'down' as const };
    }
  }

  async ensureElasticReady(timeoutMs = 2000) {
    if (this.isFallbackMode()) {
      this.esAvailable = false;
      return false;
    }

    try {
      await this.pingWithTimeout(timeoutMs);
      this.esAvailable = true;
      this.backendMetricsService.recordElasticStatus('up');
      if (!this.indexReady) {
        await this.ensureIndex();
        this.indexReady = true;
      }
      return true;
    } catch (error) {
      this.esAvailable = false;
      this.backendMetricsService.recordElasticStatus(
        'down',
        (error as Error).message,
      );
      writeAppLog({
        level: 'warn',
        event: 'search_elastic_down',
        message: 'Elasticsearch no disponible',
        data: { error: (error as Error).message },
      });
      return false;
    }
  }

  async ensureElasticReadyOrThrow(timeoutMs = 2000) {
    const ready = await this.ensureElasticReady(timeoutMs);
    if (!ready) {
      throw new ServiceUnavailableException('Elasticsearch no disponible');
    }
  }

  private async pingWithTimeout(timeoutMs: number) {
    return Promise.race([
      this.elasticsearchService.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('ping timeout')), timeoutMs),
      ),
    ]);
  }

  private async ensureIndex() {
    const exists = await this.elasticsearchService.indices.exists({
      index: this.indexName,
    });
    if (!exists) {
      await this.elasticsearchService.indices.create({
        index: this.indexName,
        mappings: {
          properties: {
            documentId: { type: 'keyword' },
            codigo: { type: 'keyword' },
            nombre: { type: 'text' },
            status: { type: 'keyword' },
            categoryId: { type: 'keyword' },
            categoryNombre: { type: 'text' },
            documentTypeCode: { type: 'keyword' },
            documentTypeNombre: { type: 'text' },
            areaCode: { type: 'keyword' },
            areaNombre: { type: 'text' },
            latestVersionId: { type: 'keyword' },
            latestComentario: { type: 'text' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            content: { type: 'text' },
          },
        },
      });
    }
  }
}
