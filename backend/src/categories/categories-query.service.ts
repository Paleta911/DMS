import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoriesQueryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
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
    const qb = this.categoryRepo
      .createQueryBuilder('category')
      .orderBy('category.nombre', 'ASC');

    if (!includeInactive) {
      qb.andWhere('category.activo = :activo', { activo: true });
    }

    if (q) {
      qb.andWhere('LOWER(category.nombre) LIKE :q', {
        q: `%${q.toLowerCase()}%`,
      });
    }

    if (params?.page || params?.limit || q || includeInactive) {
      const skip = (page - 1) * limit;
      const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
      return { items, total, page, limit };
    }

    return qb.getMany();
  }
}
