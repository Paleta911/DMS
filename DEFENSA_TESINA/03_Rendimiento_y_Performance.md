# Rendimiento y Performance

## Pregunta 21

### Pregunta del jurado

Como justifica el costo de OCR dentro de un sistema que tambien pretende responder rapido? No esta metiendo una operacion costosa en un producto que deberia ser agil?

### Respuesta modelo

OCR es costoso, pero el criterio correcto no es eliminarlo por costo, sino ubicarlo donde aporte valor y controlar su impacto. En este sistema OCR no se ejecuta indiscriminadamente, sino solo cuando el PDF no ofrece texto utilizable. Es decir, primero se intenta extraccion nativa y solo despues se recurre a OCR.

Ademas, la operacion se integra con un pipeline desacoplado de indexacion, por lo que no toda la carga recae sobre la experiencia directa del usuario. Desde la teoria de performance, esto es un tradeoff entre completitud funcional y latencia. La respuesta madura es mostrar que el costo existe, que se mitiga por deteccion previa y desacoplamiento, y que se acepta porque resuelve un problema documental real que de otro modo quedaria sin cobertura.

## Pregunta 22

### Pregunta del jurado

Si el usuario sube un documento y luego no lo encuentra inmediatamente en busqueda, no es eso una mala experiencia o incluso una inconsistencia?

### Respuesta modelo

Es una consecuencia controlada de un modelo con consistencia eventual en la capa de busqueda, no una inconsistencia del sistema transaccional. El documento ya existe formalmente en SQL Server y el flujo principal se considera exitoso. La indexacion es una consecuencia asincrona cuyo objetivo es optimizar consulta, no definir la existencia del documento.

Desde teoria de sistemas distribuidos, esto es un tradeoff intencional: se privilegia que la operacion principal sea robusta y que la indexacion se procese de manera desacoplada. La interfaz puede comunicarse mejor con el usuario para reducir percepcion de demora, pero arquitectonicamente la decision es defendible porque evita que fallos del motor de busqueda invaliden una carga documental ya persistida correctamente.

## Pregunta 23

### Pregunta del jurado

Que hizo en frontend para que no se vuelva lento a medida que crecen pantallas, tablas y modulos administrativos?

### Respuesta modelo

Se trabajaron varias lineas: code splitting, organizacion por componentes reutilizables, React Query para cache y control de refetch, optimizacion de activos pesados, filtros persistentes y ajustes en tablas para grandes conjuntos. Ademas, se atacaron puntos concretos de costo como polling innecesario, carga de catalogos y chunking del frontend.

Desde la teoria de performance en interfaces, la idea no es solo reducir el tamaño del bundle inicial, sino tambien controlar trabajo de render, frecuencia de refresco y costo cognitivo. Un frontend rapido no depende solo del framework, sino de politicas de carga y reutilizacion. En este proyecto ya existe una base razonable en esa direccion.

## Pregunta 24

### Pregunta del jurado

Por que hablar de performance si su base de datos sigue siendo central y sus tablas seguiran creciendo? Donde esta la estrategia de largo plazo?

### Respuesta modelo

Hablar de performance no implica negar el crecimiento, sino gestionar sus efectos. En este proyecto se incorporaron indices, analisis de hot spots, estrategias de consulta, separacion entre SQL y motor de busqueda, y criterios de archivo/inactivacion en algunas entidades. Eso no agota el problema, pero si establece una linea tecnica correcta.

La estrategia de largo plazo no es "suponer que nunca crecera", sino distinguir responsabilidades: SQL Server soporta el dominio transaccional; Elasticsearch absorbe la busqueda textual; el worker desacopla indexacion; y el tuning se valida con analisis reales. Esa es una respuesta de ingenieria progresiva y no de optimismo ingenuo.

## Pregunta 25

### Pregunta del jurado

No le parece que usar React Query introduce complejidad innecesaria en frontend?

### Respuesta modelo

Si el sistema solo tuviera formularios simples y dos o tres listados, probablemente si seria excesivo. Pero aqui el frontend maneja:

- documentos;
- catalogos;
- auditoria;
- solicitudes;
- registros;
- estados de carga;
- invalidaciones cruzadas;
- persistencia de filtros.

En ese contexto, React Query deja de ser un lujo y se vuelve una herramienta de control de estado remoto. Reduce duplicacion, estandariza loading/error/cache y mejora consistencia. La complejidad que introduce es menor que la complejidad accidental que evita.

## Pregunta 26

### Pregunta del jurado

Como defenderia la idea de que el sistema es eficiente si OCR, Elasticsearch, SQL Server y el worker introducen varias piezas que consumen recursos?

### Respuesta modelo

Porque eficiencia no significa "usar la menor cantidad posible de componentes", sino usar los componentes adecuados para cada responsabilidad con un costo total razonable. Un sistema puede ser aparentemente simple y al mismo tiempo ineficiente porque fuerza a una sola capa a hacer trabajo para el que no esta optimizada.

En este caso, SQL Server resuelve transacciones, Elasticsearch resuelve busqueda, OCR resuelve documentos escaneados y el worker desacopla cargas. Cada pieza introduce costo, pero tambien reduce friccion y costo en otra parte. La eficiencia se evalua sobre el sistema completo y su objetivo de negocio, no solo por contar tecnologias.

## Pregunta 27

### Pregunta del jurado

Que evidencia tiene de que su tuning no fue solo cosmetico?

### Respuesta modelo

La defensa correcta no es afirmar tuning milagroso, sino mostrar que hubo un proceso de observacion y ajuste. El proyecto ya incorpora analisis de tablas calientes, indices adicionales, scripts de analisis y mediciones sobre consultas relevantes como documentos, auditoria y registros administrativos. Es decir, hubo una base objetiva para detectar puntos de presion.

En rendimiento, la evidencia no siempre es una sola cifra universal. Lo serio es mostrar que se instrumentaron consultas clave, se midieron y se ajustaron estructuras de datos o acceso. Esa metodologia es mas defendible que prometer que todo quedo "perfectamente optimizado".

## Pregunta 28

### Pregunta del jurado

Si el sistema tuviera miles de solicitudes de permisos y auditoria creciendo a diario, que problema de rendimiento esperaria en frontend y backend?

### Respuesta modelo

En backend esperaria presion en consultas con filtros, ordenamientos y exportaciones si no se cuidan indices y limites. En frontend esperaria impacto en pantallas administrativas si se intentaran renderizar demasiados registros a la vez o si los filtros dispararan demasiadas peticiones innecesarias.

Precisamente por eso se trabajaron paginacion, persistencia de filtros, vistas guardadas, exportaciones mas controladas y mejoras de query caching. Si el volumen creciera aun mas, el siguiente paso natural seria fortalecer virtualizacion en UI, endurecer estrategias server-side y ajustar exportaciones por lotes o asincronas.

## Pregunta 29

### Pregunta del jurado

No existe un conflicto entre accesibilidad, animaciones, modo oscuro y rendimiento? Como lo resolvio?

### Respuesta modelo

Si, existe tension entre experiencia visual y costo de render. La solucion correcta no es eliminar una de las dos dimensiones, sino equilibrarlas. En este proyecto las animaciones se usaron con criterio de suavidad y no como exceso decorativo; el modo oscuro se implemento de forma persistente y reusable; y la accesibilidad se trabajo en foco, semantica y navegacion.

Desde el punto de vista de performance, la clave fue no convertir esas mejoras en trabajo descontrolado del runtime. Por eso se cuidaron componentes reutilizables, carga por chunks y estados mas estables. La respuesta tecnica aqui es que se busco calidad de experiencia con costo razonable, no maximalismo visual.

## Pregunta 30

### Pregunta del jurado

Si un jurado le dice que el sistema tiene "muchas piezas y por eso seguramente sera lento", como responderia sin caer en una defensa vaga?

### Respuesta modelo

Responderia que cantidad de piezas y rendimiento no son equivalentes. Un sistema con pocas piezas puede ser lento si obliga a una sola capa a hacer todo mal. Un sistema con varias piezas puede ser mas eficiente si cada una esta especializada. Lo importante no es contar componentes, sino evaluar como se distribuye el trabajo.

En este proyecto la persistencia, la busqueda, el OCR y la indexacion no se mezclan arbitrariamente. Se separan para que cada problema tenga una solucion mas adecuada. Ademas, existen pruebas, observabilidad, tuning y mejoras de frontend que muestran que el rendimiento se trato como criterio de diseño y no como resultado accidental.
