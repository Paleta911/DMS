import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaCode } from './area-code.entity';

// Query service for area catalogs with optional status filter, search, and pagination.
@Injectable()
export class AreaCodesQueryService {
  constructor(
    @InjectRepository(AreaCode)
    private readonly areaCodeRepo: Repository<AreaCode>,
  ) {}

  async findAll(params?: {
    q?: string;
    includeInactive?: boolean;
    status?: 'active' | 'inactive' | 'all';
    page?: number;
    limit?: number;
  }) {
    const q = params?.q?.trim();
    // Keep default behavior backwards compatible: only active records unless requested.
    const status =
      params?.status ?? (params?.includeInactive ? 'all' : 'active');
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const qb = this.areaCodeRepo
      .createQueryBuilder('areaCode')
      .orderBy('areaCode.code', 'ASC');

    if (status === 'active') {
      qb.andWhere('areaCode.activo = :activo', { activo: true });
    } else if (status === 'inactive') {
      qb.andWhere('areaCode.activo = :activo', { activo: false });
    }

    if (q) {
      qb.andWhere(
        '(LOWER(areaCode.code) LIKE :q OR LOWER(areaCode.nombre) LIKE :q)',
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

  findActiveList() {
    // Public consumers (e.g., registration flow) only need active areas.
    return this.findAll({ includeInactive: false }) as Promise<AreaCode[]>;
  }
}
