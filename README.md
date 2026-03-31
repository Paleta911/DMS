# DMS SIG

Repositorio del sistema DMS SIG con dos aplicaciones:
- `backend/`: API NestJS + SQL Server + Elasticsearch
- `frontend/`: cliente React/Vite

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
