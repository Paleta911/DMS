import { ConflictException, NotFoundException } from '@nestjs/common';
import { AreaCodesMutationService } from './area-codes-mutation.service';

describe('AreaCodesMutationService', () => {
  const areaCodeRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: {
      createQueryBuilder: jest.fn(),
    },
  };
  const documentRepo = {
    createQueryBuilder: jest.fn(),
  };

  let service: AreaCodesMutationService;

  beforeEach(() => {
    service = new AreaCodesMutationService(areaCodeRepo as never, documentRepo as never);
    jest.clearAllMocks();
  });

  it('reactiva un area inactiva existente al crear', async () => {
    const existing = { id: 1, code: 'RC', nombre: 'Recursos Humanos', activo: false };
    areaCodeRepo.findOne.mockResolvedValue(existing);
    areaCodeRepo.save.mockImplementation(async (value) => value);

    const result = await service.create({ code: 'RC', nombre: 'Recursos Humanos' });

    expect(result.activo).toBe(true);
    expect(areaCodeRepo.save).toHaveBeenCalledWith(existing);
  });

  it('desactiva el area y limpia documentos y asignaciones de usuario', async () => {
    const documentUpdateChain = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const deleteChain = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    areaCodeRepo.findOne.mockResolvedValue({ id: 4, code: 'RC', nombre: 'RH', activo: true });
    areaCodeRepo.save.mockImplementation(async (value) => value);
    documentRepo.createQueryBuilder.mockReturnValue(documentUpdateChain);
    areaCodeRepo.manager.createQueryBuilder.mockReturnValue(deleteChain);

    const result = await service.remove(4);

    expect(documentUpdateChain.where).toHaveBeenCalledWith('areaCodeId = :id', { id: 4 });
    expect(deleteChain.where).toHaveBeenCalledWith('areaCodeId = :id', { id: 4 });
    expect(areaCodeRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 4, activo: false }),
    );
    expect(result).toEqual({ success: true, deactivated: true });
  });

  it('rechaza crear un area activa duplicada', async () => {
    areaCodeRepo.findOne.mockResolvedValue({ id: 1, code: 'RC', activo: true });

    await expect(
      service.create({ code: 'RC', nombre: 'Recursos Humanos' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('falla si intenta desactivar un area inexistente', async () => {
    areaCodeRepo.findOne.mockResolvedValue(null);

    await expect(service.remove(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
