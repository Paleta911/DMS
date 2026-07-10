# INSTALACION

Guia para levantar DMS SIG en entorno local.

## Requisitos

- Git
- Node.js 22+
- npm 10+
- Docker Desktop
- PowerShell en Windows

Opcional para OCR:

- Tesseract
- Poppler (`pdftoppm`)

## 1. Clonar el Repositorio

```powershell
git clone https://github.com/Paleta911/DMS.git
cd DMS
```

Si ya tienes el repo local:

```powershell
git switch main
git pull origin main
```

## 2. Configurar Variables de Entorno

Backend:

```powershell
cd backend
Copy-Item .env.example .env
```

Edita `backend/.env` y reemplaza todos los valores `REPLACE_WITH_...` por valores locales seguros.

Frontend:

```powershell
cd ..\frontend
Copy-Item .env.example .env
```

No subas archivos `.env` reales al repositorio.

## 3. Levantar Backend

Desde `backend/`:

```powershell
npm install
npm run infra:up
npm run dev:prepare
npm run start:dev
```

Esto levanta o prepara:

- SQL Server
- Elasticsearch
- Base de datos `DMS`
- Migraciones
- API NestJS

URLs utiles:

- Health: `http://localhost:3000/health`
- Swagger: `http://localhost:3000/docs`
- Metrics: `http://localhost:3000/metrics`
- Elasticsearch: `http://localhost:9200`
- Kibana: `http://localhost:5601`

## 4. Levantar Frontend

En otra terminal:

```powershell
cd frontend
npm install
npm run dev
```

URL:

- Frontend: `http://localhost:5173`

## 5. Validar el Proyecto

Backend:

```powershell
cd backend
npm run build
npm run test -- --runInBand
npm run test:ci:local:strict
```

Frontend:

```powershell
cd frontend
npm run build
npm run test
```

## 6. Apagar Infraestructura Local

Desde `backend/`:

```powershell
npm run infra:down
```

## 7. Deploy

La configuracion de despliegue vive en `deploy/`.

Documentacion:

- [deploy/README.md](./deploy/README.md)

Archivos principales:

- `deploy/docker-compose.release.yml`
- `deploy/docker-compose.staging.yml`
- `deploy/docker-compose.production.yml`
- `deploy/.env.staging.example`
- `deploy/.env.production.example`

## Problemas Comunes

Si SQL Server no responde:

```powershell
cd backend
npm run infra:up:db
npm run infra:wait:db
npm run db:ensure
npm run db:migration:run
```

Si Elasticsearch no responde:

```powershell
cd backend
npm run infra:up:search
npm run infra:wait:search
```

Si falla autenticacion o bootstrap:

- Revisa `JWT_SECRET`, `JWT_REFRESH_SECRET` y `BOOTSTRAP_TOKEN`.
- Verifica que el `.env` local exista y no tenga placeholders.
- No reutilices credenciales que hayan sido publicadas.
