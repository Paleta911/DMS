# README_OPERACION_LOCAL

## Objetivo

Este documento resume como operar el proyecto DMS en local, que componentes se necesitan segun el tipo de prueba y como prender, apagar y verificar cada entorno.

## Regla base

- Si solo vas a probar la aplicacion, no necesitas levantar todo.
- Lo minimo util casi siempre es:
  - frontend
  - backend
  - base de datos
- Agrega Elasticsearch si vas a probar busqueda.
- Agrega OCR y worker si vas a probar PDF escaneado con indexacion.
- Agrega Prometheus, Grafana y Loki solo si vas a revisar metricas, dashboards o logs centralizados.

## Arquitectura operativa local

### 1. Frontend

Cuando prendes el frontend, en realidad estas usando estas piezas juntas:

- React
- Vite
- React Router
- React Query
- validacion y formularios del frontend
- componentes de interfaz

No se prenden por separado. Todo eso corre dentro del proceso del frontend.

### 2. Backend

Cuando prendes el backend, en realidad estas usando estas piezas juntas:

- NestJS
- JWT
- Passport
- bcrypt
- TypeORM
- mssql
- class-validator
- class-transformer
- Joi
- Helmet
- Nest Throttler
- Multer
- Swagger / OpenAPI
- pdf-parse
- mammoth
- integracion con OCR
- integracion con Elasticsearch
- metricas Prometheus del backend

JWT no se levanta aparte. Vive dentro del backend.

### 3. Base de datos

La base real del proyecto es:

- SQL Server

No se usa MySQL.
No se usa PostgreSQL.
No se usa MongoDB.
No se usa Redis en el stack actual.

### 4. Busqueda

Para la busqueda se usa:

- Elasticsearch

Opcionalmente puedes levantar:

- Kibana

Kibana no hace que la app funcione. Solo sirve para inspeccion y apoyo tecnico.

### 5. OCR e indexacion

Para OCR se usa:

- Tesseract OCR
- Poppler / pdftoppm

Y para procesar indexacion en segundo plano:

- backend-worker

### 6. Observabilidad

Para metricas, dashboards y logs se usan:

- Prometheus
- Grafana
- Loki
- Promtail

Estas piezas no son obligatorias para usar la aplicacion. Son auxiliares de monitoreo.

## Que prender segun lo que quieres probar

| Lo que quieres probar | Que necesitas | Recomendacion |
|---|---|---|
| Login, navegacion, catalogos, formularios y vistas normales | frontend + backend + SQL Server | suficiente para la mayoria de pruebas funcionales |
| Busqueda documental | frontend + backend + SQL Server + Elasticsearch | necesario para validar busqueda real |
| OCR con PDF escaneado | frontend + backend + SQL Server + Elasticsearch + worker + OCR | necesario para validar extraccion e indexacion |
| Dashboards y metricas | backend + Prometheus + Grafana | solo para observabilidad |
| Logs centralizados | backend + Loki + Promtail | solo para observabilidad |
| Todo el stack | frontend + backend + worker + SQL Server + Elasticsearch + Prometheus + Grafana + Loki + Promtail | util para validacion tecnica completa |

## Modo 1: Desarrollo rapido local

Este modo es el mas simple para trabajar dia a dia.

### Que levanta

- frontend en Vite
- backend NestJS
- SQL Server local existente
- Elasticsearch opcional

### Como prenderlo

#### Backend

```powershell
cd C:\Users\alexi\DMS\backend
npm run dev:prepare
npm run start
```

#### Frontend

```powershell
cd C:\Users\alexi\DMS\frontend
npm run dev -- --host 127.0.0.1
```

#### Elasticsearch y Kibana si vas a probar busqueda

```powershell
cd C:\Users\alexi\DMS\backend
npm run infra:up:search
```

### Como verificar que esta arriba

- frontend: `http://localhost:5173`
- backend: `http://localhost:3000/health`
- elasticsearch: `http://localhost:9200`
- kibana: `http://localhost:5601`

La verificacion minima correcta es:

- abrir `http://localhost:3000/health`
- confirmar que responde algo como `status=ok`

### Como apagarlo

#### Frontend y backend

En cada consola:

```powershell
Ctrl + C
```

#### Elasticsearch y Kibana

```powershell
cd C:\Users\alexi\DMS\backend
npm run infra:down
```

### Como verificar que ya se apago

- `http://localhost:5173` deja de responder
- `http://localhost:3000/health` deja de responder
- `http://localhost:9200` deja de responder
- `http://localhost:5601` deja de responder

## Modo 2: Stack Docker completo

Este modo sirve cuando quieres algo mas estable y cercano a despliegue, con observabilidad incluida.

### Que levanta

- frontend
- backend
- backend-worker
- SQL Server
- Elasticsearch
- Prometheus
- Grafana
- Loki
- Promtail

### Nota importante de puertos

En esta maquina el puerto `8080` esta ocupado por `MTAgentService`, por eso el frontend del stack local se publica en `8085`.

### Como prenderlo

```powershell
cd C:\Users\alexi\DMS

$env:BACKEND_IMAGE='dms-backend-local:latest'
$env:FRONTEND_IMAGE='dms-frontend-local:latest'
$env:FRONTEND_PORT='8085'
$env:DB_PORT_EXTERNAL='11433'
$env:BACKEND_PORT='3000'
$env:ES_PORT_EXTERNAL='9200'
$env:PROMETHEUS_PORT='9090'
$env:LOKI_PORT='3100'
$env:GRAFANA_PORT='3001'

docker compose -p dmslocalfull `
  -f deploy/docker-compose.release.yml `
  -f deploy/docker-compose.production.yml `
  -f deploy/docker-compose.localrun.yml `
  --profile observability up -d
```

### Como verificar que esta arriba

Revisar estas URLs:

- frontend: `http://localhost:8085`
- backend: `http://localhost:3000/health`
- prometheus: `http://localhost:9090`
- grafana: `http://localhost:3001`
- loki: `http://localhost:3100/loki/api/v1/status/buildinfo`
- elasticsearch: `http://localhost:9200`

Tambien puedes verificar con:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Como apagarlo

```powershell
cd C:\Users\alexi\DMS

$env:BACKEND_IMAGE='dms-backend-local:latest'
$env:FRONTEND_IMAGE='dms-frontend-local:latest'
$env:FRONTEND_PORT='8085'
$env:DB_PORT_EXTERNAL='11433'
$env:BACKEND_PORT='3000'
$env:ES_PORT_EXTERNAL='9200'
$env:PROMETHEUS_PORT='9090'
$env:LOKI_PORT='3100'
$env:GRAFANA_PORT='3001'

docker compose -p dmslocalfull `
  -f deploy/docker-compose.release.yml `
  -f deploy/docker-compose.production.yml `
  -f deploy/docker-compose.localrun.yml `
  down
```

### Como verificar que ya se apago

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

No deben aparecer contenedores `dmslocalfull-*`.

Ademas:

- `http://localhost:8085` deja de responder
- `http://localhost:3000/health` deja de responder
- `http://localhost:9090` deja de responder
- `http://localhost:3001` deja de responder

## Que necesitas para cada tipo de prueba

### Si solo vas a probar frontend y backend

Necesitas:

- frontend
- backend
- SQL Server

No necesitas:

- Prometheus
- Grafana
- Loki
- Promtail

### Si vas a probar busqueda

Necesitas:

- frontend
- backend
- SQL Server
- Elasticsearch

### Si vas a probar OCR en serio

Necesitas:

- frontend
- backend
- SQL Server
- Elasticsearch
- OCR activo
- worker de indexacion

### Si vas a revisar dashboards y metricas

Necesitas:

- backend
- Prometheus
- Grafana

### Si vas a revisar logs centralizados

Necesitas:

- backend
- Loki
- Promtail

## Que sigue funcionando al suspender la laptop

En general, suspender la laptop no deberia romper permanentemente el entorno. Pero si puede dejar componentes en estado inconsistente temporal.

Lo que normalmente sobrevive:

- contenedores Docker
- procesos del backend
- procesos del frontend
- base de datos local

Lo que puede requerir verificacion despues de reanudar:

- conexiones a SQL Server
- Elasticsearch
- observabilidad
- sesiones del navegador
- procesos watch / hot reload

## Checklist rapido despues de reanudar

1. abrir `http://localhost:3000/health`
2. abrir el frontend
3. si usas busqueda, abrir `http://localhost:9200`
4. si usas observabilidad, abrir `http://localhost:9090` y `http://localhost:3001`

Si esos pasos responden, no hace falta reiniciar todo.

## Credenciales y notas utiles

### Grafana

- usuario: `admin`
- password: `change_me`

### App DMS

Las credenciales del sistema dependen de la base que estes usando.

En el entorno actual conectado a tu base local historica:

- `admin@local.com`
- password: `Admin123`

## Resumen corto

- Para pruebas normales: frontend + backend + SQL Server.
- Para busqueda: agrega Elasticsearch.
- Para OCR: agrega Elasticsearch + worker + OCR.
- Para metricas: agrega Prometheus + Grafana.
- Para logs: agrega Loki + Promtail.
- No necesitas prender todo cada vez.
