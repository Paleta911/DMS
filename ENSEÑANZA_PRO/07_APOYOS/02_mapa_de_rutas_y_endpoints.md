# Mapa de Rutas y Endpoints

## Rutas principales del frontend

### Publicas

- `/login`
- `/register`
- `/verify-email`

### Privadas operativas

- `/documents`
- `/documents/:id`
- `/profile`
- `/permissions/request`
- `/forbidden`

### Administrativas

- `/admin/categories`
- `/admin/types-areas`
- `/admin/users-areas`
- `/admin/audit-logs`
- `/admin/analytics`
- `/admin/registrations`
- `/admin/permission-requests`
- `/admin/permission-requests/:id`

## Familias principales de endpoints backend

### Auth

- registro
- login
- verify email
- bootstrap admin

### Users

- perfil
- busqueda de usuarios
- asignacion de areas
- tareas pendientes

### Documents

- listar documentos
- obtener detalle
- subir documento
- subir nueva version
- reprocesar contenido

### Versions

- consultar versiones
- descargar version

### Search

- buscar
- revisar estado de indexacion
- reindexar

### Permissions

- solicitar permisos
- solicitar areas
- listar solicitudes propias
- revision administrativa

### Admin

- registros
- aprobaciones/rechazos
- analitica

### Catalogos

- categorias
- tipos de documento
- areas

### Auditoria

- listar eventos
- exportar

### Observabilidad

- `/health`
- `/metrics`
- `/metrics/prometheus`
- `/features`

## Como explicar este mapa

Una explicacion buena es:

"El frontend se organiza en rutas publicas, privadas y administrativas. El backend replica esa separacion por familias de endpoints, de modo que autenticacion, documentos, busqueda, auditoria, administracion y catalogos queden desacoplados pero coordinados."
