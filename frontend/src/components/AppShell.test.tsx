import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/test-utils';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AppShell } from './AppShell';

const mocks = vi.hoisted(() => ({
  auth: {
    user: {
      id: 1,
      email: 'admin@local.com',
      role: 'admin',
      isSuperAdmin: true,
    },
    isAdmin: true,
    logout: vi.fn(),
  },
  health: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.auth.user,
    token: 'token',
    isAdmin: mocks.auth.isAdmin,
    login: vi.fn(),
    logout: mocks.auth.logout,
    refreshUser: vi.fn(),
  }),
}));

vi.mock('../api/endpoints/auth', () => ({
  getHealth: mocks.health,
}));

vi.mock('../utils/brand', () => ({
  bsmLogoUrl: null,
}));

vi.mock('../hooks/useOperationalNotifications', () => ({
  useOperationalNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    isUnread: () => false,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  }),
}));

describe('AppShell', () => {
  it('expone skip link, navegación accesible y panel de salud', async () => {
    mocks.health.mockResolvedValue({
      db: 'up',
      es: 'up',
      requestId: 'req-1',
    });

    renderWithProviders(
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/documents" element={<div>Contenido principal</div>} />
        </Route>
      </Routes>,
      {
        route: '/documents',
        wrapper: (children) => <ThemeProvider>{children}</ThemeProvider>,
      },
    );

    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(screen.getByLabelText('Navegación principal')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('DB: up');
      expect(screen.getByRole('status')).toHaveTextContent('ES: up');
    });
  });
});
