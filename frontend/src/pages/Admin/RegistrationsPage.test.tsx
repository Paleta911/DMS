import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../types/auth';
import { renderWithProviders } from '../../test/test-utils';
import RegistrationsPage from './RegistrationsPage';

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as AuthUser | null,
    isAdmin: false,
  },
  notify: vi.fn(),
  api: {
    adminRegistrationsList: vi.fn(),
    adminRegistrationApprove: vi.fn(),
    adminRegistrationReject: vi.fn(),
    adminRegistrationResend: vi.fn(),
    adminRegistrationForceVerify: vi.fn(),
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

vi.mock('../../api/endpoints/adminRegistrations', () => mocks.api);

describe('RegistrationsPage', () => {
  beforeEach(() => {
    mocks.notify.mockReset();
    mocks.api.adminRegistrationsList.mockReset();
    mocks.api.adminRegistrationApprove.mockReset();
    mocks.api.adminRegistrationReject.mockReset();
    mocks.api.adminRegistrationResend.mockReset();
    mocks.api.adminRegistrationForceVerify.mockReset();

    mocks.auth.isAdmin = true;
    mocks.auth.user = {
      id: 1,
      email: 'admin@local.com',
      role: 'admin',
      isSuperAdmin: true,
    };

    mocks.api.adminRegistrationsList.mockResolvedValue({
      items: [
        {
          id: 7,
          email: 'sus@bsm.com.mx',
          nombre: 'Sus',
          primerApellido: 'Pérez',
          status: 'PENDING_APPROVAL',
          registeredAt: '2026-03-08T00:00:00.000Z',
          sendStatus: 'SIMULATED',
          sendAttempts: 1,
          verifyAttempts: 0,
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    });
    mocks.api.adminRegistrationApprove.mockResolvedValue({});
    mocks.api.adminRegistrationReject.mockResolvedValue({});
    mocks.api.adminRegistrationResend.mockResolvedValue({});
    mocks.api.adminRegistrationForceVerify.mockResolvedValue({});
  });

  it('muestra acceso denegado si no es super admin', () => {
    mocks.auth.user = {
      id: 2,
      email: 'admin@local.com',
      role: 'admin',
      isSuperAdmin: false,
    };

    renderWithProviders(<RegistrationsPage />);

    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
  });

  it('aprueba un registro pendiente', async () => {
    renderWithProviders(<RegistrationsPage />);

    expect((await screen.findAllByText('sus@bsm.com.mx')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Aprobar' })[0]);

    await waitFor(() => {
      expect(mocks.api.adminRegistrationApprove).toHaveBeenCalledWith(7);
    });

    await waitFor(() => {
      expect(mocks.notify).toHaveBeenCalledWith('Registro aprobado', 'success');
    });
  });

  it('rechaza un registro con motivo opcional', async () => {
    renderWithProviders(<RegistrationsPage />);

    expect((await screen.findAllByText('sus@bsm.com.mx')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Rechazar' })[0]);

    const input = screen.getByLabelText('Motivo (opcional)');
    fireEvent.change(input, { target: { value: 'Documentación incompleta' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rechazar' }));

    await waitFor(() => {
      expect(mocks.api.adminRegistrationReject).toHaveBeenCalledWith(7, 'Documentación incompleta');
    });

    await waitFor(() => {
      expect(mocks.notify).toHaveBeenCalledWith('Registro rechazado', 'success');
    });
  });
});
