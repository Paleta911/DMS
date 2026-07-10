# DMS SIG

DMS SIG es una plataforma web para gestion documental y control operativo. El sistema permite administrar documentos internos y externos, versionarlos, enviarlos a revision, aprobarlos, consultarlos rapidamente y auditar las acciones realizadas dentro del flujo.

El proyecto esta pensado para organizaciones que necesitan trazabilidad, permisos por rol/area, control de versiones y evidencia operativa sobre documentos oficiales.

## Que Hace

- Registro, verificacion y aprobacion de usuarios.
- Control de permisos por usuario, rol y areas asignadas.
- Carga de documentos PDF, DOCX, XLS y XLSX con validaciones de tipo y tamano.
- Clasificacion por categoria, tipo documental, area y codigo interno.
- Versionado de documentos y descarga auditada de archivos.
- Flujo de revision y aprobacion con responsables asignados.
- Busqueda por contenido y metadatos con Elasticsearch y modo fallback.
- Extraccion de texto y soporte OCR para documentos escaneados.
- Bitacora de auditoria para acciones relevantes.
- Paneles administrativos para usuarios, registros, solicitudes, catalogos y analitica.
- Observabilidad con health checks, metricas y stack de monitoreo para despliegue.

## Stack Tecnico

- Backend: NestJS, TypeORM, SQL Server, Elasticsearch.
- Frontend: React, Vite, TypeScript, TanStack Query.
- Infraestructura: Docker Compose, GitHub Actions, Prometheus, Loki y Grafana.
- Testing: Jest, Vitest, Playwright y smoke tests de backend.

## Estructura

```text
DMS/
  backend/      API, base de datos, migraciones, smoke tests y documentacion tecnica
  frontend/     Aplicacion web React/Vite
  deploy/       Compose files y ejemplos de despliegue por ambiente
  .github/      CI, pull request template y reglas de ownership
```

## Seguridad

- No se suben archivos `.env` reales.
- Los archivos `.env.example` solo son plantillas.
- Los secretos reales deben vivir en variables de entorno, GitHub Secrets o el administrador de secretos del servidor.
- Si una credencial real estuvo hardcodeada o commiteada alguna vez, debe revocarse y generarse una nueva.

## Licencia

Este proyecto usa Apache License 2.0. Es una licencia adecuada para colaboracion publica porque permite uso y contribuciones, pero exige conservar avisos de copyright/licencia y el archivo `NOTICE`, ademas de incluir una concesion explicita de patentes.

MIT tambien exige atribucion, pero tiene menos proteccion formal alrededor de patentes y avisos. GPLv3 protege mas fuerte el codigo derivado mediante copyleft, pero puede dificultar adopcion e integraciones. Para este proyecto, Apache-2.0 es el equilibrio mas practico.

## Contribuir

La rama `main` esta protegida.

Regla de propiedad:

- `Paleta911` es el owner/mantenedor principal y puede hacer push directo a `main` cuando lo necesite.
- Los colaboradores no deben hacer push directo a `main`.
- Todo colaborador debe crear su propia rama, abrir Pull Request y esperar aprobacion del owner.
- El archivo `.github/CODEOWNERS` marca a `@Paleta911` como responsable de revision de todo el repositorio.

Flujo recomendado para colaboradores:

```powershell
git switch main
git pull origin main
git switch -c feature/mi-cambio
# hacer cambios
git add .
git commit -m "Describe el cambio"
git push -u origin feature/mi-cambio
```

Reglas de Pull Request:

- El PR debe apuntar a `main`.
- No se aceptan credenciales reales, archivos `.env`, logs locales ni artefactos temporales.
- Los cambios deben mantener actualizada la documentacion cuando afecten instalacion, seguridad, API o despliegue.
- CI debe estar en verde antes de fusionar.

## Documentacion

- [Instalacion local](./INSTALACION.md)
- [Backend](./backend/README.md)
- [Frontend](./frontend/README.md)
- [Deploy](./deploy/README.md)
- [Guia operativa funcional](./GUIA_OPERATIVA_FUNCIONAL.md)
- [Seguridad en produccion](./backend/SECURITY_PRODUCTION.md)
- [Backups de archivos](./backend/FILE_STORAGE_BACKUP.md)
- [Observabilidad](./backend/OBSERVABILITY.md)

## Instalacion

Para instalar y ejecutar el proyecto localmente, sigue la guia completa: [INSTALACION.md](./INSTALACION.md).
