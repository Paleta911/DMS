import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../types/auth';
import type { PermissionRequest } from '../../types/permissions';
import { renderWithProviders } from '../../test/test-utils';
import PermissionRequestsPage from './PermissionRequestsPage';

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as AuthUser | null,
    isAdmin: false,
  },
  notify: vi.fn(),
  api: {
    adminPermissionRequestsList: vi.fn(),
    adminPermissionRequestApprove: vi.fn(),
    adminPermissionRequestReject: vi.fn(),
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

vi.mock('../../api/endpoints/permissionRequests', () => mocks.api);

describe('PermissionRequestsPage', () => {
  beforeEach(() => {
    mocks.notify.mockReset();
    mocks.api.adminPermissionRequestsList.mockReset();
    mocks.api.adminPermissionRequestApprove.mockReset();
    mocks.api.adminPermissionRequestReject.mockReset();

    mocks.auth.isAdmin = true;
    mocks.auth.user = {
      id: 1,
      email: 'admin@local.com',
      role: 'admin',
      isSuperAdmin: true,
    };

    const items: PermissionRequest[] = [
      {
        id: 11,
        requestedPermissions: JSON.stringify(['UPLOAD', 'REVIEW']),
        requestType: 'PERMISSIONS',
        status: 'PENDING',
        comment: 'Necesario para operar',
        user: { id: 7, email: 'sus@bsm.com.mx' },
      },
      {
        id: 12,
        requestedPermissions: JSON.stringify(['READ']),
        requestType: 'PERMISSIONS',
        status: 'APPROVED',
        user: { id: 8, email: 'aprobado@bsm.com.mx' },
      },
    ];

    mocks.api.adminPermissionRequestsList.mockResolvedValue({
      items,
      total: items.length,
      page: 1,
      limit: 20,
    });
    mocks.api.adminPermissionRequestApprove.mockResolvedValue({});
    mocks.api.adminPermissionRequestReject.mockResolvedValue({});
  });

  it('muestra acceso denegado si el usuario no es admin', () => {
    mocks.auth.isAdmin = false;
    mocks.auth.user = {
      id: 8,
      email: 'user@bsm.com.mx',
      role: 'user',
    };

    renderWithProviders(<PermissionRequestsPage />);

    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
  });

  it('aprueba una solicitud pendiente', async () => {
    renderWithProviders(<PermissionRequestsPage />);

    expect((await screen.findAllByText('sus@bsm.com.mx')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Aprobar' })[0]);

    await waitFor(() => {
      expect(mocks.api.adminPermissionRequestApprove).toHaveBeenCalledWith(11);
    });

    await waitFor(() => {
      expect(mocks.notify).toHaveBeenCalledWith('Solicitud aprobada', 'success');
    });
  });

  it('rechaza una solicitud pendiente con motivo', async () => {
    renderWithProviders(<PermissionRequestsPage />);

    expect((await screen.findAllByText('sus@bsm.com.mx')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Rechazar' })[0]);
    fireEvent.change(screen.getByLabelText('Motivo (opcional)'), {
      target: { value: 'Falta autorización interna' },
    });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rechazar' }));

    await waitFor(() => {
      expect(mocks.api.adminPermissionRequestReject).toHaveBeenCalledWith(11, 'Falta autorización interna');
    });

    await waitFor(() => {
      expect(mocks.notify).toHaveBeenCalledWith('Solicitud rechazada', 'success');
    });
  });
});
