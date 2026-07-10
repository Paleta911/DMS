import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentType } from './document-type.entity';

// Query service for document type catalog with filtering and pagination support.
@Injectable()
export class DocumentTypesQueryService {
  constructor(
    @InjectRepository(DocumentType)
    private readonly documentTypeRepo: Repository<DocumentType>,
  ) {}

  async findAll(params?: {
    q?: string;
    includeInactive?: boolean;
    status?: 'active' | 'inactive' | 'all';
    page?: number;
    limit?: number;
  }) {
    const q = params?.q?.trim();
    // Preserve legacy behavior: active-only unless explicitly widened.
    const status =
      params?.status ?? (params?.includeInactive ? 'all' : 'active');
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const qb = this.documentTypeRepo
      .createQueryBuilder('documentType')
      .orderBy('documentType.code', 'ASC');

    if (status === 'active') {
      qb.andWhere('documentType.activo = :activo', { activo: true });
    } else if (status === 'inactive') {
      qb.andWhere('documentType.activo = :activo', { activo: false });
    }

    if (q) {
      qb.andWhere(
        '(LOWER(documentType.code) LIKE :q OR LOWER(documentType.nombreLargo) LIKE :q)',
        { q: `%${q.toLowerCase()}%` },
      );
    }

    if (params?.page || params?.limit || q || status !== 'active') {
      const skip = (page - 1) * limit;
      const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
      return { items, total, page, limit };
    }

    return qb.getMany();
  }
}
