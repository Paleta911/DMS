# Arquitectura General del Proyecto

## Idea central

El proyecto sigue una arquitectura cliente-servidor en capas. Eso significa que no toda la logica vive en el navegador ni toda la responsabilidad recae en la base de datos. Cada parte tiene un rol concreto.

## Vista de alto nivel

Las piezas principales son estas:

- `Frontend`
  - hecho con React, Vite y TypeScript
  - se encarga de la interfaz, navegacion y experiencia de uso

- `Backend`
  - hecho con NestJS y TypeORM
  - se encarga de autenticacion, reglas de negocio, seguridad, workflow y orquestacion

- `SQL Server`
  - guarda la informacion transaccional
  - es la fuente de verdad del sistema

- `Elasticsearch`
  - optimiza la busqueda
  - trabaja como motor especializado de consulta

- `Worker`
  - procesa trabajos de indexacion
  - evita cargar esa responsabilidad directamente al flujo web principal

- `OCR`
  - entra cuando los PDFs estan escaneados y no traen texto utilizable

## Por que esta separacion tiene sentido

Si todo viviera junto, el sistema seria mas fragil.

### Si el frontend decidiera permisos

Seria inseguro, porque cualquier usuario podria intentar forzar llamadas.

### Si la base de datos hiciera la busqueda avanzada ella sola

Podria funcionar para pocos datos, pero no seria la mejor opcion para consultas de contenido libre o relevancia textual.

### Si el backend indexara todo sin worker

La experiencia de usuario se volveria mas lenta y sensible a fallos de indexacion.

Por eso la separacion no es capricho; responde a necesidades concretas.

## Flujo general de una solicitud

Una solicitud comun sigue esta ruta:

1. el usuario interactua con una pantalla del frontend;
2. el frontend manda una peticion HTTP al backend;
3. el backend autentica y autoriza;
4. ejecuta reglas de negocio;
5. persiste en SQL Server;
6. si hace falta, registra auditoria;
7. si hace falta, manda trabajo al worker de indexacion;
8. el frontend recibe la respuesta y actualiza la vista.

## La base de datos como fuente de verdad

Aunque hay Elasticsearch y worker, el sistema toma a SQL Server como la fuente de verdad transaccional. Eso significa que:

- el estado oficial del usuario vive en SQL Server;
- el estado oficial del documento vive en SQL Server;
- las versiones viven en SQL Server;
- las aprobaciones viven en SQL Server;
- la auditoria vive en SQL Server.

Elasticsearch no reemplaza la verdad de negocio. La complementa para busqueda.

## Papel de Elasticsearch

Elasticsearch se usa porque hay un problema concreto: buscar por contenido y relevancia dentro de muchos documentos puede ser costoso o poco flexible solo con SQL tradicional.

Entonces:

- SQL Server guarda la informacion oficial;
- Elasticsearch acelera y mejora la experiencia de busqueda.

Si Elasticsearch falla o no esta disponible, el backend tiene estrategia de fallback.

## Papel del worker

El worker existe para desacoplar la indexacion del flujo principal.

Eso permite que:

- el usuario no espere demasiado despues de subir un documento;
- la indexacion tenga reintentos;
- los trabajos pendientes sobrevivan reinicios;
- el sistema tenga una cola mas robusta.

## Papel de OCR

OCR no es una tecnologia decorativa. Resuelve un problema real:

- un PDF escaneado puede verse bien visualmente,
- pero si no tiene texto estructurado, la busqueda no puede usar su contenido.

OCR transforma esa imagen en texto buscable y luego ese texto puede indexarse.

## Por que NestJS en backend

NestJS aporta una estructura modular clara:

- controladores,
- servicios,
- guards,
- modulos,
- DTOs,
- proveedores especializados.

Eso ayuda a mantener orden cuando el sistema crece.

## Por que React en frontend

React permite dividir la interfaz en componentes reutilizables:

- tablas,
- formularios,
- modales,
- banners,
- toolbars,
- notificaciones.

Ademas, con React Query y React Router se logra una capa de cliente bastante madura.

## Capas que debes poder nombrar en una defensa

Si te preguntan por arquitectura, una respuesta buena seria:

"El sistema se construyo con una arquitectura cliente-servidor en capas. El frontend React se encarga de la interfaz, el backend NestJS concentra la logica de negocio y seguridad, SQL Server mantiene la persistencia transaccional, Elasticsearch optimiza la busqueda, y un worker separado procesa la indexacion para desacoplarla del flujo principal."

Eso resume bastante bien el diseño general.
