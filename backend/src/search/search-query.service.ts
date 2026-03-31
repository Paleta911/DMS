import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Document } from '../documents/document.entity';
import { Version } from '../versions/version.entity';
import { writeAppLog } from '../common/logging.utils';
import { BackendMetricsService } from '../observability/backend-metrics.service';
import { SearchEngineService } from './search-engine.service';

@Injectable()
export class SearchQueryService {
  constructor(
    private readonly searchEngineService: SearchEngineService,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(Version)
    private readonly versionRepo: Repository<Version>,
    private readonly backendMetricsService: BackendMetricsService,
  ) {}

  async search(params: {
    q?: string;
    categoryId?: string;
    documentTypeCode?: string;
    areaCode?: string;
    allowedAreaCodes?: string[] | null;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    engine: 'elastic' | 'fallback';
    items: Array<Record<string, unknown>>;
    total: number | { value: number; relation: string };
    page: number;
    limit: number;
  }> {
    if (this.searchEngineService.isFallbackMode()) {
      writeAppLog({
        level: 'warn',
        event: 'search_fallback_enabled',
        message: 'Busqueda en modo fallback',
      });
      this.backendMetricsService.recordSearchQuery('fallback');
      return this.searchFallback(params);
    }

    const ready = await this.searchEngineService.ensureElasticReady();
    if (!ready) {
      if (this.searchEngineService.isElasticOnlyMode()) {
        throw new ServiceUnavailableException('Elasticsearch no disponible');
      }
      writeAppLog({
        level: 'warn',
        event: 'search_fallback_enabled',
        message: 'Busqueda en modo fallback',
      });
      this.backendMetricsService.recordSearchQuery('fallback');
      return this.searchFallback(params);
    }

    if (params.allowedAreaCodes && params.allowedAreaCodes.length === 0) {
      return {
        engine: 'elastic',
        items: [],
        total: 0,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      };
    }

    const should: Array<Record<string, unknown>> = [];
    const filter: Array<Record<string, unknown>> = [];

    if (params.q) {
      const q = params.q.toUpperCase();
      should.push({
        multi_match: {
          query: params.q,
          fields: [
            'codigo^3',
            'nombre^3',
            'categoryNombre',
            'documentTypeNombre',
            'areaNombre',
            'latestComentario',
            'content',
          ],
        },
      });
      should.push({ prefix: { codigo: q } });
      should.push({ term: { documentTypeCode: q } });
      should.push({ term: { areaCode: q } });
    }

    if (params.categoryId) {
      filter.push({ term: { categoryId: params.categoryId } });
    }

    if (params.documentTypeCode) {
      filter.push({
        term: { documentTypeCode: params.documentTypeCode.toUpperCase() },
      });
    }

    if (params.areaCode) {
      filter.push({ term: { areaCode: params.areaCode.toUpperCase() } });
    }

    if (params.allowedAreaCodes) {
      filter.push({ terms: { areaCode: params.allowedAreaCodes } });
    }

    if (params.from || params.to) {
      filter.push({
        range: {
          createdAt: {
            gte: params.from,
            lte: params.to,
          },
        },
      });
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const from = (page - 1) * limit;

    try {
      const boolQuery: Record<string, unknown> = { filter };
      if (should.length > 0) {
        boolQuery.should = should;
        boolQuery.minimum_should_match = 1;
      }

      const response = await this.searchEngineService.getClient().search({
        index: this.searchEngineService.getIndexName(),
        from,
        size: limit,
        query: { bool: boolQuery },
      });

      const hits = response.hits.hits.map((hit) => ({
        score: hit._score,
        ...(hit._source as Record<string, unknown>),
      }));
      this.backendMetricsService.recordSearchQuery('elastic');

      return {
        engine: 'elastic',
        items: hits,
        total: response.hits.total ?? 0,
        page,
        limit,
      };
    } catch (error) {
      writeAppLog({
        level: 'warn',
        event: 'search_query_failed',
        message: 'Fallo la consulta en Elasticsearch',
        data: { error: (error as Error).message },
      });
      if (this.searchEngineService.isElasticOnlyMode()) {
        throw new ServiceUnavailableException('Elasticsearch no disponible');
      }
      writeAppLog({
        level: 'warn',
        event: 'search_fallback_enabled',
        message: 'Busqueda en modo fallback',
      });
      this.backendMetricsService.recordSearchQuery('fallback');
      return this.searchFallback(params);
    }
  }

  private async searchFallback(params: {
    q?: string;
    categoryId?: string;
    documentTypeCode?: string;
    areaCode?: string;
    allowedAreaCodes?: string[] | null;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    engine: 'fallback';
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    limit: number;
  }> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;
    const qb = this.buildFallbackQuery(params);

    if (params.categoryId) {
      qb.andWhere('category.id = :categoryId', {
        categoryId: Number(params.categoryId),
      });
    }

    if (params.documentTypeCode) {
      qb.andWhere('documentType.code = :documentTypeCode', {
        documentTypeCode: params.documentTypeCode.toUpperCase(),
      });
    }

    if (params.areaCode) {
      qb.andWhere('areaCode.code = :areaCode', {
        areaCode: params.areaCode.toUpperCase(),
      });
    }

    if (params.allowedAreaCodes) {
      if (params.allowedAreaCodes.length === 0) {
        return { engine: 'fallback', items: [], total: 0, page, limit };
      }
      qb.andWhere('areaCode.code IN (:...allowed)', {
        allowed: params.allowedAreaCodes,
      });
    }

    if (params.from) {
      qb.andWhere('document.createdAt >= :from', { from: params.from });
    }

    if (params.to) {
      qb.andWhere('document.createdAt <= :to', { to: params.to });
    }

    const total = await qb
      .clone()
      .select('document.id')
      .distinct(true)
      .getCount();
    const { entities: documents } = await qb.skip(skip).take(limit).getRawAndEntities();

    const ids = documents.map((document) => document.id);
    const latestByDocument = new Map<number, Version>();

    if (ids.length > 0) {
      const latestQuery = this.versionRepo
        .createQueryBuilder('version')
        .addSelect('version.documentId', 'documentId')
        .where('version.documentId IN (:...ids)', { ids })
        .andWhere((sub) => {
          const query = sub
            .subQuery()
            .select('MAX(v2.id)')
            .from(Version, 'v2')
            .where('v2.documentId = version.documentId')
            .getQuery();
          return `version.id IN ${query}`;
        });

      const { entities, raw } = await latestQuery.getRawAndEntities();
      entities.forEach((entity, index) => {
        const docId = raw[index]?.documentId ?? raw[index]?.version_documentId;
        if (docId) {
          latestByDocument.set(Number(docId), entity);
        }
      });
    }

    const items = documents.map((document) => {
      const latestVersion = latestByDocument.get(document.id);

      return {
        documentId: String(document.id),
        codigo: document.codigo ?? null,
        nombre: document.nombre,
        score: null,
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
    });

    return {
      engine: 'fallback',
      items,
      total,
      page,
      limit,
    };
  }

  private buildFallbackQuery(params: {
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
    const latestVersionSubquery = this.versionRepo
      .createQueryBuilder('latestVersionMap')
      .select('latestVersionMap.documentId', 'documentId')
      .addSelect('MAX(latestVersionMap.id)', 'latestVersionId')
      .groupBy('latestVersionMap.documentId');

    const qb = this.documentRepo
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.category', 'category')
      .leftJoinAndSelect('document.documentType', 'documentType')
      .leftJoinAndSelect('document.areaCode', 'areaCode')
      .leftJoin(
        `(${latestVersionSubquery.getQuery()})`,
        'latestVersionMap',
        'latestVersionMap.documentId = document.id',
      )
      .leftJoin(
        Version,
        'latestVersion',
        'latestVersion.id = latestVersionMap.latestVersionId',
      )
      .setParameters(latestVersionSubquery.getParameters());

    const queryText = params.q?.trim().toLowerCase();
    if (!queryText) {
      qb.orderBy('document.createdAt', 'DESC');
      return qb;
    }

    const query = `%${queryText}%`;
    qb.addSelect(
      `
        CASE
          WHEN LOWER(COALESCE(document.codigo, '')) = :exactQuery THEN 0
          WHEN LOWER(COALESCE(document.codigo, '')) LIKE :prefixQuery THEN 1
          WHEN LOWER(document.nombre) LIKE :prefixQuery THEN 2
          WHEN LOWER(COALESCE(document.codigo, '')) LIKE :likeQuery THEN 3
          WHEN LOWER(document.nombre) LIKE :likeQuery THEN 4
          WHEN LOWER(COALESCE(latestVersion.originalName, '')) LIKE :likeQuery THEN 5
          WHEN LOWER(COALESCE(latestVersion.comentario, '')) LIKE :likeQuery THEN 6
          WHEN LOWER(COALESCE(latestVersion.contentText, '')) LIKE :likeQuery THEN 7
          ELSE 8
        END
      `,
      'matchRank',
    );
    qb.andWhere(
      new Brackets((searchQb) => {
        searchQb
          .where('LOWER(COALESCE(document.codigo, \'\')) LIKE :likeQuery')
          .orWhere('LOWER(document.nombre) LIKE :likeQuery')
          .orWhere(
            'LOWER(COALESCE(latestVersion.originalName, \'\')) LIKE :likeQuery',
          )
          .orWhere(
            'LOWER(COALESCE(latestVersion.comentario, \'\')) LIKE :likeQuery',
          )
          .orWhere(
            'LOWER(COALESCE(latestVersion.contentText, \'\')) LIKE :likeQuery',
          );
      }),
    );
    qb.setParameters({
      exactQuery: queryText,
      prefixQuery: `${queryText}%`,
      likeQuery: query,
    });
    qb.orderBy('matchRank', 'ASC').addOrderBy('document.updatedAt', 'DESC');
    return qb;
  }
}
