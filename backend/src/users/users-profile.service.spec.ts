import * as bcrypt from 'bcrypt';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsersProfileService } from './users-profile.service';
import { UserStatus } from './user-status.enum';
import type { UsersQueryService } from './users-query.service';
import type { UsersMutationService } from './users-mutation.service';
import type { AreaCodesService } from '../area-codes/area-codes.service';

describe('UsersProfileService', () => {
  const queryService = {
    findByIdWithAreas: jest.fn(),
    findByEmailWithPassword: jest.fn(),
  } as unknown as jest.Mocked<UsersQueryService>;

  const mutationService = {
    saveUser: jest.fn(),
    setAllowedAreas: jest.fn(),
    clearFailedLoginState: jest.fn(),
  } as unknown as jest.Mocked<UsersMutationService>;

  const areaCodesService = {
    findActiveList: jest.fn(),
  } as unknown as jest.Mocked<AreaCodesService>;

  let service: UsersProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersProfileService(queryService, mutationService, areaCodesService);
  });

  it('actualiza el area propia con una opcion existente', async () => {
    const existingUser = {
      id: 7,
      email: 'sus@bsm.com.mx',
      status: UserStatus.Approved,
      canAccess: true,
      nombre: 'Susana',
      primerApellido: 'Perez',
      segundoApellido: null,
      telefono: null,
      fechaNacimiento: null,
      requestedAreaNombre: null,
      allowedAreaCodes: [{ code: 'FA', nombre: 'Fabrica' }],
    };
    const savedUser = {
      ...existingUser,
      allowedAreaCodes: [{ code: 'RH', nombre: 'Recursos Humanos' }],
    };

    queryService.findByIdWithAreas
      .mockResolvedValueOnce(existingUser as never)
      .mockResolvedValueOnce(savedUser as never);
    areaCodesService.findActiveList.mockResolvedValue([
      { id: 1, code: 'RH', nombre: 'Recursos Humanos' },
    ] as never);
    mutationService.setAllowedAreas.mockResolvedValue(savedUser as never);

    const result = await service.updateOwnProfile(7, {
      areaCode: 'RH',
    });

    expect(mutationService.setAllowedAreas).toHaveBeenCalledWith(7, [
      { id: 1, code: 'RH', nombre: 'Recursos Humanos' },
    ]);
    expect(result.auditMeta).toMatchObject({
      updatedFields: ['area'],
      previousAreaCodes: ['FA'],
      areaCodes: ['RH'],
    });
  });

  it('guarda solicitud de area manual y limpia areas asignadas', async () => {
    const existingUser = {
      id: 9,
      email: 'manual@bsm.com.mx',
      status: UserStatus.Approved,
      canAccess: true,
      nombre: 'Manual',
      primerApellido: 'User',
      segundoApellido: null,
      telefono: null,
      fechaNacimiento: null,
      requestedAreaNombre: null,
      allowedAreaCodes: [{ code: 'FA', nombre: 'Fabrica' }],
    };
    const savedUser = {
      ...existingUser,
      requestedAreaNombre: 'Nueva Area',
      allowedAreaCodes: [],
    };

    queryService.findByIdWithAreas
      .mockResolvedValueOnce(existingUser as never)
      .mockResolvedValueOnce(savedUser as never);
    mutationService.saveUser.mockResolvedValue({
      ...existingUser,
      requestedAreaNombre: 'Nueva Area',
      allowedAreaCodes: [{ code: 'FA', nombre: 'Fabrica' }],
    } as never);
    mutationService.setAllowedAreas.mockResolvedValue(savedUser as never);

    const result = await service.updateOwnProfile(9, {
      requestedAreaNombre: 'Nueva Area',
    });

    expect(mutationService.setAllowedAreas).toHaveBeenCalledWith(9, []);
    expect(result.user.requestedAreaNombre).toBe('Nueva Area');
    expect(result.user.allowedAreaCodes).toEqual([]);
  });

  it('rechaza el cambio de contraseña sin contraseña actual', async () => {
    queryService.findByIdWithAreas.mockResolvedValue({
      id: 5,
      email: 'clave@bsm.com.mx',
      status: UserStatus.Approved,
      canAccess: true,
      allowedAreaCodes: [],
      requestedAreaNombre: null,
    } as never);

    await expect(
      service.updateOwnProfile(5, {
        password: 'NuevaClave1',
        confirmPassword: 'NuevaClave1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza actualizar perfil si la cuenta no esta aprobada', async () => {
    queryService.findByIdWithAreas.mockResolvedValue({
      id: 4,
      email: 'bloqueado@bsm.com.mx',
      status: UserStatus.Deleted,
      canAccess: true,
      allowedAreaCodes: [],
      requestedAreaNombre: null,
    } as never);

    await expect(service.updateOwnProfile(4, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('soporta fecha de nacimiento existente como string y reporta contraseña actual incorrecta', async () => {
    const passwordHash = await bcrypt.hash('Correcta123', 4);
    queryService.findByIdWithAreas.mockResolvedValue({
      id: 11,
      email: 'perfil@bsm.com.mx',
      status: UserStatus.Approved,
      canAccess: true,
      nombre: 'Perfil',
      primerApellido: 'Prueba',
      segundoApellido: null,
      telefono: '2710000000',
      fechaNacimiento: '1998-01-15',
      requestedAreaNombre: null,
      allowedAreaCodes: [],
    } as never);
    queryService.findByEmailWithPassword.mockResolvedValue({
      id: 11,
      email: 'perfil@bsm.com.mx',
      passwordHash,
    } as never);

    await expect(
      service.updateOwnProfile(11, {
        fechaNacimiento: '1998-01-15',
        currentPassword: 'incorrecta',
        password: 'NuevaClave1',
        confirmPassword: 'NuevaClave1',
      }),
    ).rejects.toThrow('La contraseña actual es incorrecta');
  });
});
