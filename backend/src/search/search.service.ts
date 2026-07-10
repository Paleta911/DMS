import { Injectable } from '@nestjs/common';
import { SearchIndexingService } from './search-indexing.service';
import { SearchQueryService } from './search-query.service';
import { SearchEngineService } from './search-engine.service';
import { DocumentStatus } from '../documents/document-status.enum';

@Injectable()
export class SearchService {
  constructor(
    private readonly searchIndexingService: SearchIndexingService,
    private readonly searchQueryService: SearchQueryService,
    private readonly searchEngineService: SearchEngineService,
  ) {}

  enqueueIndexDocument(documentId: number) {
    // Cola asincrona: ideal para eventos de escritura sin bloquear la request.
    this.searchIndexingService.enqueueIndexDocument(documentId);
  }

  indexDocument(documentId: number) {
    // Indexacion directa para flujos que requieren sincronizacion inmediata.
    return this.searchIndexingService.indexDocument(documentId);
  }

  reindexAll() {
    // Reproceso completo del indice ante migraciones o recuperacion.
    return this.searchIndexingService.reindexAll();
  }

  search(params: {
    q?: string;
    categoryId?: string;
    documentTypeCode?: string;
    areaCode?: string;
    status?: DocumentStatus;
    allowedAreaCodes?: string[] | null;
    includeHiddenStatuses?: boolean;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    // Query service decides elastic vs fallback behavior transparently.
    return this.searchQueryService.search(params);
  }

  getIndexStatus() {
    return this.searchIndexingService.getIndexStatus();
  }

  checkElasticHealth(timeoutMs = 1000) {
    return this.searchEngineService.checkElasticHealth(timeoutMs);
  }

  checkElasticHealthCached(timeoutMs = 200, ttlMs = 10000) {
    // Cached probe reduces repeated health calls from high-traffic endpoints.
    return this.searchEngineService.checkElasticHealthCached(timeoutMs, ttlMs);
  }
}
