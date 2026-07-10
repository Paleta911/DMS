# Registro, Aprobacion y Permisos

## Por que este flujo es clave

Un sistema documental serio no empieza cuando subes un archivo. Empieza incluso antes: con quien puede entrar al sistema y bajo que condiciones. En este proyecto, el ciclo de vida del usuario tiene varias etapas que conviene explicar bien.

## Etapa 1: registro

El usuario captura sus datos y el backend crea el registro inicial. Pero ese registro no implica acceso pleno. Solo abre el camino.

## Etapa 2: verificacion por correo

Se genera un codigo, se guarda con hash y el usuario debe validarlo. Esto evita registros debiles o correos falsos.

La existencia de `email_verification` como entidad separada permite:

- manejar intentos;
- expiracion;
- trazabilidad de envio y verificacion;
- no contaminar la entidad principal del usuario con demasiada logica efimera.

## Etapa 3: aprobacion administrativa

Dependiendo del flujo del proyecto, un administrador revisa el alta del usuario.

Esto agrega una segunda capa de gobierno:

- no basta con verificar correo;
- tambien se decide si la cuenta debe entrar a operar.

## Etapa 4: estado operativo

El usuario puede quedar:

- aprobado;
- rechazado;
- pendiente.

Eso afecta directamente su capacidad de uso.

## Etapa 5: permisos

Ya dentro del sistema, el usuario no opera solo por rol. Opera por permisos concretos.

Este punto es muy importante en defensa porque muestra que hubo diseño de autorizacion mas fino.

Los permisos principales incluyen:

- acceso;
- lectura;
- carga;
- nueva version;
- revision;
- aprobacion;
- eliminacion.

## Etapa 6: areas

Los permisos se cruzan con areas. De poco serviria tener permiso de leer si no se delimita sobre que conjuntos documentales aplica.

La relacion `user_area_codes` modela precisamente ese alcance.

## Solicitudes de permisos y areas

El proyecto no obliga a todo a gestion manual externa. El propio sistema permite que el usuario solicite:

- permisos adicionales;
- areas adicionales.

Luego administracion:

- revisa;
- aprueba;
- rechaza;
- o aprueba parcialmente si corresponde.

Esto es importante porque convierte al sistema en una herramienta de gobierno mas completa.

## Politicas administrativas

Con el tiempo se consolidaron politicas para evitar dispersion de reglas, por ejemplo:

- restricciones sobre admins y super admins;
- flujos especiales para usuarios privilegiados;
- bloqueos a autosolicitudes improcedentes;
- revisiones de jerarquia administrativa.

Eso evita inconsistencias entre endpoints.

## Donde vive realmente la autorizacion

No vive en un solo lugar. Vive en varios niveles:

- frontend: orienta, muestra u oculta acciones;
- guards: protegen rutas;
- servicios: ejecutan reglas de negocio profundas;
- metadata de controladores: define requisitos;
- politicas: unifican criterios administrativos.

## Por que esto es defendible

Porque demuestra que el proyecto no se limito a "poner login". Se construyo un modelo de acceso mas serio:

- identidad,
- verificacion,
- aprobacion,
- permisos,
- areas,
- y auditoria.

## Resumen para defensa

"El ciclo de vida del usuario en DMS SIG incluye registro, verificacion por correo, aprobacion administrativa y asignacion de permisos y areas. La autorizacion no depende solo del rol, sino de una combinacion de estado, permisos granulares, alcance por area y politicas administrativas centralizadas."
