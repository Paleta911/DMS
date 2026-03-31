# Mapa del Codigo Fuente

## Vista general

El repositorio se divide en tres bloques mayores:

- `frontend`
- `backend`
- `deploy`

## `frontend`

### Carpetas importantes

- `src/app`
  - configuracion general, router, query client
- `src/pages`
  - pantallas completas
- `src/components`
  - componentes reutilizables
- `src/hooks`
  - logica compartida
- `src/api`
  - acceso al backend
- `src/theme`
  - modo claro/oscuro
- `src/features`
  - feature flags y capacidades transversales
- `src/i18n`
  - internacionalizacion

### Como leerlo

Si quieres entender una pantalla:

1. ve a `pages`;
2. identifica que hooks usa;
3. revisa que componentes renderiza;
4. sigue la llamada a `api`.

## `backend`

### Carpetas importantes

- `src/auth`
- `src/users`
- `src/documents`
- `src/versions`
- `src/search`
- `src/permissions`
- `src/admin`
- `src/audit-log`
- `src/categories`
- `src/document-types`
- `src/area-codes`
- `src/observability`
- `src/platform`
- `src/migrations`

### Como leerlo

Si quieres entender un flujo backend:

1. ubica el controlador;
2. revisa que servicio invoca;
3. sigue a servicios especializados;
4. identifica entidades involucradas;
5. revisa si impacta auditoria, search o worker.

## `deploy`

Aqui vive la parte operativa:

- compose de release;
- overrides por ambiente;
- stack de observabilidad;
- documentacion de despliegue.

## Ruta sugerida para explorar el codigo

### Para entender autenticacion

- `frontend/src/pages/LoginPage...`
- `frontend/src/auth/...`
- `backend/src/auth/...`
- `backend/src/users/user.entity.ts`

### Para entender documentos

- `frontend/src/pages/DocumentsPage.tsx`
- `frontend/src/pages/DocumentDetailPage.tsx`
- `backend/src/documents/...`
- `backend/src/versions/...`

### Para entender busqueda y OCR

- `frontend/src/pages/DocumentsPage.tsx`
- `backend/src/search/...`
- `backend/src/documents/documents-ocr.service.ts`
- `backend/src/worker.ts`

### Para entender seguridad

- `backend/src/auth/...`
- `backend/src/common/...`
- `backend/src/users/user-admin-policy.service.ts`
- `backend/src/audit-log/...`

## Idea final

El codigo no esta organizado por accidente. La estructura del repositorio refleja los dominios del sistema y ayuda a que la explicacion tecnica tenga coherencia.
