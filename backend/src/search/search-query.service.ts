import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Document } from '../documents/document.entity';
import { Version } from '../versions/version.entity';
import { writeAppLog } from '../common/logging.utils';
import { BackendMetricsService } from '../observability/backend-metrics.service';
import { SearchEngineService } from './search-engine.service';
import { DocumentStatus } from '../documents/document-status.enum';
import { DocumentVisibilityService } from '../document-visibility/document-visibility.service';

function normalizeDateRangeStart(value?: string) {
  if (!value) {
    return undefined;
  }
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function normalizeDateRangeEnd(value?: string) {
  if (!value) {
    return undefined;
  }
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

@Injectable()
export class SearchQueryService {
  constructor(
    private readonly searchEngineService: SearchEngineService,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(Version)
    private readonly versionRepo: Repository<Version>,
    private readonly backendMetricsService: BackendMetricsService,
    private readonly documentVisibilityService: DocumentVisibilityService,
  ) {}

  async search(params: {
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

    const visibleStatuses =
      await this.documentVisibilityService.getVisibleStatusesForActor(
        params.includeHiddenStatuses,
      );
    if (!params.includeHiddenStatuses && visibleStatuses.length === 0) {
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

    if (
      params.status &&
      !params.includeHiddenStatuses &&
      !visibleStatuses.includes(params.status)
    ) {
      return {
        engine: 'elastic',
        items: [],
        total: 0,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      };
    }

    if (params.allowedAreaCodes) {
      filter.push({ terms: { areaCode: params.allowedAreaCodes } });
    }

    const searchFrom = normalizeDateRangeStart(params.from);
    const searchTo = normalizeDateRangeEnd(params.to);

    if (searchFrom || searchTo) {
      filter.push({
        range: {
          updatedAt: {
            gte: searchFrom,
            lte: searchTo,
          },
        },
      });
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;
    const candidateSize = Math.min(Math.max(offset + limit * 5, limit), 200);

    try {
      const boolQuery: Record<string, unknown> = { filter };
      if (should.length > 0) {
        boolQuery.should = should;
        boolQuery.minimum_should_match = 1;
      }

      const response = await this.searchEngineService.getClient().search({
        index: this.searchEngineService.getIndexName(),
        from: 0,
        size: candidateSize,
        query: { bool: boolQuery },
      });

      const rawHits = response.hits.hits.map((hit) => ({
        score: hit._score,
        ...(hit._source as Record<string, unknown>),
      }));
      const hits = await this.reconcileElasticHits(rawHits, {
        visibleStatuses,
        includeHiddenStatuses: params.includeHiddenStatuses,
        requestedStatus: params.status,
      });
      this.backendMetricsService.recordSearchQuery('elastic');

      return {
        engine: 'elastic',
        items: hits.slice(offset, offset + limit),
        total: hits.length < candidateSize ? hits.length : response.hits.total ?? 0,
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
    status?: DocumentStatus;
    allowedAreaCodes?: string[] | null;
    includeHiddenStatuses?: boolean;
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
    const visibleStatuses =
      await this.documentVisibilityService.getVisibleStatusesForActor(
        params.includeHiddenStatuses,
      );
    if (!params.includeHiddenStatuses && visibleStatuses.length === 0) {
      return { engine: 'fallback', items: [], total: 0, page, limit };
    }

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

    if (params.status) {
      if (
        !params.includeHiddenStatuses &&
        !visibleStatuses.includes(params.status)
      ) {
        return { engine: 'fallback', items: [], total: 0, page, limit };
      }
      qb.andWhere('document.status = :status', {
        status: params.status,
      });
    } else if (!params.includeHiddenStatuses) {
      qb.andWhere('document.status IN (:...visibleStatuses)', {
        visibleStatuses,
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

    const from = normalizeDateRangeStart(params.from);
    if (from) {
      qb.andWhere('document.updatedAt >= :from', { from });
    }

    const to = normalizeDateRangeEnd(params.to);
    if (to) {
      qb.andWhere('document.updatedAt <= :to', { to });
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
        isInternal: document.isInternal,
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
    status?: DocumentStatus;
    allowedAreaCodes?: string[] | null;
    includeHiddenStatuses?: boolean;
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

  private async reconcileElasticHits(
    hits: Array<Record<string, unknown>>,
    params: {
      visibleStatuses: DocumentStatus[];
      includeHiddenStatuses?: boolean;
      requestedStatus?: DocumentStatus;
    },
  ): Promise<Array<Record<string, unknown>>> {
    const ids = hits
      .map((hit) => Number(hit.documentId))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (ids.length === 0) {
      return hits;
    }

    const documents = await this.documentRepo.find({
      where: { id: In(ids) },
      relations: ['category', 'documentType', 'areaCode'],
    });
    const documentsById = new Map(documents.map((document) => [document.id, document]));

    const reconciledHits: Array<Record<string, unknown> | null> = hits
      .map((hit) => {
        const document = documentsById.get(Number(hit.documentId));
        if (!document) {
          return null;
        }

        if (
          !params.includeHiddenStatuses &&
          !params.visibleStatuses.includes(document.status)
        ) {
          return null;
        }

        if (params.requestedStatus && document.status !== params.requestedStatus) {
          return null;
        }

        return {
          ...hit,
          documentId: String(document.id),
          codigo: document.codigo ?? null,
          isInternal: document.isInternal,
          nombre: document.nombre,
          status: document.status,
          categoryId: document.category?.id?.toString() ?? null,
          categoryNombre: document.category?.nombre ?? null,
          documentTypeCode: document.documentType?.code ?? null,
          documentTypeNombre: document.documentType?.nombreLargo ?? null,
          areaCode: document.areaCode?.code ?? null,
          areaNombre: document.areaCode?.nombre ?? null,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        };
      });

    return reconciledHits.filter(
      (hit): hit is Record<string, unknown> => hit !== null,
    );
  }
}
