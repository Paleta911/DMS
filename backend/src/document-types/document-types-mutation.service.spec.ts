import { ConflictException, NotFoundException } from '@nestjs/common';
import { DocumentTypesMutationService } from './document-types-mutation.service';

describe('DocumentTypesMutationService', () => {
  const documentTypeRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const documentRepo = {
    createQueryBuilder: jest.fn(),
  };

  let service: DocumentTypesMutationService;

  beforeEach(() => {
    service = new DocumentTypesMutationService(
      documentTypeRepo as never,
      documentRepo as never,
    );
    jest.clearAllMocks();
  });

  it('reactiva un tipo inactivo existente al crear', async () => {
    const existing = { id: 1, code: 'PRO', nombreLargo: 'Procedimiento', activo: false };
    documentTypeRepo.findOne.mockResolvedValue(existing);
    documentTypeRepo.save.mockImplementation(async (value) => value);

    const result = await service.create({ code: 'PRO', nombreLargo: 'Procedimiento' });

    expect(result.activo).toBe(true);
    expect(documentTypeRepo.save).toHaveBeenCalledWith(existing);
  });

  it('desactiva el tipo y limpia documentos relacionados', async () => {
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    documentTypeRepo.findOne.mockResolvedValue({ id: 9, code: 'PRO', nombreLargo: 'Procedimiento', activo: true });
    documentTypeRepo.save.mockImplementation(async (value) => value);
    documentRepo.createQueryBuilder.mockReturnValue(updateChain);

    const result = await service.remove(9);

    expect(updateChain.where).toHaveBeenCalledWith('documentTypeId = :id', { id: 9 });
    expect(documentTypeRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9, activo: false }),
    );
    expect(result).toEqual({ success: true, deactivated: true });
  });

  it('rechaza crear un tipo activo duplicado', async () => {
    documentTypeRepo.findOne.mockResolvedValue({ id: 1, code: 'PRO', activo: true });

    await expect(
      service.create({ code: 'PRO', nombreLargo: 'Procedimiento' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('falla si intenta desactivar un tipo inexistente', async () => {
    documentTypeRepo.findOne.mockResolvedValue(null);

    await expect(service.remove(123)).rejects.toBeInstanceOf(NotFoundException);
  });
});
