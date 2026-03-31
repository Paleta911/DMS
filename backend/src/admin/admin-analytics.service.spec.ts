import { Repository } from 'typeorm';
import { AdminAnalyticsService } from './admin-analytics.service';
import { Document } from '../documents/document.entity';
import { User } from '../users/user.entity';
import { PermissionRequest } from '../permissions/permission-request.entity';
import { AuditLog } from '../audit-log/audit-log.entity';
import { BackendMetricsService } from '../observability/backend-metrics.service';

type QueryBuilderMock<T> = {
  where: jest.MockedFunction<(query: string, params?: object) => QueryBuilderMock<T>>;
  andWhere: jest.MockedFunction<
    (query: string, params?: object) => QueryBuilderMock<T>
  >;
  select: jest.MockedFunction<
    (selection: string, alias?: string) => QueryBuilderMock<T>
  >;
  addSelect: jest.MockedFunction<
    (selection: string, alias?: string) => QueryBuilderMock<T>
  >;
  groupBy: jest.MockedFunction<(selection: string) => QueryBuilderMock<T>>;
  orderBy: jest.MockedFunction<
    (selection: string, order?: 'ASC' | 'DESC') => QueryBuilderMock<T>
  >;
  leftJoin: jest.MockedFunction<
    (property: string, alias: string) => QueryBuilderMock<T>
  >;
  limit: jest.MockedFunction<(value: number) => QueryBuilderMock<T>>;
  setParameter: jest.MockedFunction<
    (key: string, value: unknown) => QueryBuilderMock<T>
  >;
  getCount: jest.MockedFunction<() => Promise<number>>;
  getRawMany: jest.MockedFunction<() => Promise<T[]>>;
};

function createQueryBuilderMock<T>(params?: {
  count?: number;
  rows?: T[];
}): QueryBuilderMock<T> {
  const builder = {
    where: jest.fn(),
    andWhere: jest.fn(),
    select: jest.fn(),
    addSelect: jest.fn(),
    groupBy: jest.fn(),
    orderBy: jest.fn(),
    leftJoin: jest.fn(),
    limit: jest.fn(),
    setParameter: jest.fn(),
    getCount: jest.fn().mockResolvedValue(params?.count ?? 0),
    getRawMany: jest.fn().mockResolvedValue(params?.rows ?? []),
  } as QueryBuilderMock<T>;

  builder.where.mockReturnValue(builder);
  builder.andWhere.mockReturnValue(builder);
  builder.select.mockReturnValue(builder);
  builder.addSelect.mockReturnValue(builder);
  builder.groupBy.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.setParameter.mockReturnValue(builder);

  return builder;
}

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;
  let documentRepo: jest.Mocked<Partial<Repository<Document>>>;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;
  let permissionRequestRepo: jest.Mocked<Partial<Repository<PermissionRequest>>>;
  let auditLogRepo: jest.Mocked<Partial<Repository<AuditLog>>>;
  let backendMetricsService: jest.Mocked<Partial<BackendMetricsService>>;

  beforeEach(() => {
    documentRepo = {
      count: jest.fn().mockResolvedValue(42),
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(createQueryBuilderMock({ count: 4 }))
        .mockReturnValueOnce(
          createQueryBuilderMock({
            rows: [{ label: 'APPROVED', count: '20' }],
          }),
        )
        .mockReturnValueOnce(
          createQueryBuilderMock({
            rows: [{ label: 'RC', count: '12' }],
          }),
        ),
    };
    userRepo = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(
          createQueryBuilderMock({
            rows: [{ label: 'APPROVED', count: '8' }],
          }),
        )
        .mockReturnValueOnce(createQueryBuilderMock({ count: 3 }))
        .mockReturnValueOnce(createQueryBuilderMock({ count: 2 })),
    };
    permissionRequestRepo = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(
          createQueryBuilderMock({
            rows: [{ label: 'PENDING', count: '5' }],
          }),
        )
        .mockReturnValueOnce(
          createQueryBuilderMock({
            rows: [{ label: 'AREAS', count: '2' }],
          }),
        )
        .mockReturnValueOnce(createQueryBuilderMock({ count: 5 })),
    };
    auditLogRepo = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(createQueryBuilderMock({ count: 18 }))
        .mockReturnValueOnce(createQueryBuilderMock({ count: 4 }))
        .mockReturnValueOnce(
          createQueryBuilderMock({
            rows: [{ label: 'SEARCH_QUERY', count: '11' }],
          }),
        ),
    };
    backendMetricsService = {
      getSnapshot: jest.fn().mockReturnValue({
        services: {
          search: {
            elasticStatus: 'up',
            queue: {
              pendingJobs: 1,
              dueJobs: 0,
              oldestJobAgeMs: 1000,
              processing: false,
              workerRunning: true,
            },
            counters: {
              queued: 2,
              indexed: 3,
              indexFailures: 0,
              retries: 0,
              dropped: 0,
              queryElastic: 5,
              queryFallback: 1,
              reindexRuns: 1,
              reindexDocs: 20,
              reindexFailures: 0,
              elasticDownEvents: 0,
            },
          },
        },
      }),
    };

    service = new AdminAnalyticsService(
      documentRepo as Repository<Document>,
      userRepo as Repository<User>,
      permissionRequestRepo as Repository<PermissionRequest>,
      auditLogRepo as Repository<AuditLog>,
      backendMetricsService as BackendMetricsService,
    );
  });

  it('construye el resumen administrativo consolidado', async () => {
    const summary = await service.getSummary();

    expect(summary.documents.total).toBe(42);
    expect(summary.documents.createdLast7d).toBe(4);
    expect(summary.documents.byStatus).toEqual([
      { label: 'APPROVED', count: 20 },
    ]);
    expect(summary.documents.topAreas).toEqual([{ label: 'RC', count: 12 }]);
    expect(summary.registrations.approvedLast30d).toBe(3);
    expect(summary.registrations.pendingApproval).toBe(2);
    expect(summary.permissionRequests.totalPending).toBe(5);
    expect(summary.audit.totalLast24h).toBe(18);
    expect(summary.audit.accessDeniedLast24h).toBe(4);
    expect(summary.audit.topActionsLast7d).toEqual([
      { label: 'SEARCH_QUERY', count: 11 },
    ]);
    expect(summary.search.elasticStatus).toBe('up');
  });
});
