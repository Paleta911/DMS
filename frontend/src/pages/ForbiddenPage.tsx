import { useEffect } from 'react';
import { AccessDenied } from '../components/AccessDenied';
import { clearForbidden, getForbidden } from '../auth/storage';

export default function ForbiddenPage() {
  useEffect(() => {
    return () => {
      clearForbidden();
    };
  }, []);

  const info = getForbidden();

  return (
    <div className="flex flex-col gap-3">
      <AccessDenied />
      {info?.path ? (
        <p className="text-xs text-brand-textMuted">
          Bloqueado al acceder a: {info.path}
        </p>
      ) : null}
    </div>
  );
}
