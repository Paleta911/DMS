import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaCode } from './area-code.entity';
import { Document } from '../documents/document.entity';

// Mutation service for area catalogs with soft/hard delete and dependency cleanup.
@Injectable()
export class AreaCodesMutationService {
  constructor(
    @InjectRepository(AreaCode)
    private readonly areaCodeRepo: Repository<AreaCode>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
  ) {}

  async create(payload: Partial<AreaCode>) {
    // Normalize code to keep uniqueness checks deterministic.
    const code = payload.code?.toUpperCase().trim();
    const nombre = payload.nombre?.trim();
    const existing = code
      ? await this.areaCodeRepo.findOne({ where: { code } })
      : null;

    if (existing?.activo) {
      throw new ConflictException('Ya existe un área con ese código');
    }

    if (existing && !existing.activo) {
      // Reactivate an existing inactive row instead of creating duplicates.
      existing.nombre = nombre ?? existing.nombre;
      existing.activo = true;
      return this.areaCodeRepo.save(existing);
    }

    const entity = this.areaCodeRepo.create({
      code,
      nombre,
      activo: payload.activo ?? true,
    });
    return this.areaCodeRepo.save(entity);
  }

  async update(id: number, payload: Partial<AreaCode>) {
    const entity = await this.areaCodeRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Área no encontrada');
    }
    if (typeof payload.code === 'string') {
      const nextCode = payload.code.toUpperCase().trim();
      const existing = await this.areaCodeRepo.findOne({
        where: { code: nextCode },
      });
      if (existing && existing.id !== entity.id) {
        throw new ConflictException('Ya existe un área con ese código');
      }
      entity.code = nextCode;
    }
    if (typeof payload.nombre === 'string') {
      entity.nombre = payload.nombre.trim();
    }
    if (
      typeof payload.activo === 'boolean' &&
      payload.activo !== entity.activo
    ) {
      if (!payload.activo) {
        // Detach relations before deactivating to avoid stale area assignments.
        await this.documentRepo
          .createQueryBuilder()
          .update(Document)
          .set({ areaCode: null })
          .where('areaCodeId = :id', { id })
          .execute();

        await this.areaCodeRepo.manager
          .createQueryBuilder()
          .delete()
          .from('user_area_codes')
          .where('areaCodeId = :id', { id })
          .execute();
      }
      entity.activo = payload.activo;
    }
    return this.areaCodeRepo.save(entity);
  }

  async remove(id: number) {
    const entity = await this.areaCodeRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Área no encontrada');
    }
    if (!entity.activo) {
      return { success: true, alreadyInactive: true };
    }

    // Soft delete keeps catalog traceability while removing runtime assignments.
    await this.documentRepo
      .createQueryBuilder()
      .update(Document)
      .set({ areaCode: null })
      .where('areaCodeId = :id', { id })
      .execute();

    await this.areaCodeRepo.manager
      .createQueryBuilder()
      .delete()
      .from('user_area_codes')
      .where('areaCodeId = :id', { id })
      .execute();

    entity.activo = false;
    await this.areaCodeRepo.save(entity);
    return { success: true, deactivated: true };
  }

  async hardDelete(id: number) {
    const entity = await this.areaCodeRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Área no encontrada');
    }

    // Hard delete requires cleaning references in documents and join tables first.
    await this.documentRepo
      .createQueryBuilder()
      .update(Document)
      .set({ areaCode: null })
      .where('areaCodeId = :id', { id })
      .execute();

    await this.areaCodeRepo.manager
      .createQueryBuilder()
      .delete()
      .from('user_area_codes')
      .where('areaCodeId = :id', { id })
      .execute();

    await this.areaCodeRepo.delete(id);
    return {
      success: true,
      deleted: true,
      id: entity.id,
      code: entity.code,
      nombre: entity.nombre,
    };
  }
}
