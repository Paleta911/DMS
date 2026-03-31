# Auditoria final de autorizacion

Este documento resume la matriz efectiva de autorizacion del backend despues de la consolidacion de guards, permisos, alcance por areas y jerarquia admin/super admin.

## Capas de autorizacion

### 1. Autenticacion
- `JwtAuthGuard`: exige token valido.
- `OptionalJwtAuthGuard`: se usa en registro publico para distinguir registro interno/admin sin romper `POST /auth/register`.

### 2. Rol
- `RolesGuard` + `@Roles(...)`: restringen rutas administrativas.
- `SuperAdminGuard`: se usa en aprobacion de registros para asegurar que solo el super admin opere ese flujo.

### 3. Permiso funcional
- `PermissionsGuard` + `@Permissions(...)`:
  - `ACCESS`
  - `READ`
  - `UPLOAD`
  - `UPLOAD_NEW_VERSION`
  - `REVIEW`
  - `APPROVE`
  - `DELETE`

### 4. Alcance por area
- `UserScopeService.assertAreaAccess(...)`
- `UserScopeService.getAllowedAreaCodes(...)`

Estas reglas evitan que un usuario con permiso funcional consulte o descargue informacion fuera de sus areas asignadas.

## Matriz resumida por dominio

| Dominio | Ruta | Control principal |
|---|---|---|
| Auth | `/auth/login` | credenciales + `status=APPROVED` + `ACCESS=true` |
| Auth | `/auth/register` | registro publico con dominio `@bsm.com.mx`; registro interno/admin permitido via JWT opcional |
| Auth | `/auth/verify-email` | validacion de OTP + TTL + limite de intentos |
| Usuarios | `/users/me` | `JwtAuthGuard` |
| Usuarios | `/users/search`, `/users/:id`, `/users/:id/areas` | `JwtAuthGuard` + `RolesGuard` + `role=admin` |
| Documentos | `/documents/*` | `JwtAuthGuard` + `PermissionsGuard`; admin en acciones de asignacion |
| Versiones | `/versions/:documentId`, `/versions/:id/download` | `READ` + alcance por area validado antes de responder |
| Busqueda | `/search` | `READ` + alcance por area si se filtra por area |
| Busqueda admin | `/search/reindex`, `/search/index-status` | `role=admin` |
| Catalogos lectura | `/categories`, `/document-types`, `/area-codes` | `JwtAuthGuard` |
| Catalogos mutacion | `POST/PATCH/DELETE` | `JwtAuthGuard` + `RolesGuard` + `role=admin` |
| Registros admin | `/admin/registrations/*` | `JwtAuthGuard` + `RolesGuard` + `SuperAdminGuard` |
| Solicitudes propias | `/permission-requests`, `/permission-requests/areas`, `/permission-requests/mine` | `JwtAuthGuard` |
| Solicitudes admin | `/admin/permission-requests/*` | `JwtAuthGuard` + `RolesGuard` + `role=admin` |
| Auditoria | `/audit-logs`, `/audit-logs/export.csv` | `JwtAuthGuard` + `RolesGuard` + `role=admin` |

## Cierres relevantes de la auditoria

### 1. Versiones y descargas ahora respetan area
Se reforzo el flujo de `GET /versions/:documentId` para que valide explicitamente el area del documento antes de listar versiones.

### 2. Search no puede “saltar” el alcance
`GET /search` obtiene `allowedAreaCodes` desde `UserScopeService` y solo permite resultados dentro del alcance del usuario. Si el usuario fuerza `areaCode`, se vuelve a validar acceso.

### 3. Registro/aprobacion administrativa queda separado
El flujo de aprobacion/rechazo de registros usa `SuperAdminGuard`. Esto evita que un admin normal apruebe o fuerce verificaciones de registros.

### 4. Jerarquia admin centralizada
`UserAdminPolicyService` concentra reglas de:
- promocion a admin
- restriccion sobre super admin
- bloqueo de autosolicitudes para cuentas privilegiadas

## Evidencia automatizada

Se agregaron pruebas de metadata/guardias en:
- `backend/src/documents/documents.controller.spec.ts`
- `backend/src/versions/versions.controller.spec.ts`
- `backend/src/admin/registrations.controller.spec.ts`
- `backend/src/permissions/admin-permission-requests.controller.spec.ts`
- `backend/src/search/search.controller.spec.ts`
- `backend/src/users/users.controller.spec.ts`

Estas pruebas verifican permisos, roles y guardias declarados en controladores criticos.
