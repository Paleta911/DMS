import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { PublicPageFrame } from '../components/layout/PublicPageFrame';
import { bsmLogoUrl } from '../utils/brand';
import {
  getFriendlyStatusMessage,
  isTechnicalErrorMessage,
} from '../utils/apiError';

function resolveMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        title: 'Página no disponible',
        message: 'La ruta solicitada no está disponible o ya no puede utilizarse.',
      };
    }
    if (error.status === 401) {
      return {
        title: 'Sesión no válida',
        message: getFriendlyStatusMessage(401),
      };
    }
    if (error.status === 403) {
      return {
        title: 'Acceso denegado',
        message: getFriendlyStatusMessage(403),
      };
    }
    return {
      title: 'No fue posible abrir esta pantalla',
      message: getFriendlyStatusMessage(
        error.status,
        'Ocurrió un problema al cargar la pantalla. Intenta de nuevo.',
      ),
    };
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    if (isTechnicalErrorMessage(error.message)) {
      return {
        title: 'No fue posible abrir esta pantalla',
        message:
          'La pantalla encontró un problema inesperado. Recarga la página o vuelve al inicio.',
      };
    }
    return {
      title: 'Ocurrió un error',
      message: error.message,
    };
  }

  return {
    title: 'No fue posible abrir esta pantalla',
    message: 'La pantalla encontró un problema inesperado. Recarga la página o vuelve al inicio.',
  };
}

export default function RouteErrorPage() {
  const error = useRouteError();
  const content = resolveMessage(error);

  return (
    <PublicPageFrame>
      <div className="w-full max-w-md rounded-xl border border-brand-border bg-brand-surface/90 p-6 text-center shadow-soft sm:p-8">
        <div className="flex flex-col items-center">
          {bsmLogoUrl ? (
            <img src={bsmLogoUrl} alt="BSM" className="h-14 w-14 object-contain" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-primary text-lg font-bold text-white">
              BSM
            </div>
          )}
          <div className="mt-4 font-display text-2xl text-brand-primary">{content.title}</div>
          <p className="mt-3 text-sm leading-6 text-brand-textMuted">{content.message}</p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary2"
          >
            Ir a inicio de sesión
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-brand-border px-4 py-2 text-sm font-semibold text-brand-primary transition hover:bg-brand-bg"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </PublicPageFrame>
  );
}
