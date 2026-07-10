# DMS SIG

Repositorio del sistema DMS SIG con dos aplicaciones:
- `backend/`: API NestJS + SQL Server + Elasticsearch
- `frontend/`: cliente React/Vite

## Licencia

Este proyecto usa Apache License 2.0. Es la mejor opcion para este caso porque permite colaboracion publica y uso comercial, pero exige conservar avisos de copyright/licencia y el archivo `NOTICE`, ademas de incluir una concesion explicita de patentes.

MIT tambien exige conservar el aviso de copyright, pero ofrece menos proteccion formal alrededor de patentes y avisos de cambios. GPLv3 protege mas fuerte el codigo porque obliga a distribuir derivados bajo la misma licencia, pero puede reducir adopcion e integraciones. Si el objetivo principal es evitar copias sin atribucion sin cerrar demasiado el proyecto, Apache-2.0 es el equilibrio mas practico.

## Estructura

```text
DMS/
  backend/
  frontend/
  .github/workflows/ci.yml
```

## Arranque rapido local

### 1. Backend
```powershell
cd C:\Users\alexi\DMS\backend
Copy-Item .env.example .env
# Edita .env y reemplaza todos los valores REPLACE_WITH_...
npm install
npm run dev:prepare
npm run start:dev
```

### 2. Frontend
En otra terminal:

```powershell
cd C:\Users\alexi\DMS\frontend
Copy-Item .env.example .env
npm install
npm run dev
```

## Seguridad de credenciales

- Nunca subas archivos `.env` reales al repositorio.
- Usa `.env.example` solo como plantilla y reemplaza los placeholders en tu `.env` local.
- En GitHub Actions y despliegues, guarda secretos reales en GitHub Secrets o en el administrador de secretos del servidor.
- Si una credencial real ya fue compartida o commiteada, revocala y genera una nueva; borrar el texto del codigo no invalida el secreto expuesto.

## URLs utiles
- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3000/health`
- Backend metrics: `http://localhost:3000/metrics`
- Swagger dev: `http://localhost:3000/docs`
- Elasticsearch: `http://localhost:9200`
- Kibana: `http://localhost:5601`

## Validacion recomendada

### Backend
```powershell
cd C:\Users\alexi\DMS\backend
npm run build
npm run test -- --runInBand
npm run test:smoke
npm run test:smoke:registration
npm run test:smoke:elastic
```

### Frontend
```powershell
cd C:\Users\alexi\DMS\frontend
npm run build
npm run test
```

### Validacion local fuerte del backend
```powershell
cd C:\Users\alexi\DMS\backend
npm run test:ci:local:strict
```

## Infra Docker

Desde `backend/`:

```powershell
npm run infra:up
```

Esto levanta:
- SQL Server (perfil `db`)
- Elasticsearch
- Kibana

Detener:

```powershell
npm run infra:down
```

## CI

El workflow `.github/workflows/ci.yml`:
- levanta SQL Server y Elasticsearch
- espera readiness con scripts del repo
- corre validacion estricta del backend
- compila y prueba el frontend
- sube artefactos de diagnostico si falla

## Contribuir

La rama `main` debe estar protegida en GitHub. Nadie debe hacer push directo a `main`, ni siquiera mantenedores, salvo una emergencia documentada.

Flujo obligatorio:

1. Actualiza tu copia local desde `main`.
2. Crea una rama propia desde `main`, por ejemplo `feature/nombre-del-cambio`, `fix/nombre-del-bug` o `docs/nombre-del-ajuste`.
3. Haz commits pequeños y descriptivos en tu rama.
4. Ejecuta las pruebas o validaciones aplicables antes de abrir el PR.
5. Sube tu rama y abre un Pull Request hacia `main`.
6. Espera revision y CI en verde antes de fusionar.

Ejemplo:

```powershell
git switch main
git pull origin main
git switch -c feature/mi-cambio
# hacer cambios
git add .
git commit -m "Describe el cambio"
git push -u origin feature/mi-cambio
```

Reglas de PR:
- El PR debe apuntar a `main`.
- No se aceptan PRs con credenciales reales, archivos `.env`, logs locales o artefactos temporales.
- Los cambios deben mantener actualizada la documentacion cuando afecten instalacion, seguridad, API o despliegue.
- La fusion a `main` se hace desde Pull Request aprobado, no por push directo.

## Deploy y multiambiente

La carpeta `deploy/` ya incluye:
- stack base `docker-compose.release.yml`
- overrides por ambiente:
  - `docker-compose.staging.yml`
  - `docker-compose.production.yml`
- ejemplos de variables:
  - `.env.staging.example`
  - `.env.production.example`
- observabilidad con Prometheus, Loki, Promtail y Grafana
- servicio `backend-worker` para indexacion persistente separada

Referencia:
- `deploy/README.md`

## Documentacion por app
- `backend/README.md`
- `frontend/README.md`
- `backend/AUTHORIZATION_AUDIT.md`
- `backend/DB_TUNING.md`
- `backend/DATA_LIFECYCLE.md`
- `frontend/ACCESSIBILITY_AUDIT.md`
- `GUIA_OPERATIVA_FUNCIONAL.md`
- `backend/SECURITY_PRODUCTION.md`
- `backend/FILE_STORAGE_BACKUP.md`
- `backend/OBSERVABILITY.md`
