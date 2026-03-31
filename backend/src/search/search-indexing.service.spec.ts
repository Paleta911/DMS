import { SearchIndexingService } from './search-indexing.service';
import { SearchIndexJobStatus } from './search-index-job.entity';

function createQueueStatsBuilder(rawOne?: {
  pendingJobs?: string | number | null;
  dueJobs?: string | number | null;
  oldestNextAttemptAt?: string | Date | null;
}) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(
      rawOne ?? {
        pendingJobs: 0,
        dueJobs: 0,
        oldestNextAttemptAt: null,
      },
    ),
  };
}

describe('SearchIndexingService', () => {
  function createService() {
    const client = {
      index: jest.fn(),
      count: jest.fn(),
      indices: {
        refresh: jest.fn(),
      },
    };
    const searchEngineService = {
      isFallbackMode: jest.fn().mockReturnValue(false),
      ensureElasticReady: jest.fn().mockResolvedValue(true),
      ensureElasticReadyOrThrow: jest.fn().mockResolvedValue(undefined),
      isElasticOnlyMode: jest.fn().mockReturnValue(false),
      getClient: jest.fn().mockReturnValue(client),
      getIndexName: jest.fn().mockReturnValue('dms_documents'),
    };
    const documentRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    const versionRepo = {
      findOne: jest.fn(),
    };
    const searchIndexJobRepo = {
      delete: jest.fn().mockResolvedValue(undefined),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue(createQueueStatsBuilder()),
    };
    const searchStateService = {
      setReindexResult: jest.fn(),
      getSnapshot: jest.fn().mockReturnValue({
        lastReindexAt: null,
        lastReindexDurationMs: null,
        lastReindexTotal: 0,
        lastReindexFailed: 0,
      }),
    };
    const backendMetricsService = {
      recordSearchReindex: jest.fn(),
      recordSearchIndexSuccess: jest.fn(),
      recordSearchIndexFailure: jest.fn(),
      recordSearchQueueWorker: jest.fn(),
      recordSearchQueueEnqueued: jest.fn(),
      recordSearchIndexRetry: jest.fn(),
      recordSearchIndexDropped: jest.fn(),
    };

    const service = new SearchIndexingService(
      searchEngineService as any,
      documentRepo as any,
      versionRepo as any,
      searchIndexJobRepo as any,
      searchStateService as any,
      backendMetricsService as any,
    );

    return {
      service,
      client,
      searchEngineService,
      documentRepo,
      versionRepo,
      searchIndexJobRepo,
      searchStateService,
      backendMetricsService,
    };
  }

  it('indexa un documento con su ultima version y limpia la cola persistente', async () => {
    const {
      service,
      client,
      documentRepo,
      versionRepo,
      searchIndexJobRepo,
      backendMetricsService,
      searchEngineService,
    } = createService();
    documentRepo.findOne.mockResolvedValue({
      id: 7,
      nombre: 'Procedimiento',
      codigo: 'PRO-RC-01',
      status: 'APPROVED',
      category: { id: 1, nombre: 'Calidad' },
      documentType: { code: 'PRO', nombreLargo: 'Procedimiento' },
      areaCode: { code: 'RC', nombre: 'Recursos Humanos' },
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-02T00:00:00.000Z'),
    });
    versionRepo.findOne.mockResolvedValue({
      id: 12,
      comentario: 'Version inicial',
      contentText: 'contenido indexable',
    });
    client.index.mockResolvedValue({});

    await service.indexDocument(7);

    expect(searchEngineService.ensureElasticReadyOrThrow).toHaveBeenCalled();
    expect(client.index).toHaveBeenCalledWith({
      index: 'dms_documents',
      id: '7',
      document: expect.objectContaining({
        documentId: '7',
        codigo: 'PRO-RC-01',
        latestVersionId: '12',
        latestComentario: 'Version inicial',
        content: 'contenido indexable',
      }),
    });
    expect(searchIndexJobRepo.delete).toHaveBeenCalledWith({ documentId: 7 });
    expect(backendMetricsService.recordSearchIndexSuccess).toHaveBeenCalled();
  });

  it('omite reindex completo en modo fallback', async () => {
    const { service, searchEngineService } = createService();
    searchEngineService.isFallbackMode.mockReturnValue(true);

    await expect(service.reindexAll()).resolves.toEqual({
      engine: 'fallback',
      indexed: 0,
      failed: 0,
      total: 0,
      durationMs: 0,
      skipped: true,
      reason: 'SEARCH_MODE=fallback',
    });
  });

  it('omite reindex si elastic no esta disponible en modo auto', async () => {
    const { service, searchEngineService } = createService();
    searchEngineService.ensureElasticReady.mockResolvedValue(false);
    searchEngineService.isElasticOnlyMode.mockReturnValue(false);

    await expect(service.reindexAll()).resolves.toEqual({
      engine: 'fallback',
      indexed: 0,
      failed: 0,
      total: 0,
      durationMs: 0,
      skipped: true,
      reason: 'Elasticsearch no disponible',
    });
  });

  it('reindexa todos los documentos y registra estado y metricas', async () => {
    const {
      service,
      client,
      documentRepo,
      searchStateService,
      backendMetricsService,
    } = createService();
    documentRepo.find.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    jest
      .spyOn(service, 'indexDocument')
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('boom'));
    client.indices.refresh.mockResolvedValue({});

    const result = await service.reindexAll();

    expect(client.indices.refresh).toHaveBeenCalledWith({
      index: 'dms_documents',
    });
    expect(searchStateService.setReindexResult).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 3,
        failed: 1,
      }),
    );
    expect(backendMetricsService.recordSearchReindex).toHaveBeenCalledWith({
      total: 3,
      failed: 1,
    });
    expect(result).toMatchObject({
      engine: 'elastic',
      indexed: 2,
      failed: 1,
      total: 3,
      failures: [{ documentId: 3, error: 'boom' }],
    });
  });

  it('reporta estado del indice con cola y fallidos en fallback', async () => {
    const {
      service,
      searchEngineService,
      searchIndexJobRepo,
      searchStateService,
    } = createService();
    searchEngineService.isFallbackMode.mockReturnValue(true);
    searchStateService.getSnapshot.mockReturnValue({
      lastReindexAt: new Date('2026-03-09T00:00:00.000Z'),
      lastReindexDurationMs: 2400,
      lastReindexTotal: 40,
      lastReindexFailed: 3,
    });
    searchIndexJobRepo.count.mockResolvedValue(2);
    searchIndexJobRepo.createQueryBuilder.mockReturnValue(
      createQueueStatsBuilder({
        pendingJobs: 4,
        dueJobs: 1,
        oldestNextAttemptAt: new Date(Date.now() - 5000),
      }),
    );

    const status = await service.getIndexStatus();

    expect(status).toMatchObject({
      engine: 'fallback',
      esAvailable: false,
      pendingIndexJobs: 4,
      failedIndexJobs: 2,
      docsCount: null,
      lastReindexTotal: 40,
      lastReindexFailed: 3,
      queue: expect.objectContaining({
        pendingJobs: 4,
        dueJobs: 1,
        workerRunning: false,
      }),
    });
  });

  it('reporta conteo del indice cuando elastic esta disponible', async () => {
    const { service, client, searchEngineService, searchIndexJobRepo } =
      createService();
    searchEngineService.isFallbackMode.mockReturnValue(false);
    searchEngineService.ensureElasticReady.mockResolvedValue(true);
    client.count.mockResolvedValue({ count: 185 });
    searchIndexJobRepo.count.mockResolvedValue(1);
    searchIndexJobRepo.createQueryBuilder.mockReturnValue(
      createQueueStatsBuilder({
        pendingJobs: 3,
        dueJobs: 2,
        oldestNextAttemptAt: null,
      }),
    );

    const status = await service.getIndexStatus();

    expect(client.count).toHaveBeenCalledWith({ index: 'dms_documents' });
    expect(status).toMatchObject({
      engine: 'elastic',
      esAvailable: true,
      docsCount: 185,
      pendingIndexJobs: 3,
      failedIndexJobs: 1,
    });
  });
});
