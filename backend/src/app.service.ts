import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SearchService } from './search/search.service';
import { getRequestId } from './common/request-context';

@Injectable()
export class AppService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly searchService: SearchService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async healthCheck() {
    const requestId = getRequestId();
    // Check both database and search engine (Elasticsearch) connectivity with caching
    const esStatus = await this.searchService.checkElasticHealthCached(
      200,
      10000,
    );
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ok',
        db: 'up',
        es: esStatus.status,
        ...(requestId ? { requestId } : {}),
      };
    } catch (error) {
      // Log partial health if DB fails (service still returns ok with degraded db status)
      return {
        status: 'ok',
        db: 'down',
        es: esStatus.status,
        ...(requestId ? { requestId } : {}),
      };
    }
  }
}
