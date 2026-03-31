import { AuditLog } from './audit-log.entity';
import { AuditLogQueryService } from './audit-log-query.service';

function createQueryBuilderMock(items: AuditLog[] = [], total = items.length) {
  return {
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([items, total]),
    getMany: jest.fn().mockResolvedValue(items),
  };
}

describe('AuditLogQueryService', () => {
  it('aplica filtros y paginacion al consultar auditoria', async () => {
    const item = {
      id: 10,
      userId: 12,
      action: 'DOCUMENT_UPLOAD',
      resourceType: 'document',
      resourceId: '25',
      meta: '{"email":"user@bsm.com.mx"}',
      ip: '127.0.0.1',
      userAgent: 'jest',
      createdAt: new Date('2026-03-09T18:00:00.000Z'),
    } as AuditLog;
    const qb = createQueryBuilderMock([item], 31);
    const repo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    const service = new AuditLogQueryService(repo as any);

    const result = await service.query({
      page: 3,
      limit: 10,
      action: 'DOCUMENT_UPLOAD',
      user: 'user@bsm.com.mx',
      q: 'document',
      from: '2026-03-01',
      to: '2026-03-31',
    });

    expect(repo.createQueryBuilder).toHaveBeenCalledWith('audit');
    expect(qb.orderBy).toHaveBeenCalledWith('audit.createdAt', 'DESC');
    expect(qb.andWhere).toHaveBeenCalledWith('audit.action = :action', {
      action: 'DOCUMENT_UPLOAD',
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(CAST(audit.userId AS varchar(30)) LIKE :userFilter OR LOWER(COALESCE(audit.meta, \'\')) LIKE :userFilter)',
      { userFilter: '%user@bsm.com.mx%' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('LOWER(audit.action) LIKE :queryFilter'),
      { queryFilter: '%document%' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith('audit.createdAt >= :from', {
      from: '2026-03-01',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('audit.createdAt <= :to', {
      to: '2026-03-31',
    });
    expect(qb.skip).toHaveBeenCalledWith(20);
    expect(qb.take).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      items: [item],
      total: 31,
      page: 3,
      limit: 10,
    });
  });

  it('exporta CSV con escape correcto y limite maximo de filas', async () => {
    const qb = createQueryBuilderMock([
      {
        id: 1,
        userId: 5,
        action: 'AUTH_LOGIN_SUCCESS',
        resourceType: 'auth',
        resourceId: null,
        meta: '{"email":"admin@local.com","notes":"uno ""dos""\nlinea"}',
        ip: '::1',
        userAgent: 'jest-agent',
        createdAt: new Date('2026-03-09T19:30:00.000Z'),
      } as AuditLog,
    ]);
    const repo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    const service = new AuditLogQueryService(repo as any);

    const csv = await service.exportCsv({ maxRows: 20000 });

    expect(qb.take).toHaveBeenCalledWith(10000);
    expect(csv).toContain(
      '"fecha","usuarioId","accion","tipo","recursoId","ip","agenteUsuario","meta"',
    );
    expect(csv).toContain('"2026-03-09T19:30:00.000Z","5","AUTH_LOGIN_SUCCESS"');
    expect(csv).toContain('"::1","jest-agent"');
    expect(csv).toContain('uno """"dos"""" linea');
  });
});
