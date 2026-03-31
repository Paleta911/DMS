import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './document.entity';
import { Version } from '../versions/version.entity';
import { DocumentsAccessService } from './documents-access.service';

@Injectable()
export class DocumentsQueryService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(Version)
    private readonly versionRepo: Repository<Version>,
    private readonly documentsAccessService: DocumentsAccessService,
  ) {}

  async list(params: {
    page?: number;
    limit?: number;
    categoryId?: string;
    documentTypeCode?: string;
    areaCode?: string;
    sortByName?: 'az' | 'za';
    allowedAreaCodes?: string[] | null;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const take = limit;
    const skip = (page - 1) * limit;
    const qb = this.documentRepo
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.category', 'category')
      .leftJoinAndSelect('document.documentType', 'documentType')
      .leftJoinAndSelect('document.areaCode', 'areaCode')
      .skip(skip)
      .take(take);

    if (params.allowedAreaCodes && params.allowedAreaCodes.length === 0) {
      return { items: [], total: 0, page, limit };
    }

    if (params.allowedAreaCodes) {
      qb.andWhere('areaCode.code IN (:...allowed)', {
        allowed: params.allowedAreaCodes,
      });
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

    if (params.sortByName === 'az') {
      qb.orderBy('document.nombre', 'ASC').addOrderBy('document.createdAt', 'DESC');
    } else if (params.sortByName === 'za') {
      qb.orderBy('document.nombre', 'DESC').addOrderBy('document.createdAt', 'DESC');
    } else {
      qb.orderBy('document.createdAt', 'DESC');
    }

    const [items, total] = await qb.getManyAndCount();

    const ids = items.map((item) => item.id);
    const latestByDocument = new Map<number, Version>();

    if (ids.length > 0) {
      const latestQuery = this.versionRepo
        .createQueryBuilder('version')
        .leftJoinAndSelect('version.uploadedBy', 'uploadedBy')
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

    const withLatest = items.map((document) => ({
      ...document,
      latestVersion: latestByDocument.get(document.id) ?? null,
    }));

    return { items: withLatest, total, page, limit };
  }

  async findOne(
    id: number,
    versionsLimit = 5,
    allowedAreaCodes?: string[] | null,
  ) {
    const document = await this.documentsAccessService.ensureAccess(
      id,
      allowedAreaCodes,
      {
        areaCode: true,
        category: true,
        documentType: true,
        createdBy: true,
      },
    );

    const versions = await this.versionRepo.find({
      where: { document: { id } },
      order: { createdAt: 'DESC' },
      take: versionsLimit,
      relations: ['uploadedBy'],
    });

    const latestVersion = versions[0] ?? null;
    return { ...document, versions, latestVersion };
  }

  async findVersionsByDocument(
    documentId: number,
    allowedAreaCodes?: string[] | null,
  ) {
    await this.documentsAccessService.ensureAccess(documentId, allowedAreaCodes, {
      areaCode: true,
    });
    return this.versionRepo.find({
      where: { document: { id: documentId } },
      order: { createdAt: 'DESC' },
      relations: ['uploadedBy'],
    });
  }
}
