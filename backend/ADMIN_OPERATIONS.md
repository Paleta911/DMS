# Operación administrativa

Guía corta para operación diaria del backend DMS desde el punto de vista de `admin` y `super admin`.

## Roles

### Super admin
- Puede aprobar o rechazar registros públicos.
- Puede forzar verificación de correo.
- Puede crear otros admins si usa el flujo autorizado.
- Puede aprobar o rechazar solicitudes de permisos y áreas.
- Puede editar catálogos, áreas de usuarios y revisar auditoría.

### Admin normal
- Puede gestionar catálogos, áreas de usuario, solicitudes y auditoría.
- No puede promover usuarios a admin.
- No debe poder modificar o degradar a un `super admin`.
- No usa los flujos de autosolicitud de permisos o áreas.

## Registro público y aprobación

### 1. Registro
- Endpoint: `POST /auth/register`
- Resultado esperado:
  - usuario en `PENDING_VERIFICATION`
  - código OTP guardado hasheado
  - envío en modo `console` o `smtp`

### 2. Verificación de correo
- Endpoint: `POST /auth/verify-email`
- Resultado esperado:
  - usuario pasa a `PENDING_APPROVAL`
  - `verifiedAt` queda registrado

### 3. Revisión administrativa
- Endpoint principal: `GET /admin/registrations`
- Acciones:
  - `POST /admin/registrations/:id/approve`
  - `POST /admin/registrations/:id/reject`
  - `POST /admin/registrations/:id/resend-code`
  - `POST /admin/registrations/:id/force-verify`

### 4. Resultado al aprobar
- Estado `APPROVED`
- Permisos iniciales:
  - `ACCESS=true`
  - `READ=true`
  - resto en `false`

## Solicitudes de permisos y áreas

### Usuario final
- `POST /permission-requests`
- `POST /permission-requests/areas`
- `GET /permission-requests/mine`

### Admin / super admin
- `GET /admin/permission-requests`
- `GET /admin/permission-requests/:id`
- `POST /admin/permission-requests/:id/approve`
- `POST /admin/permission-requests/:id/approve-partial`
- `POST /admin/permission-requests/:id/reject`

### Criterio operativo
- Aprobar completo cuando el usuario puede recibir todos los permisos/áreas solicitados.
- Aprobar parcial cuando solo una parte procede.
- Rechazar cuando la solicitud no aplica; el comentario de rechazo debe explicar el motivo.

## Áreas por usuario

### Consulta y edición
- Buscar usuario en `/users/search`
- Ver detalle en `GET /users/:id`
- Guardar áreas en `PATCH /users/:id/areas`

### Regla práctica
- Si un usuario tiene `READ` pero no tiene áreas asignadas, puede autenticarse pero no verá documentos útiles.
- La UI debe orientar con el mensaje: `No tienes áreas asignadas, solicita asignación al administrador`.

## Catálogos

### Categorías
- `GET /categories`
- `POST /categories`
- `PATCH /categories/:id`
- `DELETE /categories/:id`

### Tipos de documento
- `GET /document-types`
- `POST /document-types`
- `PATCH /document-types/:id`
- `DELETE /document-types/:id`

### Áreas
- `GET /area-codes`
- `POST /area-codes`
- `PATCH /area-codes/:id`
- `DELETE /area-codes/:id`

## Auditoría

### Consulta
- `GET /audit-logs`
- `GET /audit-logs/export.csv`

### Qué revisar
- accesos denegados
- aprobaciones y rechazos
- creación o eliminación de catálogos
- cambios de áreas por usuario
- búsquedas y operaciones relevantes de documentos

## Búsqueda y estado de indexación

### Endpoints
- `GET /search`
- `POST /search/reindex`
- `GET /search/index-status`

### Señales útiles
- `engine=elastic` indica búsqueda real por Elasticsearch
- `engine=fallback` indica respaldo SQL
- `pendingIndexJobs` y `failedIndexJobs` ayudan a diagnosticar indexación atrasada o fallida

## Checklist operativo rápido

### Alta de usuario público
1. Confirmar registro en `/admin/registrations`
2. Confirmar verificación de correo
3. Aprobar usuario
4. Verificar permisos base `ACCESS` y `READ`
5. Confirmar login exitoso

### Solicitud de permisos/áreas
1. Revisar detalle de la solicitud
2. Aprobar, aprobar parcial o rechazar
3. Confirmar efecto en perfil del usuario
4. Revisar auditoría si hubo cambios críticos

### Diagnóstico rápido
1. `GET /health`
2. `GET /metrics`
3. `GET /search/index-status`
4. `GET /audit-logs`
