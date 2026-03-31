# Guia operativa funcional

Guia breve para operar el sistema sin entrar en detalles tecnicos.

## 1. Tipos de usuario

### Usuario
Puede:
- iniciar sesion
- consultar documentos segun permisos y areas
- solicitar permisos
- solicitar areas
- revisar su perfil y tareas pendientes

### Admin
Puede:
- gestionar catalogos
- asignar areas a usuarios
- revisar solicitudes de permisos y areas
- consultar auditoria

### Super admin
Hace todo lo del admin y ademas:
- aprueba o rechaza registros nuevos
- fuerza verificacion si hace falta
- administra el flujo de alta final

## 2. Flujo de registro

1. El usuario entra a `/register`
2. captura datos y correo `@bsm.com.mx`
3. recibe codigo de verificacion
4. valida el codigo en `/verify-email`
5. queda pendiente de aprobacion
6. el super admin revisa el registro y aprueba o rechaza
7. al aprobar, el usuario obtiene por defecto:
   - acceso al sistema
   - permiso de lectura

## 3. Flujo documental

### Subir documento nuevo
1. ir a `Documentos`
2. elegir archivo
3. capturar nombre, area y tipo
4. guardar

### Subir nueva version
1. abrir el detalle del documento
2. seleccionar `Subir nueva version`
3. adjuntar archivo y comentario
4. guardar

### Enviar a revision
1. abrir detalle del documento
2. asignar revision/aprobacion si corresponde
3. usar `Enviar a revision`

### Revisar o aprobar
1. entrar al detalle del documento
2. usar el boton de decision disponible
3. registrar comentario si aplica

## 4. Solicitud de permisos

Ruta: `/permissions/request`

El usuario puede:
- ver permisos actuales
- solicitar permisos faltantes
- solicitar areas faltantes
- consultar historial de solicitudes

Notas:
- un permiso ya activo no se puede volver a solicitar
- un area ya pendiente no se puede volver a pedir mientras siga pendiente

## 5. Administracion diaria

### Registros
Ruta: `/admin/registrations`

Permite:
- ver registros por estado
- buscar por correo o nombre
- reenviar codigo
- aprobar
- rechazar
- forzar verificacion

### Solicitudes
Ruta: `/admin/permission-requests`

Permite:
- filtrar por estado, tipo, usuario y detalle
- ver detalle
- aprobar
- aprobar parcialmente areas
- rechazar con motivo

### Usuarios / areas
Ruta: `/admin/users-areas`

Permite:
- buscar un usuario
- ver perfil resumido
- asignar o desasignar areas
- guardar solo cuando existan cambios reales

### Catalogos
Rutas:
- `/admin/categories`
- `/admin/types-areas`

Permite:
- crear
- editar
- desactivar
- reactivar

La desactivacion preserva historial; no es borrado fisico.

### Auditoria
Ruta: `/admin/audit-logs`

Permite:
- filtrar por accion y fecha
- revisar metadata de eventos
- exportar CSV

## 6. Problemas comunes

### “No tienes areas asignadas”
El usuario tiene permiso de lectura, pero no tiene areas asignadas. Debe solicitar areas o pedirlas al admin.

### “Cuenta pendiente de aprobacion”
El usuario ya verifico correo, pero aun no ha sido aprobado por el super admin.

### “Acceso deshabilitado”
La cuenta esta aprobada, pero no tiene permiso `ACCESS`.

### No aparecen documentos
Revisar:
- permisos
- areas asignadas
- filtros activos

### No se puede aprobar una solicitud de areas completa
El admin puede usar `Aprobacion parcial` y seleccionar solo las areas que si proceden.

## 7. Referencia rapida por ruta

| Ruta | Uso |
|---|---|
| `/login` | inicio de sesion |
| `/register` | registro publico |
| `/verify-email` | verificacion de codigo |
| `/documents` | listado y busqueda operativa |
| `/documents/:id` | detalle del documento |
| `/profile` | perfil y permisos |
| `/permissions/request` | solicitudes del usuario |
| `/admin/registrations` | aprobacion de registros |
| `/admin/permission-requests` | solicitudes admin |
| `/admin/users-areas` | asignacion de areas |
| `/admin/categories` | categorias |
| `/admin/types-areas` | tipos y areas |
| `/admin/audit-logs` | auditoria |
