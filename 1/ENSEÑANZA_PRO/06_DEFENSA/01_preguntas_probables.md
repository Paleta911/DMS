# Preguntas Probables para la Defensa

## 1. Que problema resuelve el sistema?

Resuelve el desorden documental de una organizacion mediante centralizacion, control de versiones, permisos, areas, workflow, busqueda avanzada y auditoria.

## 2. Por que no usar carpetas compartidas tradicionales?

Porque una carpeta no controla versiones, aprobaciones, permisos granulares, trazabilidad ni busqueda por contenido de forma madura.

## 3. Por que separar frontend y backend?

Porque la interfaz y la logica de negocio tienen responsabilidades distintas. El frontend guia al usuario; el backend aplica seguridad, validacion y reglas operativas.

## 4. Por que SQL Server?

Porque el sistema necesita integridad relacional, consistencia transaccional y buena estructura para modelar usuarios, documentos, versiones, aprobaciones y auditoria.

## 5. Por que Elasticsearch si ya existe SQL Server?

Porque SQL Server es la fuente de verdad transaccional, pero Elasticsearch mejora la busqueda por contenido, relevancia y velocidad en escenarios documentales.

## 6. Para que sirve OCR?

Sirve para extraer texto de PDFs escaneados que no traen texto utilizable. Eso permite que tambien puedan buscarse por contenido.

## 7. Como controlan quien puede ver que?

Mediante autenticacion, estado de usuario, permisos granulares, areas asignadas y validaciones de backend.

## 8. Como garantizan trazabilidad?

Con auditoria de acciones relevantes, historial de versiones y registro de decisiones de workflow.

## 9. Que pasa si Elasticsearch falla?

El sistema cuenta con estrategia de fallback, por lo que no depende exclusivamente del motor de busqueda para seguir operando.

## 10. Que aporta el worker?

Desacopla la indexacion del flujo principal, permite reintentos y mejora resiliencia mediante una cola persistente.

## 11. Que evidencia hay de calidad?

Pruebas backend, frontend, smoke tests, pruebas con Elasticsearch, OCR, E2E y validaciones de despliegue/observabilidad.

## 12. Cual fue una decision tecnica importante?

Separar la persistencia transaccional de la busqueda especializada, y ademas desacoplar indexacion mediante worker con cola persistente.

## 13. Cual es una limitacion natural del sistema?

Como cualquier sistema documental, su valor depende tambien de la calidad del proceso organizacional y del uso disciplinado por parte de los usuarios.

## 14. Que valor aporta a la empresa?

Orden, rapidez de consulta, control documental, trazabilidad, mejor soporte para auditoria y mejor gobierno de acceso.

## 15. Que trabajo futuro es razonable?

Analitica mas avanzada, mas integraciones empresariales, dashboards ejecutivos o evolucion de OCR/automatizaciones.
