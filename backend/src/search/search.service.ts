import { Injectable } from '@nestjs/common';
import { SearchIndexingService } from './search-indexing.service';
import { SearchQueryService } from './search-query.service';
import { SearchEngineService } from './search-engine.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly searchIndexingService: SearchIndexingService,
    private readonly searchQueryService: SearchQueryService,
    private readonly searchEngineService: SearchEngineService,
  ) {}

  enqueueIndexDocument(documentId: number) {
    this.searchIndexingService.enqueueIndexDocument(documentId);
  }

  indexDocument(documentId: number) {
    return this.searchIndexingService.indexDocument(documentId);
  }

  reindexAll() {
    return this.searchIndexingService.reindexAll();
  }

  search(params: {
    q?: string;
    categoryId?: string;
    documentTypeCode?: string;
    areaCode?: string;
    allowedAreaCodes?: string[] | null;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    return this.searchQueryService.search(params);
  }

  getIndexStatus() {
    return this.searchIndexingService.getIndexStatus();
  }

  checkElasticHealth(timeoutMs = 1000) {
    return this.searchEngineService.checkElasticHealth(timeoutMs);
  }

  checkElasticHealthCached(timeoutMs = 200, ttlMs = 10000) {
    return this.searchEngineService.checkElasticHealthCached(timeoutMs, ttlMs);
  }
}
