import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { Spinner } from '../components/ui/Spinner';

const ProtectedRoute = lazy(() =>
  import('../auth/ProtectedRoute').then((module) => ({
    default: module.ProtectedRoute,
  })),
);
const AppShell = lazy(() =>
  import('../components/AppShell').then((module) => ({
    default: module.AppShell,
  })),
);
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('../pages/VerifyEmailPage'));
const DocumentsPage = lazy(() => import('../pages/DocumentsPage'));
const DocumentDetailPage = lazy(() => import('../pages/DocumentDetailPage'));
const CategoriesPage = lazy(() => import('../pages/Admin/CategoriesPage'));
const UsersAreasPage = lazy(() => import('../pages/Admin/UsersAreasPage'));
const AuditLogsPage = lazy(() => import('../pages/Admin/AuditLogsPage'));
const AnalyticsPage = lazy(() => import('../pages/Admin/AnalyticsPage'));
const TypesAreasPage = lazy(() => import('../pages/Admin/TypesAreasPage'));
const ForbiddenPage = lazy(() => import('../pages/ForbiddenPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const PermissionRequestPage = lazy(() => import('../pages/PermissionRequestPage'));
const RegistrationsPage = lazy(() => import('../pages/Admin/RegistrationsPage'));
const PermissionRequestsPage = lazy(() => import('../pages/Admin/PermissionRequestsPage'));
const PermissionRequestDetailPage = lazy(
  () => import('../pages/Admin/PermissionRequestDetailPage'),
);

function withSuspense(element: ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[35vh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
  },
  {
    path: '/register',
    element: withSuspense(<RegisterPage />),
  },
  {
    path: '/verify-email',
    element: withSuspense(<VerifyEmailPage />),
  },
  {
    element: withSuspense(<ProtectedRoute />),
    children: [
      {
        element: withSuspense(<AppShell />),
        children: [
          { path: '/', element: withSuspense(<DocumentsPage />) },
          { path: '/documents', element: withSuspense(<DocumentsPage />) },
          { path: '/documents/:id', element: withSuspense(<DocumentDetailPage />) },
          { path: '/search', element: <Navigate to="/documents" replace /> },
          { path: '/profile', element: withSuspense(<ProfilePage />) },
          { path: '/permissions/request', element: withSuspense(<PermissionRequestPage />) },
          { path: '/forbidden', element: withSuspense(<ForbiddenPage />) },
          { path: '/admin/categories', element: withSuspense(<CategoriesPage />) },
          { path: '/admin/types-areas', element: withSuspense(<TypesAreasPage />) },
          { path: '/admin/users-areas', element: withSuspense(<UsersAreasPage />) },
          { path: '/admin/audit-logs', element: withSuspense(<AuditLogsPage />) },
          { path: '/admin/analytics', element: withSuspense(<AnalyticsPage />) },
          { path: '/admin/registrations', element: withSuspense(<RegistrationsPage />) },
          {
            path: '/admin/permission-requests',
            element: withSuspense(<PermissionRequestsPage />),
          },
          {
            path: '/admin/permission-requests/:id',
            element: withSuspense(<PermissionRequestDetailPage />),
          },
        ],
      },
    ],
  },
]);
