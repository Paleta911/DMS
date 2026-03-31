import { runWithRequestContext } from '../common/request-context';
import { AuditLog } from './audit-log.entity';
import { AuditLogWriteService } from './audit-log-write.service';

describe('AuditLogWriteService', () => {
  it('serializa meta, agrega requestId y normaliza resourceId', async () => {
    const repo = {
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuditLogWriteService(repo as any);

    await runWithRequestContext({ requestId: 'req-123' }, () =>
      service.log({
        userId: 9,
        action: 'DOCUMENT_UPLOAD',
        resourceType: 'document',
        resourceId: 15,
        meta: { area: 'RC' },
        ip: '127.0.0.1',
        userAgent: 'jest',
      }),
    );

    expect(repo.create).toHaveBeenCalledWith({
      userId: 9,
      action: 'DOCUMENT_UPLOAD',
      resourceType: 'document',
      resourceId: '15',
      meta: JSON.stringify({ area: 'RC', requestId: 'req-123' }),
      ip: '127.0.0.1',
      userAgent: 'jest',
    });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DOCUMENT_UPLOAD',
        resourceId: '15',
      }),
    );
  });

  it('usa el repositorio del manager cuando existe una transaccion activa', async () => {
    const fallbackRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };
    const transactionalRepo = {
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(transactionalRepo),
    };
    const service = new AuditLogWriteService(fallbackRepo as any);

    await service.log(
      {
        userId: null,
        action: 'AUTH_LOGIN_FAIL',
        resourceType: 'auth',
        meta: { email: 'sus@bsm.com.mx' },
      },
      manager as any,
    );

    expect(manager.getRepository).toHaveBeenCalledWith(AuditLog);
    expect(transactionalRepo.create).toHaveBeenCalledWith({
      userId: null,
      action: 'AUTH_LOGIN_FAIL',
      resourceType: 'auth',
      resourceId: null,
      meta: JSON.stringify({ email: 'sus@bsm.com.mx' }),
      ip: null,
      userAgent: null,
    });
    expect(transactionalRepo.save).toHaveBeenCalled();
    expect(fallbackRepo.create).not.toHaveBeenCalled();
  });
});
