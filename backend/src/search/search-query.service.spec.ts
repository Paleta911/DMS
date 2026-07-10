import { ServiceUnavailableException } from '@nestjs/common';
import { SearchQueryService } from './search-query.service';

describe('SearchQueryService', () => {
  function createService() {
    const client = {
      search: jest.fn(),
    };
    const searchEngineService = {
      isFallbackMode: jest.fn(),
      ensureElasticReady: jest.fn(),
      isElasticOnlyMode: jest.fn(),
      getClient: jest.fn().mockReturnValue(client),
      getIndexName: jest.fn().mockReturnValue('dms_documents'),
    };
    const documentRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    const versionRepo = {};
    const backendMetricsService = {
      recordSearchQuery: jest.fn(),
    };
    const documentVisibilityService = {
      getVisibleStatusesForActor: jest.fn().mockResolvedValue([
        'DRAFT',
        'IN_REVIEW',
        'APPROVED',
        'OBSOLETE',
      ]),
    };
    const service = new SearchQueryService(
      searchEngineService as any,
      documentRepo as any,
      versionRepo as any,
      backendMetricsService as any,
      documentVisibilityService as any,
    );

    return {
      service,
      client,
      documentRepo,
      searchEngineService,
      backendMetricsService,
      documentVisibilityService,
    };
  }

  it('usa fallback cuando el modo configurado es fallback', async () => {
    const { service, searchEngineService, backendMetricsService } =
      createService();
    const fallbackResult = {
      engine: 'fallback' as const,
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    };
    searchEngineService.isFallbackMode.mockReturnValue(true);
    const fallbackSpy = jest
      .spyOn<any, any>(service as any, 'searchFallback')
      .mockResolvedValue(fallbackResult);

    await expect(service.search({ q: 'smoke' })).resolves.toEqual(
      fallbackResult,
    );
    expect(fallbackSpy).toHaveBeenCalledWith({ q: 'smoke' });
    expect(backendMetricsService.recordSearchQuery).toHaveBeenCalledWith(
      'fallback',
    );
  });

  it('lanza error si elastic es obligatorio y no esta disponible', async () => {
    const { service, searchEngineService } = createService();
    searchEngineService.isFallbackMode.mockReturnValue(false);
    searchEngineService.ensureElasticReady.mockResolvedValue(false);
    searchEngineService.isElasticOnlyMode.mockReturnValue(true);

    await expect(service.search({ q: 'smoke' })).rejects.toThrow(
      new ServiceUnavailableException('Elasticsearch no disponible'),
    );
  });

  it('devuelve vacio si el usuario no tiene areas permitidas', async () => {
    const { service, client, searchEngineService } = createService();
    searchEngineService.isFallbackMode.mockReturnValue(false);
    searchEngineService.ensureElasticReady.mockResolvedValue(true);

    await expect(
      service.search({ allowedAreaCodes: [], page: 2, limit: 5 }),
    ).resolves.toEqual({
      engine: 'elastic',
      items: [],
      total: 0,
      page: 2,
      limit: 5,
    });
    expect(client.search).not.toHaveBeenCalled();
  });

  it('devuelve vacio si no hay estados visibles para usuarios normales', async () => {
    const { service, client, searchEngineService, documentVisibilityService } =
      createService();
    searchEngineService.isFallbackMode.mockReturnValue(false);
    searchEngineService.ensureElasticReady.mockResolvedValue(true);
    documentVisibilityService.getVisibleStatusesForActor.mockResolvedValue([]);

    await expect(service.search({ page: 1, limit: 10 })).resolves.toEqual({
      engine: 'elastic',
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    expect(client.search).not.toHaveBeenCalled();
  });

  it('consulta elastic y mapea hits correctamente', async () => {
    const {
      service,
      client,
      documentRepo,
      searchEngineService,
      backendMetricsService,
    } =
      createService();
    searchEngineService.isFallbackMode.mockReturnValue(false);
    searchEngineService.ensureElasticReady.mockResolvedValue(true);
    documentRepo.find.mockResolvedValue([
      {
        id: 10,
        codigo: 'PRO-RC-01',
        nombre: 'Doc smoke',
        status: 'APPROVED',
        category: null,
        documentType: null,
        areaCode: null,
        createdAt: '2026-04-10T00:00:00.000Z',
        updatedAt: '2026-04-10T00:00:00.000Z',
      },
    ]);
    client.search.mockResolvedValue({
      hits: {
        hits: [
          {
            _score: 1.77,
            _source: {
              documentId: '10',
              codigo: 'PRO-RC-01',
              nombre: 'Doc smoke',
            },
          },
        ],
        total: { value: 1, relation: 'eq' },
      },
    });

    const result = await service.search({
      q: 'smoke',
      documentTypeCode: 'pro',
      areaCode: 'rc',
      page: 1,
      limit: 20,
    });

    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'dms_documents',
        from: 0,
        size: 100,
      }),
    );
    expect(result).toEqual({
      engine: 'elastic',
      items: [
        {
          score: 1.77,
          documentId: '10',
          codigo: 'PRO-RC-01',
          nombre: 'Doc smoke',
          status: 'APPROVED',
          categoryId: null,
          categoryNombre: null,
          documentTypeCode: null,
          documentTypeNombre: null,
          areaCode: null,
          areaNombre: null,
          createdAt: '2026-04-10T00:00:00.000Z',
          updatedAt: '2026-04-10T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    expect(backendMetricsService.recordSearchQuery).toHaveBeenCalledWith(
      'elastic',
    );
  });

  it('usa el estado actual en BD para reconciliar hits de elastic', async () => {
    const { service, client, documentRepo, searchEngineService } =
      createService();
    searchEngineService.isFallbackMode.mockReturnValue(false);
    searchEngineService.ensureElasticReady.mockResolvedValue(true);
    documentRepo.find.mockResolvedValue([
      {
        id: 33,
        codigo: 'MC-SIS-01',
        nombre: 'CV',
        status: 'OBSOLETE',
        category: null,
        documentType: { code: 'MC', nombreLargo: 'Manual corto' },
        areaCode: { code: 'SIS', nombre: 'Sistemas' },
        createdAt: '2026-04-10T16:55:00.000Z',
        updatedAt: '2026-04-10T16:55:00.000Z',
      },
    ]);
    client.search.mockResolvedValue({
      hits: {
        hits: [
          {
            _score: 1.2,
            _source: {
              documentId: '33',
              codigo: 'MC-SIS-01',
              nombre: 'CV',
              status: 'APPROVED',
            },
          },
        ],
        total: { value: 1, relation: 'eq' },
      },
    });

    const result = await service.search({ q: 'cv', page: 1, limit: 20 });

    expect(result.items).toEqual([
      expect.objectContaining({
        documentId: '33',
        status: 'OBSOLETE',
        documentTypeCode: 'MC',
        areaCode: 'SIS',
      }),
    ]);
  });

  it('vuelve a fallback si elastic falla en modo auto', async () => {
    const { service, client, searchEngineService, backendMetricsService } =
      createService();
    const fallbackResult = {
      engine: 'fallback' as const,
      items: [{ documentId: '22' }],
      total: 1,
      page: 1,
      limit: 20,
    };
    searchEngineService.isFallbackMode.mockReturnValue(false);
    searchEngineService.ensureElasticReady.mockResolvedValue(true);
    searchEngineService.isElasticOnlyMode.mockReturnValue(false);
    client.search.mockRejectedValue(new Error('elastic down'));
    const fallbackSpy = jest
      .spyOn<any, any>(service as any, 'searchFallback')
      .mockResolvedValue(fallbackResult);

    await expect(service.search({ q: 'smoke' })).resolves.toEqual(
      fallbackResult,
    );
    expect(fallbackSpy).toHaveBeenCalledWith({ q: 'smoke' });
    expect(backendMetricsService.recordSearchQuery).toHaveBeenCalledWith(
      'fallback',
    );
  });
});
