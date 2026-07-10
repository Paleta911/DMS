import { Injectable } from '@nestjs/common';
import { AreaCode } from './area-code.entity';
import { AreaCodesMutationService } from './area-codes-mutation.service';
import { AreaCodesQueryService } from './area-codes-query.service';

// Area codes facade: delegates listing (with filters), active-only access, and CRUD operations to specialized services
// Area codes represent operational departments/divisions within the organization
@Injectable()
export class AreaCodesService {
  constructor(
    private readonly queryService: AreaCodesQueryService,
    private readonly mutationService: AreaCodesMutationService,
  ) {}

  // List areas with optional filtering (active/inactive status, pagination, keyword search)
  findAll(params?: {
    q?: string;
    includeInactive?: boolean;
    status?: 'active' | 'inactive' | 'all';
    page?: number;
    limit?: number;
  }) {
    return this.queryService.findAll(params);
  }

  findActiveList() {
    return this.queryService.findActiveList();
  }

  async create(payload: Partial<AreaCode>) {
    return this.mutationService.create(payload);
  }

  async update(id: number, payload: Partial<AreaCode>) {
    return this.mutationService.update(id, payload);
  }

  async remove(id: number) {
    return this.mutationService.remove(id);
  }

  async hardDelete(id: number) {
    return this.mutationService.hardDelete(id);
  }
}
