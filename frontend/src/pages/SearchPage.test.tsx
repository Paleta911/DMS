import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/test-utils';
import SearchPage from './SearchPage';

const mocks = vi.hoisted(() => ({
  notify: vi.fn(),
  api: {
    searchQuery: vi.fn(),
    categoriesList: vi.fn(),
    documentTypesList: vi.fn(),
    areaCodesList: vi.fn(),
  },
}));

vi.mock('../components/ToastProvider', () => ({
  useToast: () => ({
    notify: mocks.notify,
  }),
}));

vi.mock('../api/endpoints/search', () => ({
  searchQuery: mocks.api.searchQuery,
}));

vi.mock('../api/endpoints/categories', () => ({
  categoriesList: mocks.api.categoriesList,
}));

vi.mock('../api/endpoints/types', () => ({
  documentTypesList: mocks.api.documentTypesList,
  areaCodesList: mocks.api.areaCodesList,
}));

describe('SearchPage', () => {
  beforeEach(() => {
    mocks.notify.mockReset();
    mocks.api.searchQuery.mockReset();
    mocks.api.categoriesList.mockReset();
    mocks.api.documentTypesList.mockReset();
    mocks.api.areaCodesList.mockReset();

    mocks.api.searchQuery.mockResolvedValue({
      engine: 'elastic',
      items: [
        {
          documentId: '101',
          codigo: 'MAN-FA-01',
          nombre: 'Manual de calidad',
          categoryNombre: 'Calidad',
          documentTypeCode: 'MAN',
          areaCode: 'FA',
          latestComentario: 'Versión vigente',
          score: 1.2,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    mocks.api.categoriesList.mockResolvedValue([{ id: 1, nombre: 'Calidad' }]);
    mocks.api.documentTypesList.mockResolvedValue([{ id: 1, code: 'MAN', nombreLargo: 'Manual', activo: true }]);
    mocks.api.areaCodesList.mockResolvedValue([{ id: 1, code: 'FA', nombre: 'Finanzas', activo: true }]);
  });

  it('avisa cuando se intenta buscar sin filtros', async () => {
    renderWithProviders(<SearchPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(mocks.notify).toHaveBeenCalledWith('Ingresa al menos un filtro o texto', 'info');
  });

  it('muestra resultados con el motor de búsqueda activo', async () => {
    renderWithProviders(<SearchPage />);

    fireEvent.change(screen.getByLabelText('Consulta'), {
      target: { value: 'manual' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Elastic')).toBeInTheDocument();
    expect((await screen.findAllByText('Manual de calidad')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Alta')).length).toBeGreaterThan(0);
  });
});
