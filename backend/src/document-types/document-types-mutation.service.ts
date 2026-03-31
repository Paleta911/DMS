import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentType } from './document-type.entity';
import { Document } from '../documents/document.entity';

@Injectable()
export class DocumentTypesMutationService {
  constructor(
    @InjectRepository(DocumentType)
    private readonly documentTypeRepo: Repository<DocumentType>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
  ) {}

  async create(payload: Partial<DocumentType>) {
    const code = payload.code?.toUpperCase().trim();
    const nombreLargo = payload.nombreLargo?.trim();
    const existing = code
      ? await this.documentTypeRepo.findOne({ where: { code } })
      : null;

    if (existing?.activo) {
      throw new ConflictException('Ya existe un tipo con ese código');
    }

    if (existing && !existing.activo) {
      existing.nombreLargo = nombreLargo ?? existing.nombreLargo;
      existing.activo = true;
      return this.documentTypeRepo.save(existing);
    }

    const entity = this.documentTypeRepo.create({
      code,
      nombreLargo,
      activo: payload.activo ?? true,
    });
    return this.documentTypeRepo.save(entity);
  }

  async update(id: number, payload: Partial<DocumentType>) {
    const entity = await this.documentTypeRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Tipo no encontrado');
    }
    if (typeof payload.nombreLargo === 'string') {
      entity.nombreLargo = payload.nombreLargo.trim();
    }
    if (typeof payload.activo === 'boolean' && payload.activo !== entity.activo) {
      if (!payload.activo) {
        await this.documentRepo
          .createQueryBuilder()
          .update(Document)
          .set({ documentType: null })
          .where('documentTypeId = :id', { id })
          .execute();
      }
      entity.activo = payload.activo;
    }
    return this.documentTypeRepo.save(entity);
  }

  async remove(id: number) {
    const entity = await this.documentTypeRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Tipo no encontrado');
    }
    if (!entity.activo) {
      return { success: true, alreadyInactive: true };
    }

    await this.documentRepo
      .createQueryBuilder()
      .update(Document)
      .set({ documentType: null })
      .where('documentTypeId = :id', { id })
      .execute();

    entity.activo = false;
    await this.documentTypeRepo.save(entity);
    return { success: true, deactivated: true };
  }
}
