# Patrones y Decisiones de Diseño

## Pregunta 31

### Pregunta del jurado

Que patron de diseño domina realmente en su backend? Porque decir "es modular" no basta como respuesta académica.

### Respuesta modelo

El backend no se apoya en un solo patron aislado, sino en una combinacion de estilos y patrones. La base principal es una arquitectura modular orientada por dominio, sobre la que NestJS aporta una estructura cercana a capas y a inyeccion de dependencias. Encima de eso aparecen fachadas de servicio, servicios especializados, repositorios provistos por TypeORM y componentes transversales como guards, DTOs y filtros.

La respuesta rigurosa no es inventar un patron unico, sino reconocer que el sistema combina patrones tacticos para resolver problemas distintos. La modularidad organiza dominios; las fachadas reducen el acoplamiento de controladores; la inyeccion de dependencias mejora testabilidad; y el uso de colas persistentes y worker introduce un estilo asincrono para tareas desacopladas. Eso es una arquitectura compuesta, no un patron de libro aplicado de forma dogmatica.

## Pregunta 32

### Pregunta del jurado

Por que partio servicios grandes en varias piezas? No fue solo refactor cosmetico?

### Respuesta modelo

No fue cosmetico. Cuando un servicio concentra demasiadas responsabilidades, empieza a violar cohesion y complica tres cosas: pruebas, mantenimiento y razonamiento. En el proyecto eso ocurria especialmente en puntos como autenticacion, documentos, usuarios, busqueda y auditoria. Dividirlos por responsabilidades redujo acoplamiento interno y volvio mas explicitos los casos de uso principales.

Desde teoria de diseño, esto se alinea con Single Responsibility Principle y con una mejor separacion entre coordinacion y ejecucion. Por ejemplo, tener una fachada estable y servicios especializados por lectura, mutacion, indexacion o escritura de auditoria permite cambiar una parte con menos riesgo de contaminar las otras. No es solo belleza del codigo; es reduccion de superficie de error.

## Pregunta 33

### Pregunta del jurado

Si usted ya usa TypeORM, por que no dejar que el ORM resuelva todo y evitar tantas capas de servicio?

### Respuesta modelo

Porque un ORM resuelve persistencia, no reemplaza el dominio ni la logica de negocio. TypeORM facilita mapeo objeto-relacional, relaciones y acceso a entidades, pero no deberia convertirse en el lugar donde se mezclen permisos, workflow, OCR, busqueda, reglas administrativas y auditoria.

En software empresarial, confundir persistencia con negocio genera modelos anemicos o servicios impropios. La razon de mantener capas de servicio es que el dominio del problema ya es suficientemente rico. El ORM es una herramienta valiosa, pero no sustituye el diseño del sistema. En este proyecto se usa como infraestructura, no como explicacion total de la arquitectura.

## Pregunta 34

### Pregunta del jurado

En frontend, por que usar componentes reutilizables en lugar de escribir cada pantalla de forma directa y especifica?

### Respuesta modelo

Porque el sistema ya tiene suficiente repeticion semantica para justificar reutilizacion: formularios, tablas, banners, modales, toolbars, notificaciones y controles administrativos. Si cada pantalla hubiera resuelto todo por su cuenta, se habria introducido duplicacion de comportamiento, de accesibilidad y de experiencia de usuario.

El uso de componentes reutilizables mejora consistencia y reduce deuda de mantenimiento. Ademas, en un sistema con modo oscuro, accesibilidad, tablas responsivas y mensajes orientados a accion, la reutilizacion no es solo un lujo de codigo limpio, sino una forma de asegurar que la calidad de experiencia se sostenga en toda la aplicacion.

## Pregunta 35

### Pregunta del jurado

Su sistema tiene feature flags e i18n. No es eso excesivo para un proyecto como este?

### Respuesta modelo

Depende del criterio con que se juzgue. Si se observa solo el minimo funcional, podria parecer extra. Pero si se observa la evolucion del sistema, feature flags e i18n son mecanismos de gobernanza y extensibilidad. Feature flags permiten habilitar o aislar capacidades sin reestructurar todo el producto; i18n evita acoplar la interfaz a textos fijos y da una base mas profesional.

No afirmaria que ambos fueran imprescindibles para una primera demo. Lo que si afirmo es que mejoran mantenibilidad y preparan el sistema para crecimiento. En ingenieria de software, esas capacidades no deben juzgarse solo por su urgencia inmediata, sino por el costo que evitan cuando el producto evoluciona.

## Pregunta 36

### Pregunta del jurado

Por que permitir consistencia eventual en busqueda en lugar de exigir consistencia fuerte en todo momento?

### Respuesta modelo

Porque no todas las capacidades requieren el mismo tipo de consistencia. La consistencia fuerte es esencial para la verdad de negocio: usuarios, permisos, documentos, versiones, estados y aprobaciones. Pero la busqueda es una capacidad derivada. Puede aceptar un pequeno desfase si eso mejora resiliencia, latencia y desacoplamiento.

Este es un caso clasico de tradeoff entre consistencia y disponibilidad en componentes secundarios. El sistema protege la integridad donde realmente importa y tolera consistencia eventual en la capa de indexacion, apoyandose en cola persistente y reintentos. Arquitectonicamente, eso es una eleccion deliberada, no una omision.

## Pregunta 37

### Pregunta del jurado

No considera que el proyecto mezcla demasiadas responsabilidades en el backend y deja al frontend mas como consumidor pasivo?

### Respuesta modelo

El backend asume muchas responsabilidades porque el dominio lo exige. En sistemas con seguridad, permisos, workflow y auditoria, la mayor parte de las decisiones validas deben estar del lado servidor. Eso no convierte al frontend en irrelevante; le asigna la responsabilidad correcta: experiencia, estado de interfaz, comunicacion clara y apoyo operativo.

El error seria invertir esas responsabilidades y dejar reglas de negocio dispersas en el cliente. La distribucion actual es congruente con una arquitectura segura y mantenible. El frontend no es pasivo: gestiona navegacion, cache, persistencia de vistas, notificaciones, accesibilidad y experiencia. Pero no se le entrega la autoridad sobre el dominio.

## Pregunta 38

### Pregunta del jurado

Su modelo parece bastante orientado a casos actuales. Que tan flexible es si la empresa cambia procesos o agrega nuevos tipos de documentos?

### Respuesta modelo

El modelo ya incorpora cierta flexibilidad a traves de catalogos, areas, permisos y separacion entre documento y version. Eso permite crecer sin romper la estructura principal. Sin embargo, la respuesta rigurosa es admitir que no todo cambio futuro esta resuelto automaticamente. Si la empresa necesitara reglas mucho mas dinamicas por tipo documental o workflows totalmente configurables, habria que extender el dominio.

Lo defendible es que la arquitectura actual si prepara el terreno para esa evolucion. Hay modularidad, separacion de responsabilidades y una base documental coherente. El sistema no esta congelado en un unico flujo rigido, pero tampoco pretende haber resuelto todas las variantes futuras sin cambio alguno.

## Pregunta 39

### Pregunta del jurado

Por que eligio un enfoque relacional fuerte y no un modelo documental o NoSQL para un DMS?

### Respuesta modelo

Porque el problema no es solo almacenar contenido libre, sino coordinar relaciones y estados con integridad fuerte: usuarios, permisos, areas, documentos, versiones, aprobaciones, solicitudes, auditoria y politicas administrativas. Ese dominio tiene naturaleza altamente relacional.

Un enfoque documental o NoSQL podria simplificar algunas escrituras o representaciones flexibles, pero complejizaria otras cosas cruciales: joins semanticos, integridad, trazabilidad y consistencia de reglas. La eleccion relacional fue coherente con el peso del dominio de negocio. Elasticsearch ya cubre la parte donde una estructura mas orientada a documento aporta valor: la busqueda textual.

## Pregunta 40

### Pregunta del jurado

Si tuviera que defender una sola decision de diseño como la mas importante del proyecto, cual seria y por que?

### Respuesta modelo

Defenderia la separacion entre fuente de verdad transaccional, busqueda especializada e indexacion desacoplada. Es decir:

- SQL Server para el dominio oficial;
- Elasticsearch para la consulta especializada;
- worker y cola persistente para indexacion.

Esa decision fue la mas importante porque evita varios errores graves al mismo tiempo: no fuerza a la base relacional a hacer todo, no convierte a Elasticsearch en verdad del negocio y no mete tareas costosas en el camino critico de la experiencia del usuario. En una sola decision se concentran principios de separacion de responsabilidades, resiliencia, mantenibilidad y escalabilidad. Por eso, para mi, es el corazon del diseño del sistema.
