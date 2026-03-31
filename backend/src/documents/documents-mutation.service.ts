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
    let document: Document | null = null;
    let documentType: DocumentType | null = null;
    let areaCode: AreaCode | null = null;

    const hasType = Boolean(params.documentTypeCode);
    const hasArea = Boolean(params.areaCode);

    if (hasType !== hasArea) {
      throw new BadRequestException(
        'documentTypeCode y areaCode deben enviarse juntos',
      );
    }

    if (hasType && hasArea) {
      documentType = await this.documentTypeRepo.findOne({
        where: { code: params.documentTypeCode?.toUpperCase() },
      });
      areaCode = await this.areaCodeRepo.findOne({
        where: { code: params.areaCode?.toUpperCase() },
      });
      if (!documentType || !areaCode) {
        throw new BadRequestException('Tipo de documento o area invalida');
      }
    } else {
      document = await this.documentRepo.findOne({
        where: { nombre },
        relations: ['category', 'documentType', 'areaCode', 'approvals'],
      });
    }

    let codigo: string | null = null;
    let consecutivo: number | null = null;
    if (documentType && areaCode) {
      if (params.consecutivo) {
        consecutivo = params.consecutivo;
      } else {
        consecutivo = await this.getNextConsecutivo(documentType.id, areaCode.id);
      }

      codigo = `${documentType.code}-${areaCode.code}-${String(
        consecutivo,
      ).padStart(2, '0')}`;

      document = await this.documentRepo.findOne({
        where: { codigo },
        relations: ['category', 'documentType', 'areaCode', 'approvals'],
      });
      if (document && !params.consecutivo) {
        let attempts = 0;
        while (document && attempts < 20) {
          consecutivo += 1;
          codigo = `${documentType.code}-${areaCode.code}-${String(
            consecutivo,
          ).padStart(2, '0')}`;
          document = await this.documentRepo.findOne({
            where: { codigo },
            relations: ['category', 'documentType', 'areaCode', 'approvals'],
          });
          attempts += 1;
        }
        if (document) {
          throw new BadRequestException(
            'No se pudo asignar un consecutivo disponible',
          );
        }
      }
    }

    if (!document) {
      document = this.documentRepo.create({
        nombre,
        status: DocumentStatus.Draft,
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

    if (documentType && areaCode && codigo && consecutivo) {
      document.documentType = documentType;
      document.areaCode = areaCode;
      document.consecutivo = consecutivo;
      document.codigo = codigo;
    }

    const uploadedBy = await this.userRepo.findOne({
      where: { id: params.uploadedById },
    });

    if (!document.createdBy && uploadedBy) {
      document.createdBy = uploadedBy;
    }

    const wasApproved = document.status === DocumentStatus.Approved;
    let saveAttempts = 0;
    while (true) {
      try {
        document = await this.documentRepo.save(document);
        break;
      } catch (error) {
        if (
          documentType &&
          areaCode &&
          !params.consecutivo &&
          this.isDuplicateCodigoError(error) &&
          saveAttempts < 3
        ) {
          saveAttempts += 1;
          consecutivo = await this.getNextConsecutivo(documentType.id, areaCode.id);
          codigo = `${documentType.code}-${areaCode.code}-${String(
            consecutivo,
          ).padStart(2, '0')}`;
          document.consecutivo = consecutivo;
          document.codigo = codigo;
          continue;
        }
        throw error;
      }
    }

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

    const shouldUpdateCode =
      documentTypeCode !== undefined ||
      areaCodeValue !== undefined ||
      consecutivoValue !== undefined;

    if (shouldUpdateCode) {
      const typeCode =
        documentTypeCode?.toUpperCase() ?? document.documentType?.code;
      const areaCodeCode =
        areaCodeValue?.toUpperCase() ?? document.areaCode?.code;

      if (!typeCode || !areaCodeCode) {
        throw new BadRequestException(
          'documentTypeCode y areaCode requeridos para documentos SIG',
        );
      }

      const documentType = await this.documentTypeRepo.findOne({
        where: { code: typeCode },
      });
      const areaCode = await this.areaCodeRepo.findOne({
        where: { code: areaCodeCode },
      });

      if (!documentType || !areaCode) {
        throw new BadRequestException('Tipo de documento o area invalida');
      }

      let consecutivo = document.consecutivo ?? null;
      if (consecutivoValue !== undefined) {
        consecutivo = consecutivoValue;
      }

      if (!consecutivo) {
        consecutivo = await this.getNextConsecutivo(documentType.id, areaCode.id);
      }

      let codigo = `${documentType.code}-${areaCode.code}-${String(
        consecutivo,
      ).padStart(2, '0')}`;

      let existing = await this.documentRepo.findOne({
        where: { codigo },
      });
      if (existing && existing.id !== document.id) {
        const isManualConsecutivo =
          consecutivoValue !== undefined && consecutivoValue !== null;
        if (isManualConsecutivo) {
          throw new BadRequestException('Codigo ya existe');
        }
        let attempts = 0;
        while (existing && existing.id !== document.id && attempts < 20) {
          consecutivo += 1;
          codigo = `${documentType.code}-${areaCode.code}-${String(
            consecutivo,
          ).padStart(2, '0')}`;
          existing = await this.documentRepo.findOne({ where: { codigo } });
          attempts += 1;
        }
        if (existing && existing.id !== document.id) {
          throw new BadRequestException(
            'No se pudo asignar un consecutivo disponible',
          );
        }
      }

      document.documentType = documentType;
      document.areaCode = areaCode;
      document.consecutivo = consecutivo;
      document.codigo = codigo;
    }

    const canRetryConsecutivo =
      shouldUpdateCode &&
      (consecutivoValue === undefined || consecutivoValue === null);
    let saved: Document | null = null;
    let updateAttempts = 0;
    while (true) {
      try {
        saved = await this.documentRepo.save(document);
        break;
      } catch (error) {
        if (
          canRetryConsecutivo &&
          document.documentType &&
          document.areaCode &&
          this.isDuplicateCodigoError(error) &&
          updateAttempts < 3
        ) {
          updateAttempts += 1;
          const nextConsecutivo = await this.getNextConsecutivo(
            document.documentType.id,
            document.areaCode.id,
          );
          document.consecutivo = nextConsecutivo;
          document.codigo = `${document.documentType.code}-${document.areaCode.code}-${String(
            nextConsecutivo,
          ).padStart(2, '0')}`;
          continue;
        }
        throw error;
      }
    }
    if (!saved) {
      throw new BadRequestException('No se pudo guardar el documento');
    }
    this.searchService.enqueueIndexDocument(saved.id);
    return saved;
  }

  private async getNextConsecutivo(documentTypeId: number, areaCodeId: number) {
    const raw = await this.documentRepo
      .createQueryBuilder('document')
      .select('MAX(document.consecutivo)', 'max')
      .where('document.documentTypeId = :dt', { dt: documentTypeId })
      .andWhere('document.areaCodeId = :ac', { ac: areaCodeId })
      .getRawOne<{ max?: number }>();
    return Number(raw?.max ?? 0) + 1;
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
