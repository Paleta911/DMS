# Base de Datos del Sistema

## Papel de la base de datos

La base de datos es la memoria estructurada del sistema. No guarda solo usuarios y documentos; guarda relaciones, estados, permisos, historial y trazabilidad.

## Tecnologia

La persistencia principal usa:

- `SQL Server`
- `TypeORM`
- migraciones versionadas

## Por que SQL Server

Porque el sistema necesita:

- integridad relacional;
- restricciones;
- consistencia transaccional;
- joins claros entre entidades;
- soporte fuerte para auditoria y gobierno de datos.

## Entidades principales

Entre las entidades mas importantes estan:

- `user`
- `email_verification`
- `permission_request`
- `document`
- `version`
- `document_approval`
- `audit_log`
- `category`
- `document_type`
- `area_code`
- `user_area_codes`
- `search_index_job`

## `user`

Representa a la persona que usa el sistema. No solo guarda credenciales. Tambien guarda:

- rol;
- estado;
- super administracion;
- permisos granulares;
- proteccion de login;
- timestamps de aprobacion y rechazo;
- relacion con areas.

## `email_verification`

Separa la verificacion del usuario principal. Eso permite guardar:

- codigo con hash;
- expiracion;
- intentos;
- estado de envio;
- trazabilidad de verificacion.

## `permission_request`

Centraliza solicitudes de:

- permisos
- areas

Y guarda:

- tipo de solicitud;
- detalle;
- estado;
- comentario;
- revision administrativa.

## `document`

Es la entidad documental principal. Guarda:

- nombre;
- categoria;
- tipo de documento;
- area;
- creador;
- codigo;
- consecutivo;
- estado general.

## `version`

Relacionada con `document`. Guarda:

- nombre almacenado;
- nombre original;
- comentario;
- texto extraido;
- fuente del texto;
- si se aplico OCR;
- cantidad de paginas OCR procesadas.

Esta tabla es fundamental porque conecta almacenamiento, historial y busqueda.

## `document_approval`

Representa pasos del workflow:

- revisor o aprobador;
- decision;
- paso;
- comentario;
- fecha de decision.

## `audit_log`

Guarda eventos importantes:

- accion;
- tipo de recurso;
- identificador;
- metadata;
- IP;
- user agent;
- requestId.

## Catalogos

Los catalogos base son:

- `category`
- `document_type`
- `area_code`

Y tienen estrategia de archivo/inactivacion para no perder trazabilidad historica.

## `user_area_codes`

Tabla puente para relacion muchos usuarios con muchas areas.

Eso permite modelar que:

- un usuario puede operar en varias areas;
- un area puede tener varios usuarios autorizados.

## `search_index_job`

Representa trabajos persistentes de indexacion para el worker. Su existencia permite:

- no perder trabajos al reiniciar;
- reintentar;
- observar estado de la cola.

## Integridad y crecimiento

No basta con crear tablas. Tambien importa:

- indices;
- reglas de borrado;
- consistencia entre entidades;
- politicas de archivo;
- tuning en consultas calientes.

Este proyecto ya incorporo varias mejoras de indices y analisis sobre tablas calientes.

## Frase util para defensa

"La base de datos relacional en SQL Server funciona como fuente de verdad del sistema. Modela usuarios, verificaciones, documentos, versiones, aprobaciones, auditoria, solicitudes y catalogos, con relaciones e indices pensados para integridad, trazabilidad y operacion documental."
