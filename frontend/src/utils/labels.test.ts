import { describe, expect, it } from 'vitest';
import { getSearchRelevance, translateRole, translateSearchEngine, translateStatus } from './labels';

describe('labels utils', () => {
  it('traduce estados conocidos', () => {
    expect(translateStatus('APPROVED')).toBe('Aprobado');
    expect(translateStatus('PENDING_APPROVAL')).toBe('Pendiente de aprobación');
    expect(translateStatus(undefined)).toBe('-');
  });

  it('traduce rol y motor', () => {
    expect(translateRole('admin')).toBe('Administrador');
    expect(translateSearchEngine('elastic')).toBe('Elastic');
  });

  it('calcula coincidencia por nivel', () => {
    expect(getSearchRelevance(10, 10).label).toBe('Alta');
    expect(getSearchRelevance(6, 10).label).toBe('Media');
    expect(getSearchRelevance(3, 10).label).toBe('Baja');
    expect(getSearchRelevance(undefined, 10).label).toBe('Sin dato');
  });
});
