import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

// Query service handles category listing with optional pagination, filtering by active status, and text search
@Injectable()
export class CategoriesQueryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  // List categories with optional filtering (active/inactive), pagination, and keyword search
  async findAll(params?: {
    q?: string;
    includeInactive?: boolean;
    status?: 'active' | 'inactive' | 'all';
    page?: number;
    limit?: number;
  }) {
    const q = params?.q?.trim();
    // Determine status filter: default active unless explicitly requested otherwise
    const status =
      params?.status ?? (params?.includeInactive ? 'all' : 'active');
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const qb = this.categoryRepo
      .createQueryBuilder('category')
      .orderBy('category.nombre', 'ASC');

    if (status === 'active') {
      qb.andWhere('category.activo = :activo', { activo: true });
    } else if (status === 'inactive') {
      qb.andWhere('category.activo = :activo', { activo: false });
    }

    if (q) {
      qb.andWhere('LOWER(category.nombre) LIKE :q', {
        q: `%${q.toLowerCase()}%`,
      });
    }

    if (params?.page || params?.limit || q || status !== 'active') {
      const skip = (page - 1) * limit;
      const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
      return { items, total, page, limit };
    }

    return qb.getMany();
  }
}
