import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../types/auth';
import { renderWithProviders } from '../../test/test-utils';
import { queryClient } from '../../app/queryClient';
import TypesAreasPage from './TypesAreasPage';

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as AuthUser | null,
    isAdmin: false,
  },
  notify: vi.fn(),
  api: {
    adminDocumentTypesList: vi.fn(),
    documentTypesCreate: vi.fn(),
    documentTypesUpdate: vi.fn(),
    documentTypesDelete: vi.fn(),
    adminAreaCodesList: vi.fn(),
    areaCodesCreate: vi.fn(),
    areaCodesUpdate: vi.fn(),
    areaCodesDelete: vi.fn(),
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

vi.mock('../../api/endpoints/types', () => mocks.api);

describe('TypesAreasPage', () => {
  beforeEach(() => {
    queryClient.clear();
    mocks.notify.mockReset();
    Object.values(mocks.api).forEach((fn) => fn.mockReset());

    mocks.auth.isAdmin = true;
    mocks.auth.user = {
      id: 1,
      email: 'admin@local.com',
      role: 'admin',
      isSuperAdmin: true,
    };

    mocks.api.adminDocumentTypesList.mockResolvedValue({
      items: [{ id: 1, code: 'PRO', nombreLargo: 'Procedimiento', activo: true }],
      total: 1,
      page: 1,
      limit: 10,
    });
    mocks.api.adminAreaCodesList.mockResolvedValue({
      items: [{ id: 1, code: 'RC', nombre: 'Recursos Humanos', activo: true }],
      total: 1,
      page: 1,
      limit: 10,
    });
    mocks.api.documentTypesCreate.mockResolvedValue({ id: 2, code: 'INS', nombreLargo: 'Instructivo' });
    mocks.api.documentTypesUpdate.mockResolvedValue({
      id: 1,
      code: 'PRO',
      nombreLargo: 'Procedimiento SIG',
      activo: true,
    });
    mocks.api.documentTypesDelete.mockResolvedValue({ success: true });
    mocks.api.areaCodesCreate.mockResolvedValue({ id: 2, code: 'FA', nombre: 'Finanzas' });
    mocks.api.areaCodesUpdate.mockResolvedValue({
      id: 1,
      code: 'RC',
      nombre: 'Recursos y Calidad',
      activo: true,
    });
    mocks.api.areaCodesDelete.mockResolvedValue({ success: true });
  });

  it('muestra acceso denegado si el usuario no es admin', () => {
    mocks.auth.isAdmin = false;
    mocks.auth.user = {
      id: 8,
      email: 'user@bsm.com.mx',
      role: 'user',
    };

    renderWithProviders(<TypesAreasPage />);

    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
  });

  it('crea un tipo y actualiza un área', async () => {
    renderWithProviders(<TypesAreasPage />);

    expect(await screen.findByText('Procedimiento')).toBeInTheDocument();

    const codeInputs = screen.getAllByLabelText('Código');
    fireEvent.change(codeInputs[0], { target: { value: 'ins' } });
    fireEvent.change(screen.getByLabelText('Nombre largo'), {
      target: { value: 'Instructivo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear tipo' }));

    await waitFor(() => {
      expect(mocks.api.documentTypesCreate).toHaveBeenCalledWith({
        code: 'INS',
        nombreLargo: 'Instructivo',
      });
      expect(mocks.notify).toHaveBeenCalledWith('Tipo creado', 'success');
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[1]);
    const editAreaDialog = screen.getByRole('dialog', { name: 'Editar área' });
    fireEvent.change(within(editAreaDialog).getByLabelText('Nombre'), {
      target: { value: 'Recursos y Calidad' },
    });
    fireEvent.click(within(editAreaDialog).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(mocks.api.areaCodesUpdate).toHaveBeenCalledWith(1, {
        id: 1,
        nombre: 'Recursos y Calidad',
      });
      expect(mocks.notify).toHaveBeenCalledWith('Área actualizada', 'success');
    });
  });

  it('desactiva un tipo y un área', async () => {
    renderWithProviders(<TypesAreasPage />);

    expect(await screen.findByText('Procedimiento')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Desactivar' })[0]);
    const disableTypeDialog = screen.getByRole('dialog', {
      name: 'Desactivar tipo de documento',
    });
    fireEvent.click(within(disableTypeDialog).getByRole('button', { name: 'Desactivar' }));

    await waitFor(() => {
      expect(mocks.api.documentTypesDelete).toHaveBeenCalledWith(1);
      expect(mocks.notify).toHaveBeenCalledWith('Tipo desactivado', 'success');
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Desactivar' })[1]);
    const disableAreaDialog = screen.getByRole('dialog', { name: 'Desactivar área' });
    fireEvent.click(within(disableAreaDialog).getByRole('button', { name: 'Desactivar' }));

    await waitFor(() => {
      expect(mocks.api.areaCodesDelete).toHaveBeenCalledWith(1);
      expect(mocks.notify).toHaveBeenCalledWith('Área desactivada', 'success');
    });
  });
});
