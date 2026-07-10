import { Injectable } from '@nestjs/common';
import { ApprovalDecision, ApprovalStep } from './document-approval.entity';
import { DocumentsFileService } from './documents-file.service';
import { DocumentsAccessService } from './documents-access.service';
import { DocumentsWorkflowService } from './documents-workflow.service';
import { DocumentsQueryService } from './documents-query.service';
import { DocumentsMutationService } from './documents-mutation.service';
import type { DocumentTextExtractionResult } from './document-text-extraction.types';
import { DocumentsContentMaintenanceService } from './documents-content-maintenance.service';
import { VersionTextSource } from '../versions/version-text-source.enum';
import { DocumentStatus } from './document-status.enum';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentsQueryService: DocumentsQueryService,
    private readonly documentsMutationService: DocumentsMutationService,
    private readonly documentsFileService: DocumentsFileService,
    private readonly documentsAccessService: DocumentsAccessService,
    private readonly documentsWorkflowService: DocumentsWorkflowService,
    private readonly documentsContentMaintenanceService: DocumentsContentMaintenanceService,
  ) {}

  async upload(params: {
    nombreDocumento: string;
    storedName: string;
    originalName: string;
    comentario?: string;
    categoryId?: number;
    isInternal?: boolean;
    documentId?: number;
    documentTypeCode?: string;
    areaCode?: string;
    consecutivo?: number;
    uploadedById: number;
    contentText?: string | null;
    textSource?: VersionTextSource;
    ocrApplied?: boolean;
    ocrPageCount?: number | null;
  }) {
    // Upload delegates persistence + version creation to mutation service.
    return this.documentsMutationService.upload(params);
  }

  assertUploadFileSignature(params: {
    filePath: string;
    originalName: string;
    mimeType: string;
  }) {
    this.documentsFileService.assertUploadFileSignature(params);
  }

  async extractContentText(params: {
    filePath: string;
    originalName: string;
    mimeType: string;
  }) {
    return this.documentsFileService.extractContentText(params);
  }

  async extractTextDetails(params: {
    filePath: string;
    originalName: string;
    mimeType: string;
  }): Promise<DocumentTextExtractionResult> {
    return this.documentsFileService.extractTextDetails(params);
  }

  async list(params: {
    page?: number;
    limit?: number;
    categoryId?: string;
    documentTypeCode?: string;
    areaCode?: string;
    status?: DocumentStatus;
    from?: string;
    to?: string;
    sortByName?: 'az' | 'za';
    allowedAreaCodes?: string[] | null;
    includeHiddenStatuses?: boolean;
  }) {
    return this.documentsQueryService.list(params);
  }

  async findOne(
    id: number,
    versionsLimit = 5,
    allowedAreaCodes?: string[] | null,
    includeHiddenStatuses = false,
  ) {
    return this.documentsQueryService.findOne(
      id,
      versionsLimit,
      allowedAreaCodes,
      includeHiddenStatuses,
    );
  }

  async ensureAccess(
    documentId: number,
    allowedAreaCodes?: string[] | null,
    includeHiddenStatuses = false,
  ) {
    // Centralized guard for area/status visibility checks.
    return this.documentsAccessService.ensureAccess(
      documentId,
      allowedAreaCodes,
      {
        areaCode: true,
      },
      includeHiddenStatuses,
    );
  }

  async update(
    id: number,
    nombreDocumento?: string,
    categoryId?: number | null,
    isInternal?: boolean,
    documentTypeCode?: string,
    areaCodeValue?: string,
    consecutivoValue?: number | null,
  ) {
    return this.documentsMutationService.update(
      id,
      nombreDocumento,
      categoryId,
      isInternal,
      documentTypeCode,
      areaCodeValue,
      consecutivoValue,
    );
  }

  async findVersionsByDocument(
    documentId: number,
    allowedAreaCodes?: string[] | null,
    includeHiddenStatuses = false,
  ) {
    return this.documentsQueryService.findVersionsByDocument(
      documentId,
      allowedAreaCodes,
      includeHiddenStatuses,
    );
  }

  async getWorkflow(documentId: number) {
    return this.documentsWorkflowService.getWorkflow(documentId);
  }

  async assignReviewers(
    documentId: number,
    revisoUserId: number,
    aproboUserId: number,
  ) {
    return this.documentsWorkflowService.assignReviewers(
      documentId,
      revisoUserId,
      aproboUserId,
    );
  }

  async submitReview(documentId: number, actorId: number, isAdmin: boolean) {
    return this.documentsWorkflowService.submitReview(
      documentId,
      actorId,
      isAdmin,
    );
  }

  async reviewDecision(params: {
    documentId: number;
    actorId: number;
    decision: ApprovalDecision;
    comentario?: string;
    step: ApprovalStep;
  }) {
    return this.documentsWorkflowService.reviewDecision(params);
  }

  async markObsolete(documentId: number) {
    return this.documentsWorkflowService.markObsolete(documentId);
  }

  async reprocessContent(params?: { documentId?: number; force?: boolean }) {
    // Rebuilds extracted content (including OCR path) for existing versions.
    return this.documentsContentMaintenanceService.reprocessContent(params);
  }
}
