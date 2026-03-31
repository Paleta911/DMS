import { SearchEngineService } from './search-engine.service';

describe('SearchEngineService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-09T20:00:00.000Z'));
    process.env = { ...originalEnv };
    delete process.env.SEARCH_MODE;
    delete process.env.ES_INDEX_DOCUMENTS;
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  function createService() {
    const elasticsearchService = {
      ping: jest.fn().mockResolvedValue(true),
      indices: {
        exists: jest.fn().mockResolvedValue(false),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const backendMetricsService = {
      recordElasticStatus: jest.fn(),
    };
    const service = new SearchEngineService(
      elasticsearchService as any,
      backendMetricsService as any,
    );

    return {
      service,
      elasticsearchService,
      backendMetricsService,
    };
  }

  it('crea el indice la primera vez que elastic queda listo', async () => {
    const { service, elasticsearchService, backendMetricsService } =
      createService();

    await expect(service.ensureElasticReady()).resolves.toBe(true);
    await expect(service.ensureElasticReady()).resolves.toBe(true);

    expect(elasticsearchService.ping).toHaveBeenCalledTimes(2);
    expect(elasticsearchService.indices.exists).toHaveBeenCalledTimes(1);
    expect(elasticsearchService.indices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'dms_documents',
      }),
    );
    expect(backendMetricsService.recordElasticStatus).toHaveBeenCalledWith('up');
  });

  it('usa cache de salud cuando sigue dentro del ttl', async () => {
    const { service, elasticsearchService } = createService();

    await expect(service.checkElasticHealthCached(200, 10000)).resolves.toEqual({
      status: 'up',
    });
    await expect(service.checkElasticHealthCached(200, 10000)).resolves.toEqual({
      status: 'up',
    });

    expect(elasticsearchService.ping).toHaveBeenCalledTimes(1);
  });

  it('marca elastic como down cuando el ping falla', async () => {
    const { service, elasticsearchService, backendMetricsService } =
      createService();
    elasticsearchService.ping.mockRejectedValue(new Error('offline'));

    await expect(service.ensureElasticReady()).resolves.toBe(false);

    expect(backendMetricsService.recordElasticStatus).toHaveBeenCalledWith(
      'down',
      'offline',
    );
  });

  it('reporta down si SEARCH_MODE=fallback', async () => {
    process.env.SEARCH_MODE = 'fallback';
    const { service, elasticsearchService } = createService();

    await expect(service.checkElasticHealth()).resolves.toEqual({
      status: 'down',
    });
    await expect(service.checkElasticHealthCached()).resolves.toEqual({
      status: 'down',
    });
    expect(elasticsearchService.ping).not.toHaveBeenCalled();
  });
});
