import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaCode } from './area-code.entity';
import { Document } from '../documents/document.entity';

@Injectable()
export class AreaCodesMutationService {
  constructor(
    @InjectRepository(AreaCode)
    private readonly areaCodeRepo: Repository<AreaCode>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
  ) {}

  async create(payload: Partial<AreaCode>) {
    const code = payload.code?.toUpperCase().trim();
    const nombre = payload.nombre?.trim();
    const existing = code
      ? await this.areaCodeRepo.findOne({ where: { code } })
      : null;

    if (existing?.activo) {
      throw new ConflictException('Ya existe un área con ese código');
    }

    if (existing && !existing.activo) {
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
    if (typeof payload.nombre === 'string') {
      entity.nombre = payload.nombre.trim();
    }
    if (typeof payload.activo === 'boolean' && payload.activo !== entity.activo) {
      if (!payload.activo) {
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
}
