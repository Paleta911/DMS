# Estrategia de borrado, archivo e inactivacion

El sistema adopta una politica conservadora: preservar trazabilidad historica y evitar borrado fisico en entidades de negocio o gobierno.

## Principio general

- **No se elimina historico critico**.
- **Se inactiva** cuando el catalogo deja de estar disponible para operaciones nuevas.
- **Se nulifican relaciones operativas** cuando una referencia deja de ser valida.

## Politica por entidad

| Entidad | Estrategia | Motivo |
|---|---|---|
| `category` | inactivacion (`activo=false`) | preservar referencia historica sin ofrecerla en operaciones nuevas |
| `document_type` | inactivacion (`activo=false`) | evitar romper historial documental |
| `area_code` | inactivacion (`activo=false`) | mantener trazabilidad y retirar el area del uso operativo |
| `document` | no se borra en flujo normal; cambia de estado (`DRAFT`, `IN_REVIEW`, `APPROVED`, `OBSOLETE`, etc.) | el documento es parte del historial del SIG |
| `version` | historico inmutable | cada version es evidencia |
| `document_approval` | historico inmutable | evidencia de workflow |
| `audit_log` | historico inmutable | trazabilidad legal/operativa |
| `permission_request` | historico inmutable | evidencia de solicitudes y decisiones |
| `email_verification` | historico operativo con expiracion logica | soporte al flujo de registro/verificacion |
| `user` | cambio de `status`, no borrado operativo | preservar relaciones, auditoria y documentos |

## Efectos cuando se inactiva un catalogo

### Categoria
- los documentos relacionados pasan a `category = null`
- la categoria deja de salir en listados activos

### Tipo de documento
- los documentos relacionados pasan a `documentType = null`
- el tipo deja de salir en listados activos

### Area
- los documentos relacionados pasan a `areaCode = null`
- se limpian asignaciones en `user_area_codes`
- el area deja de estar disponible para nuevas asignaciones o solicitudes

## Reglas de UI y API

- las pantallas administrativas operan con filtros `activo/inactivo/todos`
- las operaciones de “eliminar” en catalogos se implementan como **desactivar**
- la reactivacion se soporta via `PATCH` o al recrear un catalogo previamente inactivo

## Beneficio

Esta estrategia evita:
- perdida de trazabilidad
- ruptura de auditoria historica
- referencias huerfanas en documentos y flujos
- confusiones sobre por que un catalogo “desaparecio”
