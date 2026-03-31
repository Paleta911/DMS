import { Injectable } from '@nestjs/common';
import { DocumentType } from './document-type.entity';
import { DocumentTypesMutationService } from './document-types-mutation.service';
import { DocumentTypesQueryService } from './document-types-query.service';

@Injectable()
export class DocumentTypesService {
  constructor(
    private readonly queryService: DocumentTypesQueryService,
    private readonly mutationService: DocumentTypesMutationService,
  ) {}

  findAll(params?: {
    q?: string;
    includeInactive?: boolean;
    page?: number;
    limit?: number;
  }) {
    return this.queryService.findAll(params);
  }

  async create(payload: Partial<DocumentType>) {
    return this.mutationService.create(payload);
  }

  async update(id: number, payload: Partial<DocumentType>) {
    return this.mutationService.update(id, payload);
  }

  async remove(id: number) {
    return this.mutationService.remove(id);
  }
}
