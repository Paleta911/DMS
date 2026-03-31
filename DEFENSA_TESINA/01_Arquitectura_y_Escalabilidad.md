# Arquitectura y Escalabilidad

## Pregunta 1

### Pregunta del jurado

Si usted ya tenia una base de datos relacional, por que introdujo Elasticsearch en lugar de resolver toda la busqueda con SQL Server? No esta sobrecomplicando innecesariamente el sistema?

### Respuesta modelo

La decision no se tomo por moda tecnologica, sino por especializacion de responsabilidades. SQL Server se mantuvo como la fuente de verdad transaccional porque modela muy bien entidades, relaciones, integridad y estados de negocio. Sin embargo, una gestion documental que necesita busqueda por contenido, relevancia textual, coincidencia libre y escalabilidad en consultas semiestructuradas enfrenta limitaciones si se apoya exclusivamente en consultas relacionales. Elasticsearch resuelve precisamente ese tipo de problema porque esta diseñado para indexar texto y responder busquedas semanticas o de coincidencia de forma mas eficiente.

Desde la perspectiva de ingenieria de software, esto responde al principio de separacion de responsabilidades. No estoy reemplazando la persistencia principal, sino complementandola con un motor especializado. Ademas, el sistema no depende ciegamente de Elasticsearch, porque incorpora una estrategia de fallback. Eso evita el antipatron de acoplar completamente la operacion a un subsistema secundario. En otras palabras: SQL Server gobierna la verdad del dominio; Elasticsearch optimiza una capacidad especifica del producto.

## Pregunta 2

### Pregunta del jurado

Por que implementar una arquitectura cliente-servidor en capas y no una solucion monolitica mas simple dentro de una sola aplicacion con renderizado de vistas tradicionales?

### Respuesta modelo

Porque el problema que resuelve el sistema no es solo mostrar formularios y guardar registros, sino coordinar varias capacidades con ciclos de vida distintos: autenticacion, autorizacion, workflow documental, OCR, indexacion, busqueda avanzada, observabilidad y administracion. Una arquitectura cliente-servidor separa claramente la capa de presentacion de la capa de negocio y de la capa de persistencia, lo que mejora mantenibilidad, escalabilidad y capacidad de evolucion.

Desde el punto de vista teorico, esta separacion reduce acoplamiento y mejora cohesion. El frontend puede enfocarse en experiencia de usuario, estados de interfaz y accesibilidad, mientras que el backend concentra reglas de negocio, seguridad, integraciones y consistencia transaccional. Si mas adelante se quisiera exponer la misma logica hacia otra interfaz, por ejemplo una app movil o una API corporativa, esa separacion ya existe. Por eso, aunque una solucion monolitica con vistas server-side habria sido mas rapida de construir al inicio, habria limitado la evolucion natural del sistema.

## Pregunta 3

### Pregunta del jurado

Su proyecto usa un worker separado para indexacion. Que problema real resuelve eso? No era mas simple indexar inmediatamente despues de subir el documento?

### Respuesta modelo

Indexar inmediatamente dentro de la misma peticion HTTP introduce dos riesgos claros: aumenta la latencia percibida por el usuario y acopla el exito de la operacion documental a la disponibilidad inmediata del motor de busqueda. Si la indexacion falla, el sistema puede terminar en un escenario ambiguo donde el documento ya fue persistido pero la respuesta al usuario queda afectada por una tarea secundaria.

El worker desacoplado resuelve eso mediante procesamiento asincrono. La persistencia del documento sigue siendo la transaccion principal; la indexacion pasa a ser una consecuencia eventual, controlada por una cola persistente con reintentos. Este diseño es congruente con principios de resiliencia y consistencia eventual. Ademas, reduce el tiempo de respuesta del flujo principal y hace observable el estado de indexacion. Es una mejora arquitectonica porque separa una responsabilidad operacionalmente costosa del camino critico de la solicitud original.

## Pregunta 4

### Pregunta del jurado

Usted afirma que el sistema es escalable. Que significa escalable en este caso? Porque escalar no es una palabra decorativa.

### Respuesta modelo

En este contexto, escalabilidad significa que el sistema puede aumentar su volumen de usuarios, documentos, versiones y consultas sin exigir un rediseño total de su arquitectura base. No implica que hoy sea una plataforma hiperescalable tipo big tech, sino que sus decisiones estructurales permiten crecimiento razonable.

Esa afirmacion se sostiene en varios puntos: la persistencia transaccional esta desacoplada de la busqueda; la indexacion usa un worker y cola persistente; la seguridad y permisos viven en backend y no en cliente; el frontend esta dividido por rutas y componentes reutilizables; el despliegue contempla ambientes separados; y la observabilidad permite detectar presion operativa. En terminos academicos, la escalabilidad aqui no se vende como promesa absoluta, sino como capacidad de crecer horizontalmente en ciertas piezas y verticalmente en otras sin romper el modelo funcional.

## Pregunta 5

### Pregunta del jurado

Si mañana la empresa triplica el numero de documentos, cual seria el primer cuello de botella de su arquitectura?

### Respuesta modelo

El primer cuello de botella no estaria necesariamente en la interfaz, sino en el pipeline documental completo: almacenamiento de archivos, crecimiento de indices de busqueda y volumen de OCR/indexacion. En particular, los documentos escaneados introducen un costo computacional mayor por pagina, por lo que OCR puede convertirse en uno de los principales focos de carga si el volumen aumenta abruptamente.

Sin embargo, el diseño actual ya permite identificar y aislar ese problema porque OCR e indexacion no viven completamente acoplados a la solicitud principal. Eso facilita una evolucion natural: mas capacidad de worker, politicas de reproceso, limites por lote, monitoreo de colas y eventualmente almacenamiento desacoplado. La respuesta correcta no es negar el cuello de botella, sino mostrar que la arquitectura actual hace visible donde aparece y deja abierta la ruta tecnica para atacarlo.

## Pregunta 6

### Pregunta del jurado

Por que mantener SQL Server como fuente de verdad si ya existe un indice en Elasticsearch con parte del contenido documental? No seria mas rapido consultar siempre Elastic?

### Respuesta modelo

Seria mas rapido para ciertos tipos de consulta textual, pero incorrecto como estrategia global de dominio. Elasticsearch no esta pensado para reemplazar una base transaccional, sino para optimizar busqueda. La fuente de verdad debe ser el sistema que mejor garantiza integridad, relaciones, consistencia y control de estados. En este proyecto, eso lo aporta SQL Server.

Si se promoviera Elasticsearch a fuente de verdad, se complicarian aspectos como trazabilidad relacional, transacciones, consistencia de permisos, flujos de aprobacion y reglas administrativas. La teoria de integracion de sistemas recomienda diferenciar claramente entre sistemas de registro y sistemas de consulta especializada. SQL Server cumple el rol de system of record; Elasticsearch funciona como read model optimizado para busqueda. Esa distincion protege al sistema de inconsistencias conceptuales y tecnicas.

## Pregunta 7

### Pregunta del jurado

Que tan facil seria convertir este sistema en multicliente o multiempresa? Su arquitectura ya lo soporta o habria que rehacerla?

### Respuesta modelo

La arquitectura actual no esta planteada explicitamente como multitenant, por lo tanto no afirmaria que ya soporta multiempresa de forma nativa. Sin embargo, tampoco partiria de cero. Hay varias bases que ayudan: separacion por dominios, permisos granulares, areas, catalogos y estrategia modular de backend.

Lo que faltaria es modelar formalmente la nocion de tenant: aislamiento de datos, tenant context en autenticacion, particion de indices de busqueda, segregacion de archivos, configuracion por entorno/cliente y revisiones de seguridad intertenant. En otras palabras, la arquitectura no tendria que rehacerse por completo, pero si requeriria una evolucion importante del modelo de dominio y de la infraestructura. La respuesta madura aqui es reconocer que multiempresa no esta gratis, aunque la base del sistema si facilita una evolucion ordenada.

## Pregunta 8

### Pregunta del jurado

Si el worker cae en produccion durante varias horas, que comportamiento esperaria del sistema y por que considera aceptable ese comportamiento?

### Respuesta modelo

Esperaria que el flujo documental principal siguiera funcionando en su parte transaccional: usuarios, carga de documentos, versionado y persistencia en SQL Server. Lo que se degradaria seria la disponibilidad inmediata de indexacion y, por tanto, parte de la experiencia de busqueda por contenido mas reciente.

Ese comportamiento es aceptable porque responde al principio de degradacion controlada. El sistema prioriza la operacion principal y desacopla una capacidad secundaria aunque importante. Ademas, al existir una cola persistente, los trabajos no se pierden, sino que quedan pendientes hasta que el worker se recupere. Esta es precisamente una de las razones por las que se evito una indexacion completamente sincrona: permite que una falla operacional no bloquee el flujo central de negocio.

## Pregunta 9

### Pregunta del jurado

No le parece que combinar demasiadas capacidades en un solo sistema, como OCR, permisos, workflow, auditoria y busqueda, lo vuelve demasiado complejo y dificil de mantener?

### Respuesta modelo

La complejidad existe, pero no toda complejidad es mala. En ingenieria de software hay una diferencia entre complejidad esencial y complejidad accidental. La esencial proviene del problema real. En este caso, si una organizacion necesita control documental serio, seguridad, versionado, workflow, busqueda y evidencia, esa complejidad no puede ignorarse sin sacrificar funcionalidad.

La tarea del diseño no era eliminar la complejidad esencial, sino organizarla. Por eso se modularizo el backend, se desacoplo la indexacion con worker, se mantuvo SQL como fuente de verdad, se centralizaron politicas administrativas y se crearon capas reutilizables en frontend. En resumen, el sistema es complejo porque el problema lo es, pero la arquitectura intenta domesticar esa complejidad en lugar de esconderla bajo soluciones simplistas.

## Pregunta 10

### Pregunta del jurado

Si tuviera presupuesto y tiempo ilimitados, cual seria el primer rediseño arquitectonico importante que haria y por que?

### Respuesta modelo

El primer rediseño importante que haria no seria romper la arquitectura actual, sino fortalecer el almacenamiento y la operacion alrededor del ciclo documental. En concreto, abstraeria el almacenamiento de archivos hacia un proveedor desacoplado tipo object storage, con politicas mas formales de backup, versionado fisico y restauracion. Esa evolucion tendria mucho impacto practico sin destruir la coherencia del sistema existente.

La razon es que, en un DMS real, el volumen documental y la operacion sobre archivos tienden a crecer mas rapido que otros aspectos. Llevar storage a una capa mas desacoplada mejoraria escalabilidad, despliegue, resiliencia y flexibilidad de infraestructura. No reescribiria backend ni frontend solo por hacerlo. La arquitectura actual ya es buena; lo correcto seria reforzar primero el subsistema con mas presion de crecimiento futuro.
