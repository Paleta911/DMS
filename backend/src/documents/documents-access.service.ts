import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { Document } from './document.entity';
import { DocumentVisibilityService } from '../document-visibility/document-visibility.service';

@Injectable()
export class DocumentsAccessService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly documentVisibilityService: DocumentVisibilityService,
  ) {}

  async ensureAccess(
    documentId: number,
    allowedAreaCodes?: string[] | null,
    relations: FindOptionsRelations<Document> = { areaCode: true },
    includeHiddenStatuses = false,
  ) {
    // Un array explicito vacio equivale a sin alcance operativo.
    if (allowedAreaCodes && allowedAreaCodes.length === 0) {
      throw new ForbiddenException('Sin acceso a este documento');
    }

    const document = await this.documentRepo.findOne({
      where: { id: documentId },
      relations,
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    // Aplica control por area y por visibilidad de estado (ej. borradores/inactivos).
    this.assertDocumentScope(document, allowedAreaCodes);
    await this.documentVisibilityService.assertDocumentVisible(
      document.status,
      includeHiddenStatuses,
    );
    return document;
  }

  assertDocumentScope(document: Document, allowedAreaCodes?: string[] | null) {
    // Admin/global: null o undefined omite filtro por area.
    if (!allowedAreaCodes) {
      return;
    }

    if (allowedAreaCodes.length === 0) {
      throw new ForbiddenException('Sin acceso a este documento');
    }

    if (
      document.areaCode &&
      !allowedAreaCodes.includes(document.areaCode.code)
    ) {
      throw new ForbiddenException('Sin acceso a este documento');
    }

    // Si el documento no tiene area asociada, no puede validarse alcance de forma segura.
    if (!document.areaCode) {
      throw new ForbiddenException('Sin acceso a este documento');
    }
  }
}
