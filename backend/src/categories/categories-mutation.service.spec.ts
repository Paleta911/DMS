import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesMutationService } from './categories-mutation.service';

// Verifies category mutation rules: reactivation, soft-delete cleanup, duplicates, and missing records.
describe('CategoriesMutationService', () => {
  const categoryRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const documentRepo = {
    createQueryBuilder: jest.fn(),
  };

  let service: CategoriesMutationService;

  beforeEach(() => {
    service = new CategoriesMutationService(
      categoryRepo as never,
      documentRepo as never,
    );
    jest.clearAllMocks();
  });

  it('reactiva una categoria inactiva existente al crear', async () => {
    const existing = { id: 1, nombre: 'Calidad', activo: false };
    categoryRepo.findOne.mockResolvedValue(existing);
    categoryRepo.save.mockImplementation(async (value) => value);

    const result = await service.create('Calidad');

    expect(result.activo).toBe(true);
    expect(categoryRepo.save).toHaveBeenCalledWith(existing);
  });

  it('desactiva la categoria y limpia documentos relacionados', async () => {
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    categoryRepo.findOne.mockResolvedValue({
      id: 7,
      nombre: 'SIG',
      activo: true,
    });
    categoryRepo.save.mockImplementation(async (value) => value);
    documentRepo.createQueryBuilder.mockReturnValue(updateChain);

    const result = await service.remove(7);

    expect(updateChain.where).toHaveBeenCalledWith('categoryId = :id', {
      id: 7,
    });
    expect(categoryRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, activo: false }),
    );
    expect(result).toEqual({ success: true, deactivated: true });
  });

  it('rechaza crear una categoria activa duplicada', async () => {
    categoryRepo.findOne.mockResolvedValue({
      id: 1,
      nombre: 'Calidad',
      activo: true,
    });

    await expect(service.create('Calidad')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('falla si intenta desactivar una categoria inexistente', async () => {
    categoryRepo.findOne.mockResolvedValue(null);

    await expect(service.remove(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
