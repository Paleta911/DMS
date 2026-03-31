import { SearchService } from '../../../backend/src/search/search.service';

describe('SearchService facade external tests', () => {
  const indexing = {
    enqueueIndexDocument: jest.fn(),
    indexDocument: jest.fn(),
    reindexAll: jest.fn(),
    getIndexStatus: jest.fn(),
  };
  const query = {
    search: jest.fn(),
  };
  const engine = {
    checkElasticHealth: jest.fn(),
    checkElasticHealthCached: jest.fn(),
  };

  const service = new SearchService(indexing as any, query as any, engine as any);

  beforeEach(() => jest.clearAllMocks());

  it('delegates enqueue/index/reindex', async () => {
    indexing.indexDocument.mockResolvedValue({ ok: true });
    indexing.reindexAll.mockResolvedValue({ total: 1 });
    service.enqueueIndexDocument(7);
    await expect(service.indexDocument(7)).resolves.toEqual({ ok: true });
    await expect(service.reindexAll()).resolves.toEqual({ total: 1 });
    expect(indexing.enqueueIndexDocument).toHaveBeenCalledWith(7);
  });

  it('delegates search and index status', async () => {
    query.search.mockResolvedValue({ items: [] });
    indexing.getIndexStatus.mockResolvedValue({ pendingIndexJobs: 0 });
    await expect(service.search({ q: 'abc' })).resolves.toEqual({ items: [] });
    await expect(service.getIndexStatus()).resolves.toEqual({ pendingIndexJobs: 0 });
  });

  it('delegates elastic health checks', async () => {
    engine.checkElasticHealth.mockResolvedValue({ status: 'up' });
    engine.checkElasticHealthCached.mockResolvedValue({ status: 'cached' });
    await expect(service.checkElasticHealth()).resolves.toEqual({ status: 'up' });
    await expect(service.checkElasticHealthCached()).resolves.toEqual({ status: 'cached' });
  });
});
