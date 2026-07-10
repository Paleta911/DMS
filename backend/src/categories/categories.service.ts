// Categories facade delegates document classification queries and mutations to specialized services

import { Injectable } from '@nestjs/common';
import { CategoriesMutationService } from './categories-mutation.service';
import { CategoriesQueryService } from './categories-query.service';

@Injectable()
export class CategoriesService {
  // Facade pattern: thin layer orchestrating query and mutation services for categories
  constructor(
    private readonly queryService: CategoriesQueryService,
    private readonly mutationService: CategoriesMutationService,
  ) {}

  create(nombre: string) {
    return this.mutationService.create(nombre);
  }

  findAll(params?: {
    q?: string;
    includeInactive?: boolean;
    status?: 'active' | 'inactive' | 'all';
    page?: number;
    limit?: number;
  }) {
    return this.queryService.findAll(params);
  }

  async update(id: number, params: { nombre?: string; activo?: boolean }) {
    return this.mutationService.update(id, params);
  }

  async remove(id: number) {
    return this.mutationService.remove(id);
  }

  async hardDelete(id: number) {
    return this.mutationService.hardDelete(id);
  }
}
