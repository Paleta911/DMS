import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { Document } from '../documents/document.entity';

// Mutation service handles category CRUD operations: create with soft-delete recovery, update, and hard delete
// Enforces unique category names and maintains referential integrity with documents
@Injectable()
export class CategoriesMutationService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
  ) {}

  // Create new category or reactivate soft-deleted one; prevents duplicate active names
  async create(nombre: string) {
    const normalizedName = nombre.trim();
    const existing = await this.categoryRepo.findOne({
      where: { nombre: normalizedName },
    });

    if (existing?.activo) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }

    if (existing && !existing.activo) {
      existing.activo = true;
      return this.categoryRepo.save(existing);
    }

    const category = this.categoryRepo.create({
      nombre: normalizedName,
      activo: true,
    });
    return this.categoryRepo.save(category);
  }

  async update(id: number, params: { nombre?: string; activo?: boolean }) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Categoria no encontrada');
    }

    if (typeof params.nombre === 'string') {
      const normalizedName = params.nombre.trim();
      const duplicate = await this.categoryRepo.findOne({
        where: { nombre: normalizedName },
      });
      if (duplicate && duplicate.id !== id && duplicate.activo) {
        throw new ConflictException('Ya existe una categoría con ese nombre');
      }
      category.nombre = normalizedName;
    }

    if (
      typeof params.activo === 'boolean' &&
      params.activo !== category.activo
    ) {
      if (!params.activo) {
        await this.documentRepo
          .createQueryBuilder()
          .update(Document)
          .set({ category: null })
          .where('categoryId = :id', { id })
          .execute();
      }
      category.activo = params.activo;
    }

    return this.categoryRepo.save(category);
  }

  async remove(id: number) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Categoria no encontrada');
    }
    if (!category.activo) {
      return { success: true, alreadyInactive: true };
    }

    await this.documentRepo
      .createQueryBuilder()
      .update(Document)
      .set({ category: null })
      .where('categoryId = :id', { id })
      .execute();

    category.activo = false;
    await this.categoryRepo.save(category);
    return { success: true, deactivated: true };
  }

  async hardDelete(id: number) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Categoria no encontrada');
    }

    await this.documentRepo
      .createQueryBuilder()
      .update(Document)
      .set({ category: null })
      .where('categoryId = :id', { id })
      .execute();

    await this.categoryRepo.delete(id);
    return {
      success: true,
      deleted: true,
      id: category.id,
      nombre: category.nombre,
    };
  }
}
