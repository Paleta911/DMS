import { HttpMetricsService } from './http-metrics.service';

describe('HttpMetricsService', () => {
  it('records totals and route stats', () => {
    const service = new HttpMetricsService();

    service.recordHttpRequest({
      method: 'get',
      path: '/documents?page=1',
      statusCode: 200,
      durationMs: 25,
    });
    service.recordHttpRequest({
      method: 'GET',
      path: '/documents?page=2',
      statusCode: 500,
      durationMs: 40,
    });

    const snapshot = service.getSnapshot();
    expect(snapshot.totals.requests).toBe(2);
    expect(snapshot.totals.errors).toBe(1);
    expect(snapshot.totals.statusCounts['2xx']).toBe(1);
    expect(snapshot.totals.statusCounts['5xx']).toBe(1);
    expect(snapshot.routes[0]?.route).toBe('GET /documents');
    expect(snapshot.routes[0]?.avgDurationMs).toBe(32.5);
  });

  it('normalizes dynamic ids and tracks slow requests', () => {
    const service = new HttpMetricsService();

    service.recordHttpRequest({
      method: 'GET',
      path: '/documents/1130/versions/8b5d1a0e-74d0-46cb-a7f3-5e2b43fe7116',
      statusCode: 404,
      durationMs: 1400,
    });

    const snapshot = service.getSnapshot();
    expect(snapshot.totals.slowRequests).toBe(1);
    expect(snapshot.totals.statusCounts['4xx']).toBe(1);
    expect(snapshot.routes[0]?.route).toBe('GET /documents/:id/versions/:uuid');
    expect(snapshot.routes[0]?.slowRequests).toBe(1);
    expect(snapshot.slowestRoutes[0]?.route).toBe(
      'GET /documents/:id/versions/:uuid',
    );
  });
});
