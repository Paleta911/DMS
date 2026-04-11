# Glosario del Proyecto

## API

Interfaz de comunicacion entre frontend y backend. En este proyecto es la forma en que la interfaz solicita datos o ejecuta acciones.

## Auditoria

Registro de eventos relevantes del sistema para trazabilidad, control y evidencia.

## Backend

Capa del servidor donde viven reglas de negocio, seguridad, validaciones y orquestacion.

## Base de datos transaccional

Fuente de verdad del sistema. Aqui se guardan usuarios, documentos, versiones, aprobaciones y auditoria.

## Catalogo

Conjunto de datos base que sirven para clasificar informacion, por ejemplo categorias, tipos de documento y areas.

## Cola persistente

Mecanismo para guardar trabajos pendientes en base de datos, de forma que no se pierdan si el proceso se reinicia.

## Documento

Entidad principal del sistema. No es solo un archivo; incluye metadatos, relaciones, estado y versiones.

## DTO

Objeto usado para validar la forma de una entrada antes de pasar a la logica de negocio.

## Elasticsearch

Motor especializado de busqueda usado para consultas por contenido y relevancia.

## E2E

Pruebas end-to-end. Simulan uso real del sistema con navegador o flujos completos.

## Feature flag

Bandera que permite activar o desactivar funcionalidades sin cambiar toda la aplicacion.

## Frontend

Interfaz visual del sistema con la que interactua el usuario.

## Guard

Mecanismo de NestJS para proteger rutas o acciones antes de ejecutar el flujo principal.

## Health check

Endpoint o verificacion usada para saber si un servicio esta vivo y en buen estado.

## Indexacion

Proceso de preparar documentos y texto para que puedan buscarse rapidamente.

## JWT

Token usado para autenticar usuarios en las peticiones.

## OCR

Reconocimiento optico de caracteres. Convierte imagenes con texto en texto utilizable.

## Permiso

Capacidad concreta otorgada a un usuario, como leer, subir, revisar o aprobar.

## Rol

Clasificacion general del usuario, por ejemplo usuario, admin o super admin.

## SQL Server

Sistema gestor de base de datos usado como persistencia principal del proyecto.

## Version

Instancia historica de un documento. Permite mantener trazabilidad de cambios.

## Worker

Proceso separado que realiza trabajos asincronos, en este caso principalmente indexacion.

## Workflow

Flujo de trabajo que sigue un documento para revision y aprobacion.
