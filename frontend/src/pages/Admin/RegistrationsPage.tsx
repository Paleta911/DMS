import { useAuth } from '../../auth/AuthContext';
import { AccessDenied } from '../../components/AccessDenied';
import { PageContainer } from '../../components/layout/PageContainer';
import UsersPage from './UsersPage';

export default function RegistrationsPage() {
  const { user, isAdmin } = useAuth();

  if (!isAdmin || !user?.isSuperAdmin) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  return <UsersPage />;
}
