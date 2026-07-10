# Despliegue DMS

## Archivos
- `docker-compose.release.yml`: stack base de despliegue
- `docker-compose.staging.yml`: override de staging
- `docker-compose.production.yml`: override de produccion
- `.env.example`: variables base
- `.env.staging.example`: ejemplo para staging
- `.env.production.example`: ejemplo para produccion
- `observability/`: Prometheus, Loki, Promtail y provisioning de Grafana

## Requisitos
- Docker Engine + Docker Compose
- acceso a GHCR o al registry configurado
- archivo `.env` basado en `.env.example`

La imagen de `backend` ya incluye OCR para PDF escaneado:
- `tesseract-ocr`
- `tesseract-ocr-spa`
- `poppler-utils`

## Arranque manual

```powershell
cd C:\ruta\al\repo\deploy
Copy-Item .env.staging.example .env
docker compose -f docker-compose.release.yml -f docker-compose.staging.yml pull
docker compose -f docker-compose.release.yml -f docker-compose.staging.yml up -d sqlserver elasticsearch
docker compose -f docker-compose.release.yml -f docker-compose.staging.yml run --rm backend npm run db:ensure
docker compose -f docker-compose.release.yml -f docker-compose.staging.yml run --rm backend npm run db:migration:run:prod
docker compose -f docker-compose.release.yml -f docker-compose.staging.yml up -d
```

Para produccion, sustituye `staging` por `production` y usa `.env.production.example`.

## Observabilidad

Para levantar Prometheus, Grafana y Loki:

```powershell
docker compose -f docker-compose.release.yml -f docker-compose.staging.yml --profile observability up -d
```

URLs esperadas:
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3000`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- Loki: `http://localhost:3100`

Grafana queda provisionado con:
- `DMS Backend Overview`
- `DMS Platform Operations`

Prometheus carga reglas de alerta desde `observability/alerts.yml`.

## Volumenes persistentes
- `uploads`
- `backups`
- `backend_logs`
- `sqlserver_data`
- `elasticsearch_data`
- `prometheus_data`
- `loki_data`
- `grafana_data`

## Backups
- Los archivos subidos viven en el volumen `uploads`.
- La ruta de respaldo interna es `/app/runtime/backups`.
- El stack incluye un servicio `backend-worker` separado para procesar la cola persistente de indexacion.
- El mismo contenedor `backend` puede aplicar OCR y permite reprocesar contenido con `npm run documents:reprocess-content`.
- El backend incluye scripts:
  - `npm run storage:backup`
  - `npm run storage:restore -- <ruta-backup>`
  - `npm run storage:verify -- <ruta-backup>`

Respaldo manual dentro del stack release:

```powershell
docker compose -f docker-compose.release.yml -f docker-compose.staging.yml exec backend node scripts/backup-uploads.mjs
docker compose -f docker-compose.release.yml -f docker-compose.staging.yml exec backend node scripts/verify-uploads-backup.mjs /app/runtime/backups/<backup>
```

## Seguridad
- Define `JWT_SECRET` y `JWT_REFRESH_SECRET` distintos y fuertes.
- No subas archivos `.env` reales al repositorio. Usa los `.env*.example` solo como plantilla y guarda los valores reales en el servidor o en GitHub Secrets.
- No uses `CORS_ORIGIN=*` en produccion.
- Define `BOOTSTRAP_TOKEN` y retiralo cuando el bootstrap inicial ya no sea necesario.
- Usa `EMAIL_MODE=smtp` con `SMTP_HOST` y `SMTP_FROM` configurados; `console` solo es valido en desarrollo.
- Mantén `LOG_FORMAT=json` y `LOG_FILE_PATH=/app/runtime/logs/backend.log` para integracion con Promtail/Loki.
- Revisa `FEATURE_FLAGS` por ambiente y desactiva capacidades que no quieras exponer.

## Pipeline de despliegue

El workflow `.github/workflows/deploy.yml`:
- construye backend y frontend
- compila el frontend con `VITE_API_URL`, `VITE_FEATURE_FLAGS` y `VITE_DEFAULT_LOCALE`
- publica imagenes a GHCR
- valida `docker compose config` con el override del ambiente
- levanta infraestructura minima, asegura base y ejecuta migraciones productivas
- opcionalmente despliega por SSH si se invoca con `deploy=true`
- valida salud del backend al finalizar

Secrets esperados para despliegue remoto:
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_SSH_KEY`
- `DEPLOY_ENV_FILE`
- `GHCR_USERNAME`
- `GHCR_TOKEN`
- `FRONTEND_BUILD_API_URL`
- `FRONTEND_BUILD_FEATURE_FLAGS`
- `FRONTEND_BUILD_DEFAULT_LOCALE`
