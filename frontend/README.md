# DMS Frontend

Frontend React/Vite del sistema DMS SIG.

## Stack
- React
- Vite
- TypeScript
- Tailwind
- React Query
- React Router

## Configuración

En PowerShell:

```powershell
cd C:\Users\alexi\DMS\frontend
Copy-Item .env.example .env
```

Variable principal:
- `VITE_API_URL=http://localhost:3000`
- `VITE_FEATURE_FLAGS=admin-analytics,notifications,saved-views,advanced-exports,dark-mode,i18n`
- `VITE_DEFAULT_LOCALE=es`

## Desarrollo

```powershell
cd C:\Users\alexi\DMS\frontend
npm install
npm run dev
```

Aplicación:
- `http://localhost:5173`

## Validación

```powershell
npm run build
npm run test
```

## Dependencias operativas
- Backend arriba en `VITE_API_URL`
- Si quieres salud visual real, el backend debe responder `/health`

## Tema visual
- La app incluye selector entre `modo claro` y `modo oscuro`.
- El tema se guarda en `localStorage` con la clave `dms-theme`.
- No existe modo `seguir al sistema`; el cambio es manual desde el boton de accesibilidad.

## Feature flags e i18n
- `VITE_FEATURE_FLAGS` permite activar o desactivar bloques opcionales del frontend.
- Flags soportadas:
  - `admin-analytics`
  - `notifications`
  - `saved-views`
  - `advanced-exports`
  - `dark-mode`
  - `i18n`
- `VITE_DEFAULT_LOCALE` define el idioma inicial (`es` o `en`).
- La preferencia de idioma se guarda en `localStorage` con la clave `dms-locale`.

## Accesibilidad
- Existe una auditoria resumida en `ACCESSIBILITY_AUDIT.md`.
- La app incluye:
  - `skip link`
  - foco visible global
  - modales con trampa de foco
  - tablas responsivas con `caption`
  - soporte de modo oscuro persistente

## Troubleshooting

### La app abre pero no carga datos
- Verifica `VITE_API_URL`.
- Revisa que el backend responda `http://localhost:3000/health`.

### Redirección a `/forbidden`
- El backend esta devolviendo `403`.
- Revisa permisos, rol, estado del usuario y areas asignadas.

### Login o registro fallan sin detalle claro
- Revisa la respuesta del backend en DevTools.
- Valida que el backend este usando la misma base y `.env` correctos.
