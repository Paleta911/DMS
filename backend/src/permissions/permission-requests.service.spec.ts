import { BadRequestException } from '@nestjs/common';
import { PermissionRequestsCreateService } from './permission-requests-create.service';
import { PermissionRequestsReviewService } from './permission-requests-review.service';
import {
  PermissionRequestStatus,
  PermissionRequestType,
} from './permission-request.entity';

function createPendingAreaQueryBuilder(rawRows: Array<{ requestedAreaCodes: string | null }>) {
  return {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawRows),
  };
}

describe('Permission request flows', () => {
  const baseUser = {
    id: 7,
    email: 'sus@bsm.com.mx',
    role: 'user',
    isSuperAdmin: false,
  };

  it('blocks duplicate pending area requests', async () => {
    const queryBuilder = createPendingAreaQueryBuilder([
      { requestedAreaCodes: JSON.stringify(['FA']) },
    ]);
    const requestRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      create: jest.fn(),
      save: jest.fn(),
    };
    const service = new PermissionRequestsCreateService(
      requestRepo as any,
      {
        findById: jest.fn().mockResolvedValue(baseUser),
        findByIdWithAreas: jest.fn().mockResolvedValue({
          ...baseUser,
          allowedAreaCodes: [],
        }),
      } as any,
      { log: jest.fn() } as any,
      {
        findActiveList: jest.fn().mockResolvedValue([{ code: 'FA' }, { code: 'RC' }]),
      } as any,
      {
        assertCanCreateSelfServiceRequest: jest.fn(),
      } as any,
    );

    await expect(
      service.createAreaRequest({
        userId: 7,
        areaCodes: ['FA'],
      }),
    ).rejects.toThrow(
      new BadRequestException('Ya tienes solicitudes pendientes para áreas: FA'),
    );
  });

  it('approves an area request partially and leaves the remainder pending', async () => {
    const request = {
      id: 11,
      status: PermissionRequestStatus.Pending,
      requestType: PermissionRequestType.Areas,
      requestedAreaCodes: JSON.stringify(['FA', 'RC']),
      user: baseUser,
      reviewedById: null,
      reviewReason: null,
    };
    const transactionalRepo = {
      findOne: jest.fn().mockResolvedValue(request),
      save: jest.fn().mockImplementation(async (entity) => entity),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(transactionalRepo),
    };
    const dataSource = {
      transaction: jest.fn().mockImplementation(async (callback) => callback(manager)),
    };
    const setAllowedAreas = jest.fn();
    const auditLog = jest.fn();

    const service = new PermissionRequestsReviewService(
      {} as any,
      dataSource as any,
      {
        findById: jest.fn(),
        findByIdWithAreas: jest.fn().mockResolvedValue({
          ...baseUser,
          allowedAreaCodes: [{ code: 'RC' }],
        }),
        setAllowedAreas,
      } as any,
      { log: auditLog } as any,
      {
        findActiveList: jest.fn().mockResolvedValue([{ code: 'FA' }, { code: 'RC' }]),
      } as any,
      {
        assertTargetIsMutableByAdmin: jest.fn(),
      } as any,
    );

    const result = await service.approvePartialAreaRequest({
      id: 11,
      adminId: 1,
      areaCodes: ['fa'],
      note: 'Solo se aprueba finanzas',
    });

    expect(setAllowedAreas).toHaveBeenCalledWith(
      7,
      expect.arrayContaining([{ code: 'RC' }, { code: 'FA' }]),
      manager,
    );
    expect(transactionalRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 11,
        requestedAreaCodes: JSON.stringify(['RC']),
        status: PermissionRequestStatus.Pending,
        reviewedById: 1,
        reviewReason: 'Solo se aprueba finanzas',
      }),
    );
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PERMISSION_REQUEST_APPROVED',
        resourceId: 11,
        meta: expect.objectContaining({
          partial: true,
          approvedAreaCodes: ['FA'],
          remainingAreaCodes: ['RC'],
        }),
      }),
      manager,
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 11,
        requestedAreaCodes: JSON.stringify(['RC']),
      }),
    );
  });
});
