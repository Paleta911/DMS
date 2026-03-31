// src/versions/versions.service.ts

import { Injectable } from '@nestjs/common';
import { VersionsMutationService } from './versions-mutation.service';
import { VersionsQueryService } from './versions-query.service';

@Injectable()
export class VersionsService {
  constructor(
    private readonly queryService: VersionsQueryService,
    private readonly mutationService: VersionsMutationService,
  ) {}

  async create(params: {
    documentId: number;
    storedName: string;
    originalName: string;
    comentario?: string;
    uploadedById?: number;
  }) {
    return this.mutationService.create(params);
  }

  findByDocument(documentId: number) {
    return this.queryService.findByDocument(documentId);
  }

  async findById(id: number) {
    return this.queryService.findById(id);
  }

  async getDocumentAreaCode(documentId: number) {
    return this.mutationService.getDocumentAreaCode(documentId);
  }
}
