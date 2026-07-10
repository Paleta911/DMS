# Seguridad y OWASP

## Pregunta 11

### Pregunta del jurado

Como justifica que su sistema no sea vulnerable a Broken Access Control, que es una de las fallas mas criticas del OWASP Top 10?

### Respuesta modelo

La defensa principal contra Broken Access Control en este sistema no se apoya en la interfaz, sino en el backend. Esa distincion es esencial. El frontend puede ocultar botones por experiencia de usuario, pero la autorizacion real se ejecuta mediante autenticacion JWT, guards, metadatos de acceso, permisos granulares, estado del usuario, politicas administrativas y restricciones por area. Es decir, no se asume nunca que "si no se ve el boton, la accion esta protegida".

Ademas, el control no se limita a rol. Se cruza con permisos concretos y con alcance por area, lo que reduce el riesgo de autorizaciones demasiado amplias. Este enfoque es congruente con el principio de menor privilegio y con las recomendaciones de OWASP para autorizacion del lado servidor. La razon por la que puedo defender el diseño es que la autorizacion esta modelada como regla de negocio y no como mero comportamiento visual.

## Pregunta 12

### Pregunta del jurado

Usted maneja carga de archivos. Como evita riesgos clasicos de OWASP relacionados con unrestricted file upload?

### Respuesta modelo

La carga de archivos se trata como un punto de alto riesgo, no como una simple entrada binaria. Por eso se aplican varias validaciones: extension esperada, MIME, coherencia entre extension y contenido, saneamiento del nombre original y reglas de aceptacion segun politicas del sistema. Tambien se limpia el archivo temporal si el flujo falla despues de haberse recibido.

Desde una perspectiva OWASP, la clave es no confiar ni en el nombre del archivo ni en la declaracion del cliente. La validacion debe ocurrir del lado servidor y el archivo no debe convertirse en ejecutable ni integrarse ciegamente al entorno. En este sistema, el archivo se trata como dato controlado y asociado a un flujo documental, no como artefacto libre de ejecucion. Eso reduce considerablemente la superficie de ataque.

## Pregunta 13

### Pregunta del jurado

Como protege el sistema contra ataques de fuerza bruta o abuso repetido sobre login, registro y verificacion?

### Respuesta modelo

El sistema incorpora rate limiting diferenciado para endpoints sensibles, especialmente en autenticacion, verificacion y operaciones administrativas. No todos los endpoints comparten la misma politica, porque el riesgo no es igual. Ademas, el modelo de usuario contempla rastreo de intentos fallidos, lo que permite endurecer respuestas ante abuso sostenido.

La logica correcta aqui sigue una defensa por capas: limitar frecuencia, observar patrones, registrar eventos de auditoria y endurecer politicas en produccion. OWASP recomienda precisamente no depender de una sola barrera. Un limitador de peticiones por si solo ayuda, pero su valor aumenta cuando se combina con trazabilidad y politicas de bloqueo o enfriamiento.

## Pregunta 14

### Pregunta del jurado

Como evita Insecure Design? Porque muchas veces el problema no es un bug de codigo, sino una decision de diseño debil.

### Respuesta modelo

Insecure Design se combate antes del codigo. En este proyecto eso se ve en decisiones como: separar autenticacion de autorizacion, cruzar permisos con areas, mantener SQL Server como fuente de verdad, registrar auditoria, tratar OCR e indexacion como procesos controlados y no permitir que la interfaz decida por si sola que esta autorizado.

En otras palabras, se asumio desde el diseño que el sistema iba a manejar documentos con valor operativo y que por eso necesitaba controles de acceso, trazabilidad y gobierno. Si el diseño hubiera sido "todo usuario autenticado puede ver todo", el problema ya estaria incorporado desde la base. La arquitectura intenta evitar precisamente ese tipo de debilidad estructural.

## Pregunta 15

### Pregunta del jurado

Que hace su proyecto respecto a Security Misconfiguration?

### Respuesta modelo

El proyecto incorpora validacion de configuracion critica y endurecimiento de produccion. Eso incluye manejo mas estricto de variables de entorno, verificacion de secretos sensibles, warnings o bloqueos ante configuraciones peligrosas y uso de headers de seguridad. Ademas, el despliegue se maneja con configuraciones por ambiente, lo que evita tratar desarrollo y produccion como si fueran equivalentes.

Teoricamente, Security Misconfiguration aparece cuando un sistema confia en defaults, expone paneles o deja configuraciones debiles sin control. En este proyecto se buscaron dos cosas: explicitar configuracion importante y validarla al arranque. Esa aproximacion es defendible porque desplaza parte de la seguridad desde el comportamiento accidental hacia la gobernanza explicita del entorno.

## Pregunta 16

### Pregunta del jurado

Como se maneja la exposicion de datos sensibles en logs, auditoria y observabilidad? No existe el riesgo de que la trazabilidad se convierta en fuga de informacion?

### Respuesta modelo

Ese riesgo existe en cualquier sistema con auditoria, por lo que la respuesta correcta no es ignorarlo sino gobernarlo. En este proyecto, la auditoria se centra en eventos, recursos, identificadores y metadata controlada, no en volcar indiscriminadamente cuerpos completos de peticiones sensibles. La estrategia correcta es registrar suficiente informacion para trazabilidad sin convertir el log en repositorio de secretos.

Desde el punto de vista de seguridad, esto requiere disciplina de diseño: definir que se loggea, que se omite, como se serializa metadata y que niveles de acceso tienen los operadores a esa informacion. Un sistema sin auditoria puede ser ciego; un sistema que audita todo sin criterio puede ser inseguro. La defensa madura esta en ese equilibrio.

## Pregunta 17

### Pregunta del jurado

Si el sistema usa OCR y procesa archivos complejos, como evita que un archivo malicioso provoque denegacion de servicio o procesamiento excesivo?

### Respuesta modelo

El riesgo se mitiga desde varias capas: validacion de tipo de archivo, reglas de carga, procesamiento controlado y desacoplamiento del flujo principal. OCR no corre como una accion arbitraria del navegador, sino dentro de un pipeline controlado del backend. Ademas, OCR solo entra cuando el documento realmente lo requiere, en lugar de aplicarse indiscriminadamente sobre todos los PDFs.

Arquitectonicamente, esto es importante porque reduce superficie de abuso. El documento se valida, se persiste, se procesa y se indexa bajo reglas observables. Si el sistema creciera aun mas, una evolucion razonable seria introducir limites mas refinados por paginas, tamaño o tiempo de procesamiento, pero la base actual ya evita que OCR se comporte como una caja sin control.

## Pregunta 18

### Pregunta del jurado

Que postura tiene su sistema frente a vulnerabilidades de Injection, especialmente si maneja consultas complejas, filtros, busqueda y operaciones administrativas?

### Respuesta modelo

La defensa contra injection parte de una idea central: no concatenar arbitrariamente entradas del usuario para formar consultas o comandos. En el backend se utiliza TypeORM y DTOs validados, lo que ya reduce mucho el riesgo de inyeccion clasica en persistencia relacional. Del lado de busqueda, la construccion de consultas a Elasticsearch se hace como objetos estructurados y no como texto libre ejecutable.

Eso no significa que el riesgo desaparezca por usar framework; significa que la superficie se reduce y la validacion debe seguir siendo explicita. OWASP insiste en que la parametrizacion y la validacion son la barrera real, no solo la tecnologia usada. La decision de centralizar reglas en backend y validar entradas estructuradas es coherente con esa recomendacion.

## Pregunta 19

### Pregunta del jurado

Si un atacante roba un JWT valido, que limites reales tendria en este sistema?

### Respuesta modelo

Un JWT valido compromete la identidad del usuario durante su vigencia, pero el alcance del daño depende de las capas adicionales del sistema. En este proyecto no basta con "estar autenticado"; tambien influyen estado del usuario, permisos concretos, areas asignadas y politicas administrativas. Eso significa que el impacto del robo de token no es uniforme ni total por definicion.

La respuesta madura es reconocer que el robo de JWT sigue siendo serio, pero que el diseño reduce blast radius mediante menor privilegio y control contextual. Ademas, la auditoria y la observabilidad ayudan a detectar patrones anormales. Como evolucion futura, seria razonable reforzar aun mas con sesiones revocables o refresh tokens gestionados, pero la arquitectura actual ya evita asumir que todo usuario autenticado vale lo mismo.

## Pregunta 20

### Pregunta del jurado

OWASP hoy insiste mucho en Software and Data Integrity Failures. Como se refleja esa preocupacion en su proyecto?

### Respuesta modelo

Se refleja en varias decisiones. Primero, las migraciones versionadas y el uso de una fuente de verdad transaccional controlada ayudan a mantener integridad del modelo de datos. Segundo, el pipeline documental guarda trazabilidad de versiones y metadatos de contenido, de modo que no se pierde el contexto de origen. Tercero, el despliegue y la configuracion por ambiente reducen dependencia de cambios manuales opacos.

No afirmaria que el sistema ya cubre todas las formas posibles de integridad avanzada, por ejemplo checksum criptografico por archivo o firma formal de artefactos documentales, porque eso seria exagerar. Pero si puedo defender que el proyecto ya trabaja integridad a traves de versionado, persistencia controlada, trazabilidad, configuracion validada y pipeline de despliegue mas serio que el de un entorno improvisado.
