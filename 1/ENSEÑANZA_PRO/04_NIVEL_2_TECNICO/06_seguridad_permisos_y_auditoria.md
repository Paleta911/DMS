# Seguridad, Permisos y Auditoria

## Seguridad como eje del sistema

En un sistema documental, la seguridad no puede verse como agregado posterior. Forma parte del nucleo. El sistema no solo debe funcionar; debe hacerlo con control de acceso, trazabilidad y capacidad de evidencia.

## Autenticacion

El sistema usa autenticacion basada en JWT. Eso permite:

- identificar al usuario autenticado;
- mantener sesiones de forma controlada;
- proteger rutas privadas;
- separar claramente acceso publico y acceso autenticado.

## Estados del usuario

La seguridad no depende solo de contraseña correcta. Tambien depende del estado de la cuenta:

- pendiente de verificacion;
- pendiente de aprobacion;
- aprobada;
- rechazada.

Eso evita que una cuenta recien creada obtenga acceso total sin validaciones previas.

## Permisos granulares

Una de las decisiones importantes del proyecto es no depender solo de rol. Tambien existen permisos concretos:

- acceso;
- lectura;
- carga;
- nueva version;
- revision;
- aprobacion;
- eliminacion.

Esto da mas control y mas flexibilidad.

## Areas

Los permisos se cruzan con areas. Eso significa que alguien puede tener permiso de leer, pero no necesariamente sobre toda la organizacion. El sistema revisa tambien el contexto territorial u organizacional del documento.

## Guards y politicas

La seguridad no esta en un solo punto. Se combina desde:

- guards;
- metadata de rutas;
- servicios;
- politicas administrativas;
- restricciones por area;
- estado del usuario.

Esta mezcla es intencional. Algunas reglas se expresan bien como decoradores; otras necesitan logica mas profunda.

## Endurecimiento

El proyecto ya incorporo mejoras importantes:

- rate limits por endpoint sensible;
- validacion de configuracion critica;
- headers de seguridad;
- bloqueos por abuso sostenido;
- politica de produccion mas robusta.

## Auditoria

La auditoria no es solo log tecnico. Es un registro funcional de acciones importantes. Ejemplos:

- login exitoso;
- acceso denegado;
- busqueda;
- cambios administrativos;
- operaciones documentales;
- actualizaciones de catalogos.

## Que guarda la auditoria

Entre otras cosas:

- usuario;
- accion;
- tipo de recurso;
- identificador del recurso;
- metadata;
- IP;
- user agent;
- requestId;
- fecha.

Esto es muy valioso para defensa porque muestra madurez del sistema.

## Exportacion y consulta

La auditoria no se queda guardada sin mas. El sistema puede:

- filtrarla;
- consultarla;
- exportarla;
- usarla para diagnostico o control.

## Frase util para defensa

"La seguridad del sistema combina autenticacion JWT, estados de usuario, permisos granulares, restricciones por area y validaciones en backend. Ademas, las acciones relevantes quedan registradas en auditoria para trazabilidad, control y evidencia operativa."
