import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentType } from './document-type.entity';

@Injectable()
export class DocumentTypesQueryService {
  constructor(
    @InjectRepository(DocumentType)
    private readonly documentTypeRepo: Repository<DocumentType>,
  ) {}

  async findAll(params?: {
    q?: string;
    includeInactive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const q = params?.q?.trim();
    const includeInactive = params?.includeInactive ?? false;
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const qb = this.documentTypeRepo
      .createQueryBuilder('documentType')
      .orderBy('documentType.code', 'ASC');

    if (!includeInactive) {
      qb.andWhere('documentType.activo = :activo', { activo: true });
    }

    if (q) {
      qb.andWhere(
        '(LOWER(documentType.code) LIKE :q OR LOWER(documentType.nombreLargo) LIKE :q)',
        { q: `%${q.toLowerCase()}%` },
      );
    }

    if (params?.page || params?.limit || q || includeInactive) {
      const skip = (page - 1) * limit;
      const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
      return { items, total, page, limit };
    }

    return qb.getMany();
  }
}
