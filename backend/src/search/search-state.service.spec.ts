import { SearchStateService } from './search-state.service';

describe('SearchStateService', () => {
  it('guarda y expone el ultimo resultado de reindexacion', () => {
    const service = new SearchStateService();
    const startedAt = new Date('2026-03-09T20:10:00.000Z');

    service.setReindexResult({
      startedAt,
      durationMs: 5421,
      total: 183,
      failed: 2,
    });

    expect(service.getSnapshot()).toEqual({
      lastReindexAt: startedAt,
      lastReindexDurationMs: 5421,
      lastReindexTotal: 183,
      lastReindexFailed: 2,
    });
  });
});
