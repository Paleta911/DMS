import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { usersMe } from '../api/endpoints/users';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { SectionCard } from '../components/layout/SectionCard';
import { Spinner } from '../components/ui/Spinner';
import { FadeInSection } from '../components/ui/Motion';
import { translateStatus } from '../utils/labels';
import { queryKeys } from '../app/queryKeys';

const permissionLabels: Record<string, string> = {
  canAccess: 'Acceso al sistema',
  canRead: 'Ver documentos',
  canUpload: 'Subir documentos',
  canUploadNewVersion: 'Subir nueva versión',
  canReview: 'Revisar documentos',
  canApprove: 'Aprobar documentos',
  canDelete: 'Eliminar documentos',
};

export default function ProfilePage() {
  const { user } = useAuth();
  const profileQuery = useQuery({
    queryKey: queryKeys.users.me,
    queryFn: usersMe,
  });

  const profile = profileQuery.data ?? user;
  const tasks = profileQuery.data?.tasks;
  const permissions = profile?.permissions ?? null;

  return (
    <PageContainer>
      <FadeInSection>
        <PageHeader title="Perfil" subtitle="Estado de cuenta y permisos actuales." />
      </FadeInSection>
      {profileQuery.isLoading ? (
        <FadeInSection delay={0.05}>
          <SectionCard className="flex items-center justify-center p-10">
            <Spinner />
          </SectionCard>
        </FadeInSection>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <FadeInSection delay={0.05}>
            <SectionCard>
              <div className="text-sm text-brand-textMuted">Usuario</div>
              <div className="mt-2 text-lg font-semibold text-brand-text">{profile?.email ?? '-'}</div>
              <div className="mt-2 text-sm text-brand-textMuted">
                Estado: <span className="font-semibold text-brand-text">{translateStatus(profile?.status)}</span>
              </div>
              <div className="mt-4 grid gap-1 text-sm text-brand-textMuted">
                <div>Nombre: {profile?.nombre ?? '-'}</div>
                <div>Primer apellido: {profile?.primerApellido ?? '-'}</div>
                <div>Segundo apellido: {profile?.segundoApellido ?? '-'}</div>
                <div>Teléfono: {profile?.telefono ?? '-'}</div>
                <div>Fecha de nacimiento: {profile?.fechaNacimiento ?? '-'}</div>
              </div>
            </SectionCard>
          </FadeInSection>
          <FadeInSection delay={0.08}>
            <SectionCard>
              <div className="text-sm text-brand-textMuted">Tareas pendientes</div>
              <div className="mt-4 grid gap-3 text-sm text-brand-text">
                <div>
                  Tienes{' '}
                  <span className="font-semibold">
                    {tasks?.pendingReview ?? 0}
                  </span>{' '}
                  documentos pendientes por revisar.
                </div>
                <div>
                  Tienes{' '}
                  <span className="font-semibold">
                    {tasks?.pendingApprove ?? 0}
                  </span>{' '}
                  documentos pendientes por aprobar.
                </div>
              </div>
            </SectionCard>
          </FadeInSection>
          <FadeInSection delay={0.1} className="md:col-span-2">
            <SectionCard>
              <div className="text-sm text-brand-textMuted">Permisos</div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {permissions
                  ? Object.entries(permissionLabels).map(([key, label]) => (
                      <div key={key} className="rounded-lg border border-brand-border bg-brand-bg/50 px-3 py-2 text-sm">
                        <div className="font-semibold text-brand-text">{label}</div>
                        <div
                          className={
                            permissions[key as keyof typeof permissions]
                              ? 'text-brand-accent'
                              : 'text-brand-textMuted'
                          }
                        >
                          {permissions[key as keyof typeof permissions] ? 'Activo' : 'No asignado'}
                        </div>
                      </div>
                    ))
                  : null}
              </div>
            </SectionCard>
          </FadeInSection>
        </div>
      )}
    </PageContainer>
  );
}
