import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { DataSource, Repository } from 'typeorm'
import {
  PermissionRequestStatus,
  PermissionRequestType,
} from '../../../backend/src/permissions/permission-request.entity'
import { PermissionKey } from '../../../backend/src/users/permissions'
import { PermissionRequestsCreateService } from '../../../backend/src/permissions/permission-requests-create.service'
import { PermissionRequestsQueryService } from '../../../backend/src/permissions/permission-requests-query.service'
import { PermissionRequestsReviewService } from '../../../backend/src/permissions/permission-requests-review.service'

describe('Permission request subservices external tests', () => {
  const makeRepo = () => ({
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
  }) as unknown as jest.Mocked<Repository<any>>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates permission requests and blocks already-granted permissions', async () => {
    const requestRepo = makeRepo()
    requestRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    } as any)
    const usersService = {
      findById: jest.fn().mockResolvedValue({ id: 1, canRead: false }),
    } as any
    const auditLogService = { log: jest.fn() } as any
    const areaCodesService = { findActiveList: jest.fn() } as any
    const adminPolicy = { assertCanCreateSelfServiceRequest: jest.fn() } as any

    const service = new PermissionRequestsCreateService(
      requestRepo as any,
      usersService,
      auditLogService,
      areaCodesService,
      adminPolicy,
    )

    await expect(
      service.createRequest({ userId: 1, permissions: [PermissionKey.Read, PermissionKey.Read] }),
    ).resolves.toMatchObject({
      requestType: PermissionRequestType.Permissions,
      requestedPermissions: JSON.stringify([PermissionKey.Read]),
    })

    usersService.findById.mockResolvedValueOnce({ id: 1, canRead: true })
    await expect(
      service.createRequest({ userId: 1, permissions: [PermissionKey.Read] }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('creates area requests and rejects invalid or assigned areas', async () => {
    const requestRepo = makeRepo()
    requestRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    } as any)
    const usersService = {
      findById: jest.fn().mockResolvedValue({ id: 1 }),
      findByIdWithAreas: jest.fn().mockResolvedValue({ allowedAreaCodes: [] }),
    } as any
    const auditLogService = { log: jest.fn() } as any
    const areaCodesService = {
      findActiveList: jest.fn().mockResolvedValue([{ code: 'FA' }, { code: 'RC' }]),
    } as any
    const adminPolicy = { assertCanCreateSelfServiceRequest: jest.fn() } as any

    const service = new PermissionRequestsCreateService(
      requestRepo as any,
      usersService,
      auditLogService,
      areaCodesService,
      adminPolicy,
    )

    await expect(
      service.createAreaRequest({ userId: 1, areaCodes: ['fa', 'RC', 'fa'] }),
    ).resolves.toMatchObject({
      requestType: PermissionRequestType.Areas,
      requestedAreaCodes: JSON.stringify(['FA', 'RC']),
    })

    await expect(
      service.createAreaRequest({ userId: 1, areaCodes: ['ZZ'] }),
    ).rejects.toBeInstanceOf(BadRequestException)

    usersService.findByIdWithAreas.mockResolvedValueOnce({ allowedAreaCodes: [{ code: 'FA' }] })
    await expect(
      service.createAreaRequest({ userId: 1, areaCodes: ['FA'] }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('lists, exports and fetches permission requests', async () => {
    const requestRepo = makeRepo()
    requestRepo.findAndCount.mockResolvedValue([[{ id: 1 }], 1])
    const getManyAndCount = jest.fn().mockResolvedValue([[{ id: 2 }], 1])
    const getMany = jest.fn().mockResolvedValue([
      {
        id: 2,
        user: { email: 'user@bsm.com.mx' },
        requestType: PermissionRequestType.Areas,
        status: PermissionRequestStatus.Pending,
        requestedAreaCodes: '["FA"]',
        comment: 'comentario',
        reviewReason: null,
        reviewedById: null,
        reviewedAt: null,
        createdAt: new Date('2026-03-18T00:00:00.000Z'),
      },
    ])
    requestRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount,
      getMany,
    } as any)
    requestRepo.findOne.mockResolvedValueOnce({ id: 2 }).mockResolvedValueOnce(null)

    const service = new PermissionRequestsQueryService(requestRepo as any)
    await expect(service.listMine(10, { page: 2, limit: 5 })).resolves.toEqual({
      items: [{ id: 1 }],
      total: 1,
      page: 2,
      limit: 5,
    })
    await expect(service.listAll({ status: PermissionRequestStatus.Pending })).resolves.toEqual({
      items: [{ id: 2 }],
      total: 1,
      page: 1,
      limit: 20,
    })
    await expect(service.exportCsv({ maxRows: 2 })).resolves.toContain('"id","usuario","tipo"')
    await expect(service.getById(2)).resolves.toEqual({ id: 2 })
    await expect(service.getById(99)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('approves, partially approves and rejects requests inside transactions', async () => {
    const requestRepo = makeRepo()
    const managedRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (value) => value),
    }
    const dataSource = {
      transaction: jest.fn(async (callback: any) =>
        callback({
          getRepository: () => managedRepo,
        }),
      ),
    } as unknown as DataSource
    const usersService = {
      findByIdWithAreas: jest.fn().mockResolvedValue({ allowedAreaCodes: [] }),
      setAllowedAreas: jest.fn().mockResolvedValue(undefined),
      saveUser: jest.fn().mockResolvedValue(undefined),
    } as any
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) } as any
    const areaCodesService = {
      findActiveList: jest.fn().mockResolvedValue([{ code: 'FA' }, { code: 'RC' }]),
    } as any
    const adminPolicy = { assertTargetIsMutableByAdmin: jest.fn() } as any

    const service = new PermissionRequestsReviewService(
      requestRepo as any,
      dataSource,
      usersService,
      auditLogService,
      areaCodesService,
      adminPolicy,
    )

    managedRepo.findOne
      .mockResolvedValueOnce({
        id: 1,
        status: PermissionRequestStatus.Pending,
        requestType: PermissionRequestType.Permissions,
        requestedPermissions: JSON.stringify([PermissionKey.Read]),
        user: { id: 10, canRead: false },
      })
      .mockResolvedValueOnce({
        id: 2,
        status: PermissionRequestStatus.Pending,
        requestType: PermissionRequestType.Areas,
        requestedAreaCodes: JSON.stringify(['FA', 'RC']),
        user: { id: 10 },
      })
      .mockResolvedValueOnce({
        id: 3,
        status: PermissionRequestStatus.Pending,
        requestType: PermissionRequestType.Areas,
        requestedAreaCodes: JSON.stringify(['FA']),
        user: { id: 10 },
      })

    await expect(service.approveRequest({ id: 1, adminId: 99 })).resolves.toMatchObject({
      id: 1,
      status: PermissionRequestStatus.Approved,
    })
    await expect(
      service.approvePartialAreaRequest({ id: 2, adminId: 99, areaCodes: ['FA'], note: 'Parcial' }),
    ).resolves.toMatchObject({
      id: 2,
      requestedAreaCodes: JSON.stringify(['RC']),
    })
    await expect(service.rejectRequest({ id: 3, adminId: 99, reason: 'No procede' })).resolves
      .toMatchObject({
        id: 3,
        status: PermissionRequestStatus.Rejected,
        reviewReason: 'No procede',
      })
    expect(auditLogService.log).toHaveBeenCalledTimes(3)
  })
})
