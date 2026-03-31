import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../types/auth';
import { renderWithProviders } from '../test/test-utils';
import DocumentsPage from './DocumentsPage';

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as AuthUser | null,
    isAdmin: false,
  },
  notify: vi.fn(),
  api: {
    documentsList: vi.fn(),
    uploadDocument: vi.fn(),
    searchQuery: vi.fn(),
    categoriesList: vi.fn(),
    documentTypesList: vi.fn(),
    areaCodesList: vi.fn(),
  },
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.auth.user,
    token: null,
    isAdmin: mocks.auth.isAdmin,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock('../components/ToastProvider', () => ({
  useToast: () => ({
    notify: mocks.notify,
  }),
}));

vi.mock('../api/endpoints/documents', () => ({
  documentsList: mocks.api.documentsList,
  uploadDocument: mocks.api.uploadDocument,
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

describe('DocumentsPage', () => {
  beforeEach(() => {
    mocks.notify.mockReset();
    mocks.api.documentsList.mockReset();
    mocks.api.uploadDocument.mockReset();
    mocks.api.searchQuery.mockReset();
    mocks.api.categoriesList.mockReset();
    mocks.api.documentTypesList.mockReset();
    mocks.api.areaCodesList.mockReset();

    mocks.auth.isAdmin = false;
    mocks.auth.user = {
      id: 17,
      email: 'sus@bsm.com.mx',
      role: 'user',
      allowedAreaCodes: ['FA'],
      permissions: {
        canAccess: true,
        canRead: true,
        canUpload: false,
        canUploadNewVersion: false,
        canReview: false,
        canApprove: false,
        canDelete: false,
      },
    };

    mocks.api.documentsList.mockResolvedValue({
      items: [
        {
          id: 101,
          nombre: 'Manual de calidad',
          codigo: 'MAN-FA-01',
          status: 'DRAFT',
          category: { id: 1, nombre: 'Calidad' },
          documentType: { id: 1, code: 'MAN', nombreLargo: 'Manual', activo: true },
          areaCode: { id: 1, code: 'FA', nombre: 'Finanzas', activo: true },
          updatedAt: '2026-03-08T12:00:00.000Z',
        },
      ],
      total: 1,
    });
    mocks.api.searchQuery.mockResolvedValue({
      engine: 'fallback',
      items: [
        {
          documentId: '101',
          codigo: 'MAN-FA-01',
          nombre: 'Manual de calidad',
          categoryNombre: 'Calidad',
          documentTypeCode: 'MAN',
          areaCode: 'FA',
          score: 1.2,
          status: 'DRAFT',
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

  it('muestra aviso claro cuando el usuario no tiene áreas asignadas', async () => {
    mocks.auth.user = {
      ...mocks.auth.user!,
      allowedAreaCodes: [],
    };
    mocks.api.documentsList.mockResolvedValue({ items: [], total: 0 });

    renderWithProviders(<DocumentsPage />);

    expect(await screen.findByText('Sin áreas asignadas')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Aún no tienes áreas asignadas. No verás documentos hasta que un administrador te asigne al menos un área.',
      ),
    ).toBeInTheDocument();
  });

  it('activa el modo de búsqueda avanzada y dispara la consulta filtrada', async () => {
    renderWithProviders(<DocumentsPage />);

    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'manual' } });

    await waitFor(() => {
      expect(mocks.api.searchQuery).toHaveBeenCalledWith({
        q: 'manual',
        categoryId: undefined,
        documentTypeCode: undefined,
        areaCode: undefined,
        page: 1,
        limit: 20,
      });
    });

    expect(await screen.findByText('Búsqueda avanzada activa')).toBeInTheDocument();
  });
});
