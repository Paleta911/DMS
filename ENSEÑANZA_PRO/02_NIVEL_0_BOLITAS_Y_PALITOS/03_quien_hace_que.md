# Quien Hace Que dentro del Sistema

## Por que esta pregunta importa

Muchos sistemas fallan no porque les falten pantallas, sino porque no esta claro quien puede hacer que cosa. En DMS SIG eso se resuelve con una mezcla de:

- rol,
- estado del usuario,
- permisos,
- areas asignadas.

## Nivel 1: rol

El rol es una clasificacion general del usuario.

En este proyecto aparecen principalmente:

- usuario
- admin
- super admin

Eso da una idea general del tipo de funciones que puede tener.

## Nivel 2: estado del usuario

No basta con tener cuenta. El usuario tambien puede estar en distintos estados. Por ejemplo:

- pendiente de verificacion,
- pendiente de aprobacion,
- aprobado,
- rechazado.

Eso significa que aunque exista el registro del usuario, no siempre podra operar igual.

## Nivel 3: permisos

Aqui esta el control fino. Un usuario puede tener o no tener permisos como:

- acceso al sistema,
- ver documentos,
- subir documentos,
- subir nueva version,
- revisar,
- aprobar,
- eliminar.

Esto hace que el sistema sea mas flexible. No depende solo del rol.

## Nivel 4: areas

Las areas sirven para delimitar sobre que parte de la organizacion puede operar el usuario.

Ejemplo:

- un usuario puede tener permiso para leer, pero solo sobre documentos de ciertas areas;
- otro puede subir documentos, pero solo en su area;
- un admin puede gestionar asignaciones.

Esto evita que alguien vea o manipule informacion que no le corresponde.

## Entonces, quien hace que cosa

### Usuario comun

Normalmente puede:

- entrar al sistema si esta habilitado;
- ver su perfil;
- ver documentos si tiene permiso y area;
- subir documentos si tiene permiso;
- subir nuevas versiones si tiene permiso;
- solicitar permisos;
- solicitar areas;
- consultar estado de sus solicitudes.

Normalmente no puede:

- aprobar registros de otros usuarios;
- administrar catalogos;
- revisar auditoria;
- reasignar areas ajenas como admin.

### Administrador

Ademas de funciones operativas, puede:

- revisar registros de usuarios;
- aprobar o rechazar registros;
- revisar solicitudes de permisos y areas;
- gestionar catalogos;
- asignar areas;
- consultar auditoria;
- ver herramientas administrativas.

### Super administrador

Es el nivel mas alto.

Tiene atribuciones que un admin normal no deberia tener tan libremente, por ejemplo:

- control especial sobre jerarquias administrativas;
- creacion o gestion de usuarios privilegiados;
- operaciones delicadas de gobierno del sistema.

## Quien decide realmente si una accion se permite

Esto es importante: la decision final no la toma el frontend.

El frontend:

- muestra botones,
- oculta opciones,
- guia al usuario.

Pero quien realmente decide es el backend, mediante:

- autenticacion,
- guards,
- permisos,
- reglas de negocio,
- revision de area,
- estado del usuario.

Eso protege al sistema aunque alguien intente forzar llamadas.

## Ejemplo sencillo

Supongamos que un usuario intenta ver documentos.

El sistema no solo pregunta:

- "Esta logueado?"

Tambien pregunta:

- "Su cuenta esta aprobada?"
- "Tiene permiso de lectura?"
- "Tiene areas asignadas?"
- "Ese documento pertenece a un area que le toca?"

Solo si todo eso se cumple, la accion se permite.

## Ejemplo con workflow

Supongamos que alguien quiere aprobar un documento.

No basta con que vea el boton. El backend verifica:

- que tenga permiso de aprobar;
- que el flujo corresponda;
- que no se salte pasos;
- que el documento este en estado compatible;
- y que esa accion deje rastro.

## Idea final

En DMS SIG la pregunta no es solo "quien eres?". La pregunta completa es:

- quien eres,
- en que estado estas,
- que permisos tienes,
- sobre que areas,
- y en que momento del flujo estas actuando.

Por eso el sistema tiene control real y no solo apariencia de control.
