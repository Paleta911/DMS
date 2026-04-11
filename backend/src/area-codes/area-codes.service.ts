import { Injectable } from '@nestjs/common';
import { AreaCode } from './area-code.entity';
import { AreaCodesMutationService } from './area-codes-mutation.service';
import { AreaCodesQueryService } from './area-codes-query.service';

@Injectable()
export class AreaCodesService {
  constructor(
    private readonly queryService: AreaCodesQueryService,
    private readonly mutationService: AreaCodesMutationService,
  ) {}

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
