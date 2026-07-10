# DMS SIG

[![CI](https://github.com/Paleta911/DMS/actions/workflows/ci.yml/badge.svg)](https://github.com/Paleta911/DMS/actions/workflows/ci.yml)

DMS SIG es una plataforma web para la gestión documental y el control operativo de documentos institucionales. Permite registrar, clasificar, versionar, revisar, aprobar, buscar y auditar documentos dentro de un flujo centralizado.

El objetivo del proyecto es dar trazabilidad sobre documentos oficiales: quién los sube, quién los revisa, qué versión está vigente, qué áreas tienen acceso y qué acciones se realizaron sobre cada documento.

## Funcionalidades

- Gestión de usuarios, registro, verificación y aprobación de cuentas.
- Control de acceso por permisos, roles y áreas asignadas.
- Carga de documentos PDF, DOCX, XLS y XLSX.
- Clasificación por categoría, tipo documental, área y código interno.
- Versionado de documentos con historial consultable.
- Flujo de revisión y aprobación con responsables asignados.
- Búsqueda por contenido y metadatos con Elasticsearch y modo de respaldo.
- Extracción de texto y soporte OCR para documentos escaneados.
- Bitácora de auditoría para acciones relevantes.
- Paneles administrativos para usuarios, solicitudes, catálogos y analítica.
- Comprobaciones de salud, métricas y soporte de observabilidad para despliegue.

## Stack

| Capa | Tecnologías |
| --- | --- |
| Backend | NestJS, TypeORM, SQL Server, Elasticsearch |
| Frontend | React, Vite, TypeScript, TanStack Query |
| Infraestructura | Docker Compose, GitHub Actions, Prometheus, Loki, Grafana |
| Pruebas | Jest, Vitest, Playwright, smoke tests |

## Estructura del Repositorio

```text
DMS/
  backend/      API, base de datos, migraciones, pruebas y documentación técnica
  frontend/     Aplicación web React/Vite
  deploy/       Archivos de despliegue y observabilidad
  .github/      CI, plantilla de PR y reglas de revisión
```

## Primeros Pasos

La guía de instalación local está separada para mantener este README como presentación del proyecto.

- [Instalación local](./INSTALACION.md)
- [Backend](./backend/README.md)
- [Frontend](./frontend/README.md)
- [Despliegue](./deploy/README.md)

## Documentación

- [Guía operativa funcional](./GUIA_OPERATIVA_FUNCIONAL.md)
- [Seguridad en producción](./backend/SECURITY_PRODUCTION.md)
- [Backups de archivos](./backend/FILE_STORAGE_BACKUP.md)
- [Observabilidad](./backend/OBSERVABILITY.md)
- [Contribuir](./CONTRIBUTING.md)

## Seguridad

El repositorio no debe contener credenciales reales ni archivos `.env` locales. Los archivos `.env.example` son plantillas y los secretos reales deben gestionarse mediante variables de entorno, GitHub Secrets o el gestor de secretos del servidor.

Si una credencial real fue expuesta en algún momento, debe revocarse y reemplazarse.

## Contribución

`main` es la rama estable del proyecto. El mantenedor principal puede hacer push directo cuando sea necesario; las contribuciones de terceros deben hacerse desde una rama propia mediante Pull Request.

Consulta las reglas completas en [CONTRIBUTING.md](./CONTRIBUTING.md).

## Licencia

Este proyecto está publicado bajo Apache License 2.0. Consulta [LICENSE](./LICENSE) y [NOTICE](./NOTICE).
