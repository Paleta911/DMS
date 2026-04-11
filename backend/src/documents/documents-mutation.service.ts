import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './document.entity';
import { Version } from '../versions/version.entity';
import { Category } from '../categories/category.entity';
import { User } from '../users/user.entity';
import { DocumentType } from '../document-types/document-type.entity';
import { AreaCode } from '../area-codes/area-code.entity';
import { SearchService } from '../search/search.service';
import { DocumentsWorkflowService } from './documents-workflow.service';
import { DocumentStatus } from './document-status.enum';
import { VersionTextSource } from '../versions/version-text-source.enum';

@Injectable()
export class DocumentsMutationService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(Version)
    private readonly versionRepo: Repository<Version>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DocumentType)
    private readonly documentTypeRepo: Repository<DocumentType>,
    @InjectRepository(AreaCode)
    private readonly areaCodeRepo: Repository<AreaCode>,
    private readonly searchService: SearchService,
    private readonly documentsWorkflowService: DocumentsWorkflowService,
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
    const nombre = params.nombreDocumento.trim();
    const uploadedBy = await this.userRepo.findOne({
      where: { id: params.uploadedById },
    });

    let document = params.documentId
      ? await this.documentRepo.findOne({
          where: { id: params.documentId },
          relations: ['category', 'documentType', 'areaCode', 'approvals'],
        })
      : null;

    if (params.documentId && !document) {
      throw new NotFoundException('Documento no encontrado');
    }

    const isVersionUpload = Boolean(document);

    if (!document) {
      document = this.documentRepo.create({
        nombre,
        status: DocumentStatus.Draft,
        isInternal: Boolean(params.isInternal),
      });
    }

    if (params.categoryId) {
      const category = await this.categoryRepo.findOne({
        where: { id: params.categoryId },
      });
      if (category) {
        document.category = category;
      }
    }

    if (!document.createdBy && uploadedBy) {
      document.createdBy = uploadedBy;
    }

    if (!isVersionUpload) {
      await this.applyDocumentIdentity(document, {
        isInternal: Boolean(params.isInternal),
        documentTypeCode: params.documentTypeCode,
        areaCode: params.areaCode,
        consecutivo: params.consecutivo,
      });
    } else if (document.isInternal) {
      this.assertExistingInternalDocument(document);
    }

    const wasApproved = document.status === DocumentStatus.Approved;
    document = await this.saveDocument(document);

    const version = this.versionRepo.create({
      storedName: params.storedName,
      originalName: params.originalName,
      comentario: params.comentario ?? null,
      document,
      uploadedBy: uploadedBy ?? null,
      contentText: params.contentText ?? null,
      textSource: params.textSource ?? VersionTextSource.None,
      ocrApplied: params.ocrApplied ?? false,
      ocrPageCount: params.ocrPageCount ?? null,
    });

    await this.versionRepo.save(version);
    await this.documentsWorkflowService.ensureWorkflowForUpload(
      document,
      uploadedBy ?? null,
      wasApproved,
    );

    this.searchService.enqueueIndexDocument(document.id);

    return {
      documentId: document.id,
      versionId: version.id,
      storedName: version.storedName,
      originalName: version.originalName,
      codigo: document.codigo ?? null,
      workflowReset: wasApproved,
    };
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
    const document = await this.documentRepo.findOne({
      where: { id },
      relations: ['category', 'documentType', 'areaCode'],
    });
    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    if (nombreDocumento) {
      document.nombre = nombreDocumento.trim();
    }

    if (categoryId === null) {
      document.category = null;
    } else if (categoryId) {
      const category = await this.categoryRepo.findOne({
        where: { id: categoryId },
      });
      if (!category) {
        throw new NotFoundException('Categoria no encontrada');
      }
      document.category = category;
    }

    const shouldUpdateIdentity =
      isInternal !== undefined ||
      documentTypeCode !== undefined ||
      areaCodeValue !== undefined ||
      consecutivoValue !== undefined;

    if (shouldUpdateIdentity) {
      await this.applyDocumentIdentity(document, {
        isInternal: isInternal ?? document.isInternal,
        documentTypeCode,
        areaCode: areaCodeValue,
        consecutivo: consecutivoValue,
      });
    }

    const saved = await this.saveDocument(document);
    this.searchService.enqueueIndexDocument(saved.id);
    return saved;
  }

  private async applyDocumentIdentity(
    document: Document,
    params: {
      isInternal: boolean;
      documentTypeCode?: string;
      areaCode?: string;
      consecutivo?: number | null;
    },
  ) {
    if (params.isInternal) {
      const typeCode = params.documentTypeCode?.trim().toUpperCase();
      const areaCodeValue = params.areaCode?.trim().toUpperCase();
      const consecutivo =
        params.consecutivo !== undefined
          ? params.consecutivo
          : document.consecutivo ?? null;

      if (!typeCode || !areaCodeValue || !consecutivo) {
        throw new BadRequestException(
          'Tipo, área y consecutivo son requeridos para documentos internos',
        );
      }

      const documentType = await this.documentTypeRepo.findOne({
        where: { code: typeCode },
      });
      const areaCode = await this.areaCodeRepo.findOne({
        where: { code: areaCodeValue },
      });

      if (!documentType || !areaCode) {
        throw new BadRequestException('Tipo de documento o area invalida');
      }

      const codigo = this.buildCodigo(documentType.code, areaCode.code, consecutivo);
      await this.ensureCodigoAvailable(codigo, document.id);

      document.isInternal = true;
      document.documentType = documentType;
      document.areaCode = areaCode;
      document.consecutivo = consecutivo;
      document.codigo = codigo;
      return;
    }

    if (params.documentTypeCode) {
      throw new BadRequestException(
        'Solo los documentos internos pueden definir tipo',
      );
    }

    if (params.consecutivo !== undefined && params.consecutivo !== null) {
      throw new BadRequestException(
        'Solo los documentos internos pueden definir consecutivo',
      );
    }

    let areaCode: AreaCode | null = document.areaCode ?? null;
    if (params.areaCode !== undefined) {
      const normalizedAreaCode = params.areaCode.trim().toUpperCase();
      if (!normalizedAreaCode) {
        areaCode = null;
      } else {
        areaCode = await this.areaCodeRepo.findOne({
          where: { code: normalizedAreaCode },
        });
        if (!areaCode) {
          throw new BadRequestException('Area invalida');
        }
      }
    }

    document.isInternal = false;
    document.documentType = null;
    document.areaCode = areaCode;
    document.consecutivo = null;
    document.codigo = null;
  }

  private assertExistingInternalDocument(document: Document) {
    if (
      !document.documentType ||
      !document.areaCode ||
      !document.consecutivo ||
      !document.codigo
    ) {
      throw new BadRequestException(
        'El documento interno no tiene una configuracion valida para nueva version',
      );
    }
  }

  private async ensureCodigoAvailable(codigo: string, currentDocumentId?: number) {
    const existing = await this.documentRepo.findOne({
      where: { codigo },
    });
    if (existing && existing.id !== currentDocumentId) {
      throw new BadRequestException('Ya existe un documento con ese código');
    }
  }

  private async saveDocument(document: Document) {
    try {
      return await this.documentRepo.save(document);
    } catch (error) {
      if (document.codigo && this.isDuplicateCodigoError(error)) {
        throw new BadRequestException('Ya existe un documento con ese código');
      }
      throw error;
    }
  }

  private buildCodigo(typeCode: string, areaCode: string, consecutivo: number) {
    return `CEP-${typeCode}-${areaCode}-${String(consecutivo).padStart(2, '0')}`;
  }

  private isDuplicateCodigoError(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }
    const message = error.message.toLowerCase();
    return (
      message.includes('unique') ||
      message.includes('duplicate') ||
      message.includes('idx_document_codigo')
    );
  }
}
