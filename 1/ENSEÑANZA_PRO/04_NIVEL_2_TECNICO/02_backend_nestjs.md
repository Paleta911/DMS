# Backend con NestJS

## Que papel juega el backend

El backend es el centro de control del sistema. No es solo una API que "guarda cosas". Es la capa donde se decide que acciones son validas, quien puede hacerlas, que estados cambian y que evidencia se registra.

## Stack principal

El backend esta construido con:

- `NestJS`
- `TypeORM`
- `SQL Server`
- `JWT` para autenticacion
- `Elasticsearch` para busqueda

## Organizacion modular

El backend esta separado por dominios funcionales. Entre los modulos mas importantes estan:

- `auth`
- `users`
- `documents`
- `versions`
- `search`
- `permissions`
- `admin`
- `audit-log`
- `categories`
- `document-types`
- `area-codes`
- `observability`
- `platform`

Esta organizacion ayuda a que el sistema no se convierta en una sola masa de logica.

## Que hace el modulo auth

El modulo `auth` resuelve:

- login,
- registro,
- verificacion por correo,
- aprobacion inicial,
- bootstrap administrativo,
- integracion con JWT.

Con el tiempo se dividio internamente en servicios mas pequenos porque era un punto muy denso del sistema.

## Que hace el modulo users

El modulo `users` maneja:

- lectura y mutacion de usuarios;
- perfil;
- asignacion de permisos;
- areas;
- tareas pendientes;
- restricciones administrativas.

## Que hace el modulo documents

Este modulo es uno de los nucleos del proyecto. Se encarga de:

- recibir documentos;
- validar metadatos;
- crear registros;
- generar versiones;
- extraer texto;
- invocar OCR cuando corresponde;
- coordinar workflow;
- exponer consulta documental.

## Que hace el modulo versions

Su responsabilidad es exponer y controlar lo relativo a versiones:

- consulta;
- descarga;
- trazabilidad;
- datos derivados del procesamiento de texto y OCR.

## Que hace el modulo search

El modulo de busqueda esta separado porque tiene varias responsabilidades:

- consultar Elasticsearch;
- aplicar fallback;
- encolar indexacion;
- procesar estado de indexacion;
- coordinar reindexaciones;
- exponer indicadores del estado del motor.

## Que hace el modulo permissions

Este modulo maneja solicitudes de:

- permisos
- areas

Tambien incluye la parte administrativa para revisar, aprobar, rechazar o aprobar parcialmente cuando corresponde.

## Que hace el modulo admin

El area administrativa agrupa flujos como:

- registros de usuarios;
- revision administrativa;
- reportes o analitica;
- control de solicitudes.

## Que hace el modulo audit-log

Este modulo registra y consulta eventos importantes del sistema. No es solo un "log tecnico". Tiene valor funcional:

- evidencia;
- trazabilidad;
- seguimiento de seguridad;
- diagnostico.

## DTOs y validacion

El backend usa DTOs para validar entradas. Eso permite:

- rechazar datos incompletos;
- devolver errores consistentes;
- proteger la logica interna.

Ejemplo: si una peticion carece de un campo requerido o trae datos fuera de formato, no entra directamente a la capa de negocio.

## Guards y seguridad

NestJS facilita el uso de guards para proteger rutas. En este proyecto se usan para:

- verificar autenticacion JWT;
- revisar rol;
- revisar permisos;
- bloquear accesos improcedentes.

Ademas, hay reglas dentro de servicios, porque no toda seguridad debe vivir en decoradores.

## Servicios especializados

Una cosa importante del proyecto es que varios servicios grandes se fueron separando para evitar concentracion excesiva de logica. Ejemplos:

- `AuthService` se fue partiendo en servicios mas especializados;
- `DocumentsService` se separo en lectura, mutacion, OCR y mantenimiento;
- `SearchService` se convirtio en fachada apoyada por servicios de engine, query, indexing y state.

Esto no es un detalle menor. Es señal de madurez estructural.

## Controladores

Los controladores reciben peticiones HTTP y delegan trabajo. No deberian cargar la logica completa. En este proyecto, la tendencia fue mover logica relevante a servicios y dejar controladores mas delgados.

## Frase util para defensa

"El backend concentra la logica de negocio, la seguridad y la orquestacion entre base de datos, busqueda, OCR y auditoria. Se implemento con NestJS por su estructura modular, uso de guards, validacion por DTOs y buena separacion por dominios."

Esa es una descripcion defendible y correcta.
