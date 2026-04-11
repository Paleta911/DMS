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
    getDocumentVisibilityPolicy: vi.fn(),
    updateDocumentVisibilityPolicy: vi.fn(),
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
  getDocumentVisibilityPolicy: mocks.api.getDocumentVisibilityPolicy,
  updateDocumentVisibilityPolicy: mocks.api.updateDocumentVisibilityPolicy,
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
    window.localStorage.clear();
    mocks.notify.mockReset();
    mocks.api.documentsList.mockReset();
    mocks.api.uploadDocument.mockReset();
    mocks.api.getDocumentVisibilityPolicy.mockReset();
    mocks.api.updateDocumentVisibilityPolicy.mockReset();
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
    mocks.api.getDocumentVisibilityPolicy.mockResolvedValue({
      draftVisibleToUsers: true,
      inReviewVisibleToUsers: true,
      approvedVisibleToUsers: true,
      obsoleteVisibleToUsers: true,
      updatedAt: '2026-04-10T00:00:00.000Z',
    });
  });

  it('permite ver documentos aunque el usuario no tenga áreas asignadas', async () => {
    mocks.auth.user = {
      ...mocks.auth.user!,
      allowedAreaCodes: [],
    };

    renderWithProviders(<DocumentsPage />);

    expect((await screen.findAllByText('Manual de calidad')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Sin áreas asignadas')).not.toBeInTheDocument();
  });

  it('deshabilita subir documento cuando el usuario no tiene permiso de carga', async () => {
    renderWithProviders(<DocumentsPage />);

    const uploadButton = await screen.findByRole('button', { name: /subir documento/i });
    expect(uploadButton).toBeDisabled();
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
        status: undefined,
        from: undefined,
        to: undefined,
        page: 1,
        limit: 20,
      });
    });

    expect(await screen.findByText('Búsqueda avanzada activa')).toBeInTheDocument();
  });

  it('aplica filtros de estado y fechas en el listado normal', async () => {
    renderWithProviders(<DocumentsPage />);

    fireEvent.change(await screen.findByLabelText('Estado'), {
      target: { value: 'APPROVED' },
    });
    fireEvent.change(screen.getByLabelText('Fecha desde'), {
      target: { value: '2026-03-01' },
    });
    fireEvent.change(screen.getByLabelText('Fecha hasta'), {
      target: { value: '2026-03-31' },
    });

    await waitFor(() => {
      expect(mocks.api.documentsList).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        categoryId: '',
        documentTypeCode: '',
        areaCode: '',
        status: 'APPROVED',
        from: '2026-03-01',
        to: '2026-03-31',
        sortByName: '',
      });
    });
  });

  it('muestra controles globales de visibilidad para admins', async () => {
    mocks.auth.isAdmin = true;
    mocks.auth.user = {
      ...mocks.auth.user!,
      role: 'admin',
    };

    renderWithProviders(<DocumentsPage />);

    expect(await screen.findByText('Visibilidad global de documentos')).toBeInTheDocument();
    expect(mocks.api.getDocumentVisibilityPolicy).toHaveBeenCalled();
    expect(
      await screen.findByRole('switch', { name: 'Visibilidad de Borradores' }),
    ).toBeInTheDocument();
  });

  it('restaura los filtros del usuario al salir y volver a la ruta', async () => {
    const firstRender = renderWithProviders(<DocumentsPage />);

    fireEvent.change(screen.getByLabelText('Buscar'), {
      target: { value: 'manual' },
    });
    fireEvent.change(await screen.findByLabelText('Estado'), {
      target: { value: 'APPROVED' },
    });
    fireEvent.change(screen.getByLabelText('Fecha desde'), {
      target: { value: '2026-03-01' },
    });
    fireEvent.change(screen.getByLabelText('Fecha hasta'), {
      target: { value: '2026-03-31' },
    });
    fireEvent.change(screen.getByLabelText('Límite'), {
      target: { value: '10' },
    });

    await waitFor(() => {
      expect(mocks.api.searchQuery).toHaveBeenCalledWith({
        q: 'manual',
        categoryId: undefined,
        documentTypeCode: undefined,
        areaCode: undefined,
        status: 'APPROVED',
        from: '2026-03-01',
        to: '2026-03-31',
        page: 1,
        limit: 10,
      });
    });

    firstRender.unmount();

    renderWithProviders(<DocumentsPage />);

    expect(await screen.findByDisplayValue('manual')).toBeInTheDocument();
    expect((screen.getByLabelText('Estado') as HTMLSelectElement).value).toBe('APPROVED');
    expect(screen.getByDisplayValue('2026-03-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-03-31')).toBeInTheDocument();
    expect((screen.getByLabelText('Límite') as HTMLSelectElement).value).toBe('10');
  });
});
