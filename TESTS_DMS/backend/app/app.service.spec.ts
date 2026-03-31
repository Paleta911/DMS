import { AppService } from '../../../backend/src/app.service';

describe('AppService external tests', () => {
  it('returns hello world', () => {
    const service = new AppService(
      { query: jest.fn() } as any,
      { checkElasticHealthCached: jest.fn() } as any,
    );

    expect(service.getHello()).toBe('Hello World!');
  });

  it('reports db up and includes request id when available', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ ok: 1 }]),
    };
    const searchService = {
      checkElasticHealthCached: jest.fn().mockResolvedValue({ status: 'up' }),
    };
    const requestContext = require('../../../backend/src/common/request-context');
    jest.spyOn(requestContext, 'getRequestId').mockReturnValue('req-123');

    const service = new AppService(dataSource as any, searchService as any);
    await expect(service.healthCheck()).resolves.toEqual({
      status: 'ok',
      db: 'up',
      es: 'up',
      requestId: 'req-123',
    });
  });

  it('reports db down when query throws', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('offline')),
    };
    const searchService = {
      checkElasticHealthCached: jest.fn().mockResolvedValue({ status: 'down' }),
    };
    const requestContext = require('../../../backend/src/common/request-context');
    jest.spyOn(requestContext, 'getRequestId').mockReturnValue(undefined);

    const service = new AppService(dataSource as any, searchService as any);
    await expect(service.healthCheck()).resolves.toEqual({
      status: 'ok',
      db: 'down',
      es: 'down',
    });
  });
});
