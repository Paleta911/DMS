import { NotFoundException } from '@nestjs/common'
import type { EntityManager, Repository } from 'typeorm'
import { PermissionKey } from '../../../backend/src/users/permissions'
import { UserRole } from '../../../backend/src/users/user-role.enum'
import { UserStatus } from '../../../backend/src/users/user-status.enum'
import { UsersMutationService } from '../../../backend/src/users/users-mutation.service'
import { UsersQueryService } from '../../../backend/src/users/users-query.service'

describe('Users query and mutation services external tests', () => {
  const makeRepo = () => ({
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn(async (value) => value),
    create: jest.fn((value) => value),
    createQueryBuilder: jest.fn(),
  }) as unknown as jest.Mocked<Repository<any>>

  it('finds users using repository or entity manager', async () => {
    const userRepo = makeRepo()
    const approvalRepo = makeRepo()
    userRepo.findOne.mockResolvedValueOnce({ id: 1 } as any)

    const service = new UsersQueryService(userRepo as any, approvalRepo as any)
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ id: 2 }),
      }),
    } as unknown as EntityManager

    await expect(service.findByEmail('a@b.com')).resolves.toEqual({ id: 1 })
    await expect(service.findById(2, manager)).resolves.toEqual({ id: 2 })
  })

  it('queries password hash explicitly by email', async () => {
    const userRepo = makeRepo()
    const approvalRepo = makeRepo()
    const getOne = jest.fn().mockResolvedValue({ id: 1, passwordHash: 'hash' })
    const addSelect = jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ getOne }) })
    userRepo.createQueryBuilder.mockReturnValue({ addSelect })

    const service = new UsersQueryService(userRepo as any, approvalRepo as any)
    await expect(service.findByEmailWithPassword('a@b.com')).resolves.toEqual({
      id: 1,
      passwordHash: 'hash',
    })
  })

  it('searches users and maps the safe response shape', async () => {
    const userRepo = makeRepo()
    const approvalRepo = makeRepo()
    const getMany = jest.fn().mockResolvedValue([
      {
        id: 1,
        email: 'user@bsm.com.mx',
        nombre: 'Alex',
        primerApellido: 'Lopez',
        segundoApellido: null,
        role: UserRole.User,
        status: UserStatus.Approved,
        canAccess: true,
        canReview: false,
        canApprove: false,
      },
    ])
    const qb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany,
    }
    userRepo.createQueryBuilder.mockReturnValue(qb as any)

    const service = new UsersQueryService(userRepo as any, approvalRepo as any)
    await expect(service.searchUsers('alex', 5)).resolves.toEqual([
      expect.objectContaining({
        email: 'user@bsm.com.mx',
        nombre: 'Alex',
        canAccess: true,
      }),
    ])
    await expect(service.searchUsers('   ', 5)).resolves.toEqual([])
  })

  it('checks existence and pending tasks counts', async () => {
    const userRepo = makeRepo()
    const approvalRepo = makeRepo()
    userRepo.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1)
    approvalRepo.count.mockResolvedValueOnce(3).mockResolvedValueOnce(4)

    const service = new UsersQueryService(userRepo as any, approvalRepo as any)
    await expect(service.hasAnyUsers()).resolves.toBe(true)
    await expect(service.hasAdmin()).resolves.toBe(true)
    await expect(service.getPendingTasks(10)).resolves.toEqual({
      pendingReview: 3,
      pendingApprove: 4,
    })
  })

  it('ensures permissions for an existing user and throws when missing', async () => {
    const userRepo = makeRepo()
    const approvalRepo = makeRepo()
    userRepo.findOne
      .mockResolvedValueOnce({
        id: 1,
        status: UserStatus.Approved,
        canAccess: true,
        canRead: true,
        canUpload: false,
      } as any)
      .mockResolvedValueOnce(null)

    const service = new UsersQueryService(userRepo as any, approvalRepo as any)
    await expect(service.ensurePermissions(1, [PermissionKey.Read])).resolves.toMatchObject({
      id: 1,
    })
    await expect(service.ensurePermissions(2, [PermissionKey.Read])).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('maps a safe user object', () => {
    const userRepo = makeRepo()
    const approvalRepo = makeRepo()
    const service = new UsersQueryService(userRepo as any, approvalRepo as any)

    expect(
      service.toSafeUser({
        id: 1,
        email: 'user@bsm.com.mx',
        role: UserRole.User,
        createdAt: new Date('2026-03-18T00:00:00.000Z'),
        status: UserStatus.Approved,
        nombre: 'Alex',
        primerApellido: 'Lopez',
        segundoApellido: 'Perez',
        telefono: '123',
        fechaNacimiento: '2026-01-01',
        verifiedAt: null,
        approvedAt: null,
        approvedById: null,
        rejectedAt: null,
        rejectedReason: null,
        isSuperAdmin: false,
        canAccess: true,
        canRead: true,
        canUpload: false,
        canUploadNewVersion: false,
        canReview: false,
        canApprove: false,
        canDelete: false,
      } as any),
    ).toMatchObject({
      email: 'user@bsm.com.mx',
      permissions: { canAccess: true, canRead: true },
    })
  })

  it('creates, saves and updates login-failure state for users', async () => {
    const userRepo = makeRepo()
    const service = new UsersMutationService(userRepo as any)

    const created = await service.createUser({
      email: 'user@bsm.com.mx',
      passwordHash: 'hash',
      role: UserRole.User,
      permissions: {
        canAccess: true,
        canRead: true,
        canUpload: false,
        canUploadNewVersion: false,
        canReview: false,
        canApprove: false,
        canDelete: false,
      },
    })
    expect(created).toMatchObject({
      email: 'user@bsm.com.mx',
      status: UserStatus.PendingVerification,
      failedLoginAttempts: 0,
    })

    const user = {
      id: 1,
      failedLoginAttempts: 4,
      lastFailedLoginAt: new Date(),
      loginBlockedUntil: new Date(Date.now() + 60_000),
    } as any
    process.env.AUTH_LOGIN_BLOCK_AFTER = '5'
    process.env.AUTH_LOGIN_BLOCK_SEC = '300'
    process.env.AUTH_LOGIN_RESET_WINDOW_SEC = '3600'

    await service.recordFailedLoginAttempt(user)
    expect(user.failedLoginAttempts).toBe(5)
    expect(user.loginBlockedUntil).toBeInstanceOf(Date)

    await service.clearFailedLoginState(user)
    expect(user.failedLoginAttempts).toBe(0)
    expect(user.lastFailedLoginAt).toBeNull()
    expect(user.loginBlockedUntil).toBeNull()
  })

  it('sets allowed areas through repository or entity manager', async () => {
    const userRepo = makeRepo()
    userRepo.findOne.mockResolvedValue({ id: 1, allowedAreaCodes: [] } as any)
    const service = new UsersMutationService(userRepo as any)

    const result = await service.setAllowedAreas(1, [{ code: 'FA' } as any])
    expect(result).toMatchObject({
      id: 1,
      allowedAreaCodes: [{ code: 'FA' }],
    })

    const managedRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    }
    const manager = {
      getRepository: jest.fn().mockReturnValue(managedRepo),
    } as unknown as EntityManager
    await expect(service.setAllowedAreas(2, [], manager)).resolves.toBeNull()
  })
})
