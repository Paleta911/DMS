import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/test-utils';
import AnalyticsPage from './AnalyticsPage';

const mocks = vi.hoisted(() => ({
  auth: {
    isAdmin: true,
  },
  api: {
    adminAnalyticsSummary: vi.fn(),
  },
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.auth.isAdmin
      ? {
          id: 1,
          email: 'admin@local.com',
          role: 'admin',
          isSuperAdmin: true,
        }
      : {
          id: 2,
          email: 'user@bsm.com.mx',
          role: 'user',
        },
    token: 'token',
    isAdmin: mocks.auth.isAdmin,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock('../../api/endpoints/adminAnalytics', () => mocks.api);

describe('AnalyticsPage', () => {
  beforeEach(() => {
    mocks.auth.isAdmin = true;
    mocks.api.adminAnalyticsSummary.mockReset();
    mocks.api.adminAnalyticsSummary.mockResolvedValue({
      generatedAt: '2026-03-11T12:00:00.000Z',
      windows: {
        last24h: '2026-03-10T12:00:00.000Z',
        last7d: '2026-03-04T12:00:00.000Z',
        last30d: '2026-02-09T12:00:00.000Z',
      },
      documents: {
        total: 120,
        createdLast7d: 8,
        byStatus: [{ label: 'APPROVED', count: 80 }],
        topAreas: [{ label: 'RC', count: 40 }],
      },
      registrations: {
        byStatus: [{ label: 'APPROVED', count: 10 }],
        approvedLast30d: 6,
        pendingApproval: 2,
      },
      permissionRequests: {
        totalPending: 4,
        byStatus: [{ label: 'PENDING', count: 4 }],
        byType: [{ label: 'PERMISSIONS', count: 3 }],
      },
      audit: {
        totalLast24h: 28,
        accessDeniedLast24h: 2,
        topActionsLast7d: [{ label: 'AUTH_LOGIN_SUCCESS', count: 12 }],
      },
      search: {
        elasticStatus: 'up',
        queue: {
          pendingJobs: 1,
          dueJobs: 0,
          oldestJobAgeMs: 500,
          processing: false,
          workerRunning: true,
        },
        counters: {
          queued: 1,
          indexed: 2,
          indexFailures: 0,
          retries: 0,
          dropped: 0,
          queryElastic: 11,
          queryFallback: 1,
          reindexRuns: 1,
          reindexDocs: 20,
          reindexFailures: 0,
          elasticDownEvents: 0,
        },
      },
    });
  });

  it('muestra acceso denegado si el usuario no es admin', async () => {
    mocks.auth.isAdmin = false;

    renderWithProviders(<AnalyticsPage />);

    expect(await screen.findByText('Acceso denegado')).toBeInTheDocument();
  });

  it('muestra el resumen administrativo cuando la consulta responde', async () => {
    renderWithProviders(<AnalyticsPage />);

    expect(await screen.findByText('Analítica')).toBeInTheDocument();
    expect(await screen.findByText('120')).toBeInTheDocument();
    expect(await screen.findByText('RC')).toBeInTheDocument();
    expect(await screen.findByText('Consultas Elastic')).toBeInTheDocument();
    expect((await screen.findAllByText('Aprobado')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Permisos')).toBeInTheDocument();
    expect(await screen.findByText('Inicio de sesión exitoso')).toBeInTheDocument();
    expect(await screen.findByText('Elastic: activo')).toBeInTheDocument();
  });
});
