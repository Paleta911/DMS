import { AuditLogController } from '../../../backend/src/audit-log/audit-log.controller';
import { ObservabilityController } from '../../../backend/src/observability/observability.controller';
import { PlatformController } from '../../../backend/src/platform/platform.controller';

describe('Operational controllers external tests', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delegates audit query and exports CSV/JSON with headers', async () => {
    const auditLogService = {
      query: jest.fn().mockResolvedValue({ items: [] }),
      exportCsv: jest.fn().mockResolvedValue('a,b'),
      exportJson: jest.fn().mockResolvedValue([{ id: 1 }]),
    };
    const featureFlagsService = { assertEnabled: jest.fn() };
    const controller = new AuditLogController(auditLogService as any, featureFlagsService as any);

    await controller.findAll({ action: 'LOGIN' } as any);
    expect(auditLogService.query).toHaveBeenCalledWith({ action: 'LOGIN' });

    const csvRes = { setHeader: jest.fn(), send: jest.fn() } as any;
    await controller.exportCsv({} as any, csvRes);
    expect(csvRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(csvRes.send).toHaveBeenCalledWith(expect.stringContaining('a,b'));

    const jsonRes = { setHeader: jest.fn(), send: jest.fn() } as any;
    await controller.exportJson({ q: 'x' } as any, jsonRes);
    expect(featureFlagsService.assertEnabled).toHaveBeenCalled();
    expect(jsonRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
    expect(jsonRes.send).toHaveBeenCalledWith(JSON.stringify([{ id: 1 }], null, 2));
  });

  it('normalizes maxRoutes in observability controller', async () => {
    const httpMetricsService = { getSnapshot: jest.fn().mockReturnValue({ routes: [] }) };
    const backendMetricsService = { getSnapshot: jest.fn().mockReturnValue({ status: 'ok' }) };
    const prometheusMetricsService = { getMetricsText: jest.fn().mockResolvedValue('metric 1') };
    const controller = new ObservabilityController(
      httpMetricsService as any,
      backendMetricsService as any,
      prometheusMetricsService as any,
    );

    expect(controller.getHttpMetrics('500')).toEqual({ routes: [], backend: { status: 'ok' } });
    expect(httpMetricsService.getSnapshot).toHaveBeenCalledWith(200);
    expect(await controller.getPrometheusMetrics()).toBe('metric 1');
  });

  it('returns feature snapshot', () => {
    const controller = new PlatformController({ getSnapshot: jest.fn().mockReturnValue({ darkMode: true }) } as any);
    expect(controller.getFeatures()).toEqual({ darkMode: true });
  });
});
