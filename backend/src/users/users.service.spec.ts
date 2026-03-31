import { UsersService } from './users.service';
import { UserRole } from './user-role.enum';
import { UserStatus } from './user-status.enum';
import type { UsersQueryService } from './users-query.service';
import type { UsersMutationService } from './users-mutation.service';

describe('UsersService', () => {
  const queryService = {
    findByEmail: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    findById: jest.fn(),
    findByIdWithAreas: jest.fn(),
    searchUsers: jest.fn(),
    hasAnyUsers: jest.fn(),
    hasAdmin: jest.fn(),
    getPendingTasks: jest.fn(),
    toSafeUser: jest.fn(),
    ensurePermissions: jest.fn(),
  } as unknown as jest.Mocked<UsersQueryService>;

  const mutationService = {
    setAllowedAreas: jest.fn(),
    createUser: jest.fn(),
    saveUser: jest.fn(),
  } as unknown as jest.Mocked<UsersMutationService>;

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(queryService, mutationService);
  });

  it('delegates queries and mutations to focused services', async () => {
    queryService.findByEmail.mockResolvedValue({ id: 7 });
    mutationService.createUser.mockResolvedValue({ id: 8 });

    await expect(service.findByEmail('sus@bsm.com.mx')).resolves.toEqual({ id: 7 });
    await expect(
      service.createUser({
        email: 'nuevo@bsm.com.mx',
        passwordHash: 'hash',
        role: UserRole.User,
        status: UserStatus.PendingVerification,
      }),
    ).resolves.toEqual({ id: 8 });

    expect(queryService.findByEmail).toHaveBeenCalledWith('sus@bsm.com.mx', undefined);
    expect(mutationService.createUser).toHaveBeenCalledWith({
      email: 'nuevo@bsm.com.mx',
      passwordHash: 'hash',
      role: UserRole.User,
      status: UserStatus.PendingVerification,
    });
  });

  it('uses query service to format safe users', () => {
    const user = {
      id: 1,
      email: 'admin@local.com',
    } as never;
    queryService.toSafeUser.mockReturnValue({
      id: 1,
      email: 'admin@local.com',
      role: UserRole.Admin,
      status: UserStatus.Approved,
      permissions: {
        canAccess: true,
        canRead: true,
        canUpload: false,
        canUploadNewVersion: false,
        canReview: false,
        canApprove: false,
        canDelete: false,
      },
    });

    expect(service.toSafeUser(user)).toEqual({
      id: 1,
      email: 'admin@local.com',
      role: UserRole.Admin,
      status: UserStatus.Approved,
      permissions: {
        canAccess: true,
        canRead: true,
        canUpload: false,
        canUploadNewVersion: false,
        canReview: false,
        canApprove: false,
        canDelete: false,
      },
    });
    expect(queryService.toSafeUser).toHaveBeenCalledWith(user);
  });
});
