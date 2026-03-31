# Base de Datos y Optimizacion

## Pregunta 41

### Pregunta del jurado

Como justifica que SQL Server siga siendo apropiado cuando el sistema ya maneja busqueda, OCR, auditoria y bastante volumen de registros?

### Respuesta modelo

Porque esas capacidades no eliminan la naturaleza relacional del dominio. El sistema sigue necesitando una fuente transaccional fuerte para modelar relaciones, estados, aprobaciones, permisos, areas, solicitudes y auditoria. SQL Server sigue siendo apropiado para esa responsabilidad porque ofrece integridad referencial, consistencia y una estructura adecuada para consultas de negocio y trazabilidad.

El hecho de que exista OCR o busqueda avanzada no invalida el modelo relacional. Simplemente significa que ciertas cargas se complementan con componentes especializados. La decision correcta en arquitectura de datos no es elegir una sola herramienta para todo, sino asignar a cada una el rol que mejor desempena.

## Pregunta 42

### Pregunta del jurado

Por que separar `document` de `version`? No habria sido mas facil guardar todo en una sola tabla?

### Respuesta modelo

Habria sido mas simple inicialmente, pero conceptualmente incorrecto. `document` representa la identidad documental y su contexto estable: categoria, tipo, area, codigo, estado general y creador. `version` representa una manifestacion historica concreta del contenido, con archivo, comentario, texto extraido, fuente textual y metadatos de OCR.

Separarlas responde al principio de modelado correcto del dominio. Si ambas cosas vivieran en la misma tabla, se mezclarian atributos persistentes del documento con atributos historicos de cada version. Eso complicaria trazabilidad, generaria redundancia y volveria mas torpe el historial.

## Pregunta 43

### Pregunta del jurado

Tiene sentido guardar `contentText` en la base relacional si ya existe Elasticsearch?

### Respuesta modelo

Si, tiene sentido por varias razones. Primero, `contentText` forma parte del resultado del pipeline documental, no solo de la busqueda. Segundo, conservarlo en SQL Server permite trazabilidad, reprocesamiento, fallback y coherencia del dominio. Tercero, evita depender completamente del indice externo como unico lugar donde exista el texto.

En terminos de arquitectura de datos, Elasticsearch almacena una proyeccion optimizada para consulta, mientras SQL Server conserva la informacion fuente y sus relaciones. Mantener `contentText` en la entidad de version da mas control sobre reconstruccion y mantenimiento.

## Pregunta 44

### Pregunta del jurado

Como defiende el uso de una tabla puente `user_area_codes` en lugar de guardar simplemente un area por usuario?

### Respuesta modelo

Porque el problema real no es uno a uno. Un usuario puede necesitar operar sobre varias areas, y un area puede involucrar a varios usuarios. Eso es una relacion muchos a muchos. Guardar solo un area por usuario seria una simplificacion artificial del dominio y forzaria soluciones torpes en cuanto la operacion real exigiera multiples alcances.

Modelar correctamente la cardinalidad desde el inicio es una decision de calidad de datos. Evita campos ambiguos, listas serializadas o soluciones no normalizadas. La tabla puente hace explicita la relacion y mejora consulta, integridad y evolucion.

## Pregunta 45

### Pregunta del jurado

Que tan buena es su estrategia de indices? La definio por intuicion o por observacion real?

### Respuesta modelo

La estrategia actual ya se aleja de la intuicion pura porque incorpora analisis de hot spots y ajustes sobre consultas calientes. Se trabajaron indices para soportar mejor documentos, registros administrativos, auditoria y catalogos. Ademas, se reconocio que el tuning no es un evento unico, sino un proceso iterativo segun comportamiento real.

La postura correcta aqui no es decir que el tuning esta terminado para siempre, sino que existe una base metodologica: observar, medir, ajustar y volver a validar. Eso es mas defendible academicamente que afirmar optimizacion absoluta sin evidencia.

## Pregunta 46

### Pregunta del jurado

Como maneja el equilibrio entre normalizacion y rendimiento? Porque un modelo muy normalizado puede complicar consultas frecuentes.

### Respuesta modelo

El modelo privilegia normalizacion donde el dominio lo exige: usuarios, documentos, versiones, aprobaciones, catalogos, areas y solicitudes. Eso reduce redundancia y mejora consistencia. Sin embargo, el proyecto no se quedo solo en pureza teorica; cuando ciertas consultas se volvieron relevantes, se reforzaron con indices y se derivo la busqueda textual a un motor especializado.

En otras palabras, el equilibrio no se resolvio desnormalizando indiscriminadamente, sino usando la herramienta adecuada para cada capa. La normalizacion protege la calidad del dato; Elasticsearch y el tuning apoyan rendimiento en consultas concretas. Esa combinacion es una respuesta mas madura que sacrificar consistencia relacional demasiado pronto.

## Pregunta 47

### Pregunta del jurado

Por que no usar soft delete en todo? O por que no borrar fisicamente todo? Cual es su criterio?

### Respuesta modelo

El criterio correcto depende de la semantica del dato. No todos los datos del sistema tienen el mismo valor historico. En entidades de catalogo como tipos, areas o categorias, una estrategia de archivo o inactivacion puede ser mas apropiada para preservar trazabilidad sin romper referencias historicas. En otros casos, el borrado fisico puede ser aceptable si no compromete evidencia ni relaciones clave.

La decision madura no es aplicar una sola regla universal, sino definir politicas por tipo de entidad. En un DMS, la trazabilidad pesa mucho, por lo que una politica indiscriminada de borrado fisico seria pobre. Al mismo tiempo, usar soft delete en todo sin criterio tambien puede inflar complejidad y ruido de consulta.

## Pregunta 48

### Pregunta del jurado

Como resolveria bloqueos o contencion si varias operaciones administrativas y documentales ocurrieran al mismo tiempo?

### Respuesta modelo

La primera respuesta es distinguir operaciones verdaderamente transaccionales de operaciones derivadas. Lo critico debe seguir protegido por transacciones consistentes en SQL Server. Lo derivado, como indexacion, ya esta desacoplado. Eso reduce contencion innecesaria sobre el camino principal.

Si el volumen concurrente creciera significativamente, la estrategia pasaria por revisar aislamiento, patrones de acceso, indices, duracion de transacciones y posible serializacion excesiva en ciertas operaciones. La arquitectura actual ya ayuda porque no obliga a que todo ocurra dentro de una sola transaccion gigante. Esa es una base correcta para manejar concurrencia de forma mas fina.

## Pregunta 49

### Pregunta del jurado

Que problema de base de datos le preocupa mas a futuro en este sistema?

### Respuesta modelo

Me preocuparia principalmente el crecimiento combinado de tres cosas:

- versiones documentales;
- auditoria;
- metadatos de procesamiento/indexacion.

No porque el modelo sea malo, sino porque esas tablas tienden a crecer continuamente y pueden afectar tanto almacenamiento como patrones de consulta. La respuesta correcta no es negar ese riesgo, sino asumirlo como parte del ciclo de vida del sistema e incorporar estrategias de monitoreo, indices, archivo y, si fuera necesario, particionamiento o politicas de retencion.

## Pregunta 50

### Pregunta del jurado

Si el jurado dijera que su modelo de base de datos esta "bien para un ejercicio, pero no para una empresa", como responderia tecnicamente?

### Respuesta modelo

Responderia que el modelo ya incorpora varios rasgos propios de un sistema empresarial: integridad relacional, separacion entre documento y version, workflow de aprobacion, permisos granulares, areas, solicitudes, auditoria, indices y entidades auxiliares para OCR e indexacion. No se trata de una tabla de usuarios y una tabla de archivos. Hay un modelado explicito del dominio documental.

Tambien aceptaria con honestidad que, como cualquier sistema real, el modelo puede seguir evolucionando hacia politicas de retencion, storage mas desacoplado, mayor semantica historica o configuracion documental mas rica. Pero eso no invalida la base actual. La base ya es seria y coherente; lo que sigue son evoluciones de madurez, no correcciones por modelado ingenuo.
