import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../types/auth';
import { renderWithProviders } from '../../test/test-utils';
import AuditLogsPage from './AuditLogsPage';

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as AuthUser | null,
    isAdmin: false,
  },
  notify: vi.fn(),
  api: {
    auditLogsList: vi.fn(),
    auditLogsExportCsv: vi.fn(),
    auditLogsExportJson: vi.fn(),
  },
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.auth.user,
    token: null,
    isAdmin: mocks.auth.isAdmin,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock('../../components/ToastProvider', () => ({
  useToast: () => ({
    notify: mocks.notify,
  }),
}));

vi.mock('../../api/endpoints/audit', () => mocks.api);

describe('AuditLogsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.notify.mockReset();
    mocks.api.auditLogsList.mockReset();
    mocks.api.auditLogsExportCsv.mockReset();
    mocks.api.auditLogsExportJson.mockReset();

    mocks.auth.isAdmin = true;
    mocks.auth.user = {
      id: 1,
      email: 'admin@local.com',
      role: 'admin',
      isSuperAdmin: true,
    };

    mocks.api.auditLogsList.mockResolvedValue({
      items: [
        {
          id: 21,
          userId: 7,
          action: 'ACCESS_DENIED',
          resourceType: 'search',
          resourceId: 'doc-1',
          meta: JSON.stringify({ email: 'sus@bsm.com.mx', requestId: 'req-1' }),
          ip: '127.0.0.1',
          createdAt: '2026-03-08T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    mocks.api.auditLogsExportCsv.mockResolvedValue(new Blob(['id,action'], { type: 'text/csv' }));
    mocks.api.auditLogsExportJson.mockResolvedValue(
      new Blob(['[{"id":21}]'], { type: 'application/json' }),
    );
  });

  it('muestra acceso denegado si el usuario no es admin', () => {
    mocks.auth.isAdmin = false;
    mocks.auth.user = {
      id: 8,
      email: 'user@bsm.com.mx',
      role: 'user',
    };

    renderWithProviders(<AuditLogsPage />);

    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
  });

  it('abre el detalle del evento con metadatos traducidos', async () => {
    renderWithProviders(<AuditLogsPage />);

    expect((await screen.findAllByText('doc-1')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Detalle' })[0]);

    expect(await screen.findByText('Detalle del evento')).toBeInTheDocument();
    expect(screen.getByText(/"correo": "sus@bsm.com.mx"/)).toBeInTheDocument();
    expect(screen.getByText(/"idSolicitud": "req-1"/)).toBeInTheDocument();
  });

  it('exporta el CSV filtrado', async () => {
    const createObjectURL = vi.fn(() => 'blob:auditoria');
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    const realCreateElement = document.createElement.bind(document);
    const anchor = realCreateElement('a');
    anchor.click = click;

    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'a') {
        return anchor;
      }
      return realCreateElement(tagName);
    }) as typeof document.createElement);

    renderWithProviders(<AuditLogsPage />);

    expect((await screen.findAllByText('doc-1')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Exportar CSV filtrado' }));

    await waitFor(() => {
      expect(mocks.api.auditLogsExportCsv).toHaveBeenCalled();
      expect(createObjectURL).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:auditoria');
    });
  });

  it('inicializa filtros desde la URL y consulta con esos valores', async () => {
    renderWithProviders(<AuditLogsPage />, {
      route:
        '/admin/audit-logs?action=ACCESS_DENIED&user=42&q=doc-1&from=2026-03-01&to=2026-03-08&page=2&limit=50',
    });

    await waitFor(() => {
      expect(mocks.api.auditLogsList).toHaveBeenCalledWith({
        action: 'ACCESS_DENIED',
        user: '42',
        q: 'doc-1',
        from: '2026-03-01',
        to: '2026-03-08T23:59:59.999',
        page: 2,
        limit: 50,
      });
    });

    expect(screen.getByDisplayValue('doc-1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-03-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-03-08')).toBeInTheDocument();
  });

  it('recupera filtros guardados y los vuelve a guardar al aplicar cambios', async () => {
    window.localStorage.setItem(
      'audit-log-filters',
      JSON.stringify({
        action: 'ACCESS_DENIED',
        user: '15',
        q: 'registro',
        from: '2026-03-02',
        to: '2026-03-07',
        page: 1,
        limit: 20,
      }),
    );

    renderWithProviders(<AuditLogsPage />);

    await waitFor(() => {
      expect(mocks.api.auditLogsList).toHaveBeenCalledWith({
        action: 'ACCESS_DENIED',
        user: '15',
        q: 'registro',
        from: '2026-03-02',
        to: '2026-03-07T23:59:59.999',
        page: 1,
        limit: 20,
      });
    });

    fireEvent.change(screen.getByLabelText('Usuario'), {
      target: { value: '99' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem('audit-log-filters') ?? '{}')).toMatchObject({
        action: 'ACCESS_DENIED',
        user: '99',
        q: 'registro',
        from: '2026-03-02',
        to: '2026-03-07',
        page: 1,
        limit: 20,
      });
    });
  });
});
