# DMS Backend

Backend NestJS del sistema DMS SIG. Usa SQL Server para persistencia transaccional, Elasticsearch para busqueda optimizada y JWT para autenticacion.

## Stack
- NestJS
- TypeORM
- SQL Server
- Elasticsearch
- JWT
- Nodemailer (`EMAIL_MODE=console|smtp`)

## Requisitos
- Node.js 18+
- npm 10+
- SQL Server disponible en `DB_HOST:DB_PORT`
- Elasticsearch opcional para smoke estricto y busqueda real

## Configuracion rapida

En PowerShell:

```powershell
cd C:\Users\alexi\DMS\backend
Copy-Item .env.example .env
```

Variables criticas:
- `APP_RUNTIME_ROLE`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`
- `ES_NODE`, `SEARCH_MODE`
- `FEATURE_FLAGS`
- `EMAIL_MODE`
- `BOOTSTRAP_TOKEN`
- `MAX_FILE_SIZE_MB`, `UPLOAD_ORIGINAL_NAME_MAX_LENGTH`
- `ALLOWED_EXTENSIONS`, `ALLOWED_MIME_TYPES`
- `BACKUP_DIR`, `LOG_FILE_PATH`
- `AUTH_LOGIN_BLOCK_AFTER`, `AUTH_LOGIN_BLOCK_SEC`, `AUTH_LOGIN_RESET_WINDOW_SEC`
- `AUTH_REFRESH_LIMIT`, `AUTH_REFRESH_TTL_SEC`
- `CSP_ENABLED`, `CSP_*`

Notas:
- `DB_SYNC=false` por defecto. El esquema se mueve por migraciones.
- `EMAIL_MODE=console` es el modo recomendado en desarrollo.
- En produccion, `EMAIL_MODE` debe ser `smtp` y requiere `SMTP_HOST` + `SMTP_FROM`.
- `SEARCH_MODE=auto` usa fallback si Elasticsearch no esta listo.
- `APP_RUNTIME_ROLE=both` sirve para desarrollo; en despliegue se recomienda `web` para la API y `worker` para el proceso de indexacion.
- `FEATURE_FLAGS` controla capacidades opcionales como analitica admin, notificaciones, vistas guardadas, exportaciones avanzadas, modo oscuro e i18n.

## Arranque local recomendado

### Opcion A: SQL local ya instalado
```powershell
cd C:\Users\alexi\DMS\backend
npm install
npm run dev:prepare
npm run start:dev
```

### Opcion B: Infra por Docker
```powershell
cd C:\Users\alexi\DMS\backend
npm install
npm run infra:up
npm run dev:prepare
npm run start:dev
```

`npm run dev:prepare` hace esto:
- espera SQL listo con login real
- crea la base `DMS` si no existe
- corre migraciones
- verifica dependencias

## Comandos operativos

### Dependencias / readiness
```powershell
npm run check:deps
npm run infra:wait:db
npm run infra:wait:search
```

### Base de datos
```powershell
npm run db:ensure
npm run db:migration:run
npm run db:migration:revert
npm run db:seed
```

### Infra Docker
```powershell
npm run infra:up
npm run infra:up:db
npm run infra:up:search
npm run infra:down
```

### Desarrollo
```powershell
npm run start
npm run start:dev
npm run build
```

### Worker de indexacion
```powershell
npm run start:worker
npm run start:worker:prod
```

Usa `APP_RUNTIME_ROLE=worker` para ejecutar solo la cola persistente de indexacion y `APP_RUNTIME_ROLE=web` para la API principal.

### Contrato OpenAPI
```powershell
npm run docs:openapi:export -- .\tmp\openapi.local.json
npm run docs:openapi:check
npm run docs:openapi:update
```

### Salud y metricas
- `GET http://localhost:3000/health`
- `GET http://localhost:3000/metrics`
- `GET http://localhost:3000/metrics/prometheus`
- `GET http://localhost:3000/docs` (solo desarrollo)

### Respaldo de archivos
```powershell
npm run storage:backup
npm run storage:verify -- .\backups\uploads-AAAA-MM-DDTHH-mm-ss-sssZ
npm run storage:restore -- .\backups\uploads-AAAA-MM-DDTHH-mm-ss-sssZ
```

### OCR para PDF escaneado
El backend intenta extraer texto de esta forma:

1. PDF con texto nativo: `pdf-parse`
2. DOCX: `mammoth`
3. PDF escaneado sin texto util: `pdftoppm + tesseract`

Variables relevantes:

```powershell
OCR_ENABLED=true
OCR_TESSERACT_BIN=tesseract
OCR_PDFTOPPM_BIN=pdftoppm
OCR_LANGS=spa+eng
OCR_DPI=300
OCR_MAX_PAGES=10
OCR_TIMEOUT_MS=120000
```

En Windows local necesitas tener instalados:
- `Tesseract OCR`
- `Poppler` (`pdftoppm`)

Si faltan dependencias, la carga del archivo sigue funcionando, pero el PDF escaneado no quedara indexable por contenido. La imagen Docker de produccion ya incluye OCR.

Para reprocesar documentos ya cargados despues de habilitar OCR:

```powershell
npm run documents:reprocess-content
npm run documents:reprocess-content -- --document-id 123
npm run documents:reprocess-content -- --force
```

### E2E con navegador real
```powershell
npm run e2e:install
npm run test:e2e:browser
```

## Contrato de errores

Los endpoints HTTP devuelven un formato uniforme cuando ocurre un error:

```json
{
  "statusCode": 400,
  "error": "Solicitud inválida",
  "message": "email debe ser un correo válido, password debe tener al menos 6 caracteres",
  "errors": [
    "email debe ser un correo válido",
    "password debe tener al menos 6 caracteres"
  ],
  "code": "VALIDATION_ERROR",
  "path": "/auth/register",
  "requestId": "8b5c...",
  "timestamp": "2026-03-08T18:00:00.000Z"
}
```

Notas:
- `message` siempre queda normalizado en español.
- `errors` solo aparece cuando hay detalle adicional, por ejemplo validación.
- `requestId` coincide con el header `x-request-id`.

## Validacion

### Unit tests
```powershell
npm run test -- --runInBand
```

### Smoke base
```powershell
npm run test:smoke
```

### Smoke de registro
```powershell
npm run test:smoke:registration
```

### Smoke de Elastic
```powershell
npm run test:smoke:elastic
```

### Smoke de OCR
Requiere backend corriendo con OCR habilitado.

```powershell
npm run test:smoke:ocr
```

Si `tesseract` o `pdftoppm` no estan disponibles en la maquina local, `test:ci:local`
omite esta verificacion automaticamente. Para volverla obligatoria:

```powershell
$env:CI_LOCAL_STRICT_OCR='true'; npm run test:ci:local:strict
```

### Validacion local completa
```powershell
npm run test:ci:local
```

### Validacion local estricta
```powershell
npm run test:ci:local:strict
```

La version estricta exige:
- SQL Server listo
- Elasticsearch listo
- migraciones aplicadas
- smoke normal
- smoke de registro
- smoke de Elastic

## Endpoints principales

### Auth
- `POST /auth/bootstrap`
- `POST /auth/bootstrap-admin`
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/verify-email`

### Usuarios
- `GET /users/me`
- `GET /users/search`
- `GET /users/:id`
- `PATCH /users/:id/areas`

### Catalogos
- `GET /categories`
- `POST /categories`
- `PATCH /categories/:id`
- `DELETE /categories/:id`
- `GET /document-types`
- `POST /document-types`
- `PATCH /document-types/:id`
- `DELETE /document-types/:id`
- `GET /area-codes`
- `POST /area-codes`
- `PATCH /area-codes/:id`
- `DELETE /area-codes/:id`

### Documentos y workflow
- `POST /documents/upload`
- `POST /documents/reprocess-content`
- `GET /documents`
- `GET /documents/:id`
- `PATCH /documents/:id`
- `GET /documents/:id/versions`
- `GET /documents/:id/workflow`
- `PATCH /documents/:id/assign-reviewers`
- `POST /documents/:id/submit-review`
- `POST /documents/:id/review`
- `POST /documents/:id/approve`
- `POST /documents/:id/obsolete`
- `GET /versions/:id/download`

### Busqueda
- `GET /search`
- `POST /search/reindex`
- `GET /search/index-status`
  - expone `engine`, `docsCount`, `pendingIndexJobs`, `failedIndexJobs` y estado de la cola de indexacion

### Plataforma / feature flags
- `GET /features`

### Analitica administrativa
- `GET /admin/analytics/summary`

### Registros / permisos
- `GET /admin/registrations`
- `POST /admin/registrations/:id/approve`
- `POST /admin/registrations/:id/reject`
- `POST /admin/registrations/:id/resend-code`
- `POST /admin/registrations/:id/force-verify`
- `POST /permission-requests`
- `POST /permission-requests/areas`
- `GET /permission-requests/mine`
- `GET /admin/permission-requests`
- `GET /admin/permission-requests/:id`
- `POST /admin/permission-requests/:id/approve`
- `POST /admin/permission-requests/:id/approve-partial`
- `POST /admin/permission-requests/:id/reject`

### Auditoria
- `GET /audit-logs`
- `GET /audit-logs/export.csv`

## Observabilidad

`GET /metrics` expone:
- conteos HTTP globales
- rutas mas usadas
- rutas mas lentas
- errores por ruta
- uso de memoria/runtime del backend
- estado de Elasticsearch
- cola de indexacion asincrona
- retries y drops de indexacion
- queries `elastic` vs `fallback`

`GET /metrics/prometheus` expone las metricas en formato Prometheus para scraping externo.
Incluye estado de Elastic, cola persistente, reintentos de indexacion, volumen de reindex, worker activo y consultas por motor.

## CI

El workflow en `.github/workflows/ci.yml`:
- levanta `sqlserver` y `elasticsearch`
- espera readiness con scripts del repo
- ejecuta `npm run test:ci:local:strict`
- compila frontend
- corre tests del frontend
- guarda OpenAPI y logs de Docker si falla

## Guia operativa admin

- `ADMIN_OPERATIONS.md` resume flujos de:
  - super admin vs admin normal
  - aprobacion de registros
  - solicitudes de permisos y areas
  - catalogos
  - auditoria
  - estado de indexacion
- `AUTHORIZATION_AUDIT.md` documenta la matriz final de guards, roles, permisos y alcance por area.
- `DB_TUNING.md` resume indices, consultas calientes y el uso de `npm run db:analyze`.
- `DATA_LIFECYCLE.md` define la estrategia de inactivacion, archivo y preservacion historica.
- `OBSERVABILITY.md` resume el stack externo con Prometheus, Loki y Grafana.
- `OBSERVABILITY.md` incluye alerts y dashboards de operaciones/plataforma.
- `FILE_STORAGE_BACKUP.md` describe el ciclo de respaldo y restauracion de archivos.
- `SECURITY_PRODUCTION.md` resume el hardening final para produccion.

## Troubleshooting

### `Failed to connect to localhost:1433`
1. Corre `npm run check:deps`.
2. Si usas SQL local, valida que el servicio este arriba.
3. Si usas Docker, corre `npm run infra:up:db`.
4. Espera readiness real con `npm run infra:wait:db`.
5. Si la base no existe, corre `npm run db:ensure`.

### `/health` responde `es=down`
- Verifica `ES_NODE`.
- Si usas Docker: `npm run infra:up:search`.
- Espera readiness con `npm run infra:wait:search`.
- Si quieres busqueda real, ejecuta `npm run test:smoke:elastic`.

### `JWT_SECRET` invalido o faltante
- Define `JWT_SECRET` explicito en `.env`.
- En produccion no se permite fallback inseguro.

### Registro de correo en desarrollo
- Usa `EMAIL_MODE=console`.
- El OTP no se expone por API; se registra en logs y en tabla de verificacion.

### Smoke falla al arrancar server
- Revisa `npm run check:deps`.
- Revisa conflicto de puerto 3000.
- Los scripts smoke ya imprimen ultimos logs del child process al fallar.

## Archivos relevantes
- `.env.example`
- `docker-compose.yml`
- `scripts/`
- `src/migrations/`
- `postman_examples.md`
