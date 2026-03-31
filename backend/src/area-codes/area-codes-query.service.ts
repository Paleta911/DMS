import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaCode } from './area-code.entity';

@Injectable()
export class AreaCodesQueryService {
  constructor(
    @InjectRepository(AreaCode)
    private readonly areaCodeRepo: Repository<AreaCode>,
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
    const qb = this.areaCodeRepo
      .createQueryBuilder('areaCode')
      .orderBy('areaCode.code', 'ASC');

    if (!includeInactive) {
      qb.andWhere('areaCode.activo = :activo', { activo: true });
    }

    if (q) {
      qb.andWhere(
        '(LOWER(areaCode.code) LIKE :q OR LOWER(areaCode.nombre) LIKE :q)',
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

  findActiveList() {
    return this.findAll({ includeInactive: false }) as Promise<AreaCode[]>;
  }
}
