import { HttpAuditService } from './http-audit.service';

describe('HttpAuditService', () => {
  it('forwards normalized request metadata to AuditLogService', async () => {
    const auditLogService = {
      log: jest.fn().mockResolvedValue(undefined),
    };
    const service = new HttpAuditService(auditLogService as never);

    await service.logFromRequest(
      {
        user: { id: 42 },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
      } as never,
      {
        action: 'CATEGORY_UPDATED',
        resourceType: 'category',
        resourceId: 7,
        meta: { nombre: 'Calidad' },
      },
    );

    expect(auditLogService.log).toHaveBeenCalledWith({
      userId: 42,
      action: 'CATEGORY_UPDATED',
      resourceType: 'category',
      resourceId: 7,
      meta: { nombre: 'Calidad' },
      ip: '127.0.0.1',
      userAgent: 'jest',
    });
  });
});
