# Que es DMS SIG

## Explicacion mas simple posible

Imagina una empresa donde existen muchos documentos importantes:

- procedimientos,
- formatos,
- manuales,
- evidencias,
- registros,
- archivos que deben revisarse o aprobarse.

Ahora imagina que esos documentos estan regados:

- algunos en carpetas,
- otros con nombres parecidos,
- otros duplicados,
- otros con versiones viejas,
- y otros que no cualquiera deberia ver.

El `DMS SIG` existe para resolver ese caos.

## Que significa DMS SIG

- `DMS` significa `Document Management System`, o sistema de gestion documental.
- `SIG` en este contexto se refiere al sistema interno de gestion documental del proyecto.

En palabras sencillas: es una aplicacion web para controlar documentos de forma ordenada y segura.

## Que hace el sistema

El sistema permite:

- que un usuario entre con su cuenta;
- que solo vea lo que le corresponde;
- que suba documentos;
- que genere nuevas versiones;
- que un documento pase por revision y aprobacion;
- que se pueda buscar rapido;
- que todo quede registrado en auditoria;
- y que incluso se extraiga texto de PDFs escaneados para poder buscarlos.

## Por que no basta con usar carpetas normales

Porque una carpeta normal no sabe:

- quien subio un archivo,
- si ese archivo ya tiene una version mas nueva,
- quien lo reviso,
- quien lo aprobo,
- si un usuario tiene permiso para verlo,
- si el texto del PDF es buscable,
- ni deja una auditoria clara de lo que paso.

Una carpeta solo guarda archivos. Un sistema de gestion documental controla el proceso.

## Como puedes imaginarte el sistema

Piensa en el DMS SIG como una mezcla de:

- biblioteca,
- archivo,
- control de accesos,
- historial de cambios,
- buscador inteligente,
- y bitacora de actividad.

No es solo "un lugar para subir PDFs". Es una herramienta para gobernar documentos.

## Quienes usan el sistema

En terminos simples, hay varios tipos de usuario:

- usuario normal,
- administrador,
- super administrador.

Pero ademas de eso, cada usuario puede tener permisos concretos:

- entrar al sistema,
- leer documentos,
- subir documentos,
- subir nueva version,
- revisar,
- aprobar,
- eliminar.

Y ademas puede estar asociado a una o varias areas.

Eso significa que el sistema no solo pregunta "quien eres?", tambien pregunta:

- "que puedes hacer?"
- "sobre que documentos?"

## Que es un documento aqui

En el sistema, un documento no es solo un archivo fisico. Es un registro con informacion:

- nombre,
- codigo,
- categoria,
- tipo,
- area,
- estado,
- creador,
- versiones,
- aprobaciones.

Eso es importante. El archivo es solo una parte. El documento completo incluye contexto y control.

## Que es una version

Una version es una nueva entrega del mismo documento.

Ejemplo:

- version 1 del procedimiento,
- version 2 corregida,
- version 3 aprobada.

El sistema guarda ese historial para que no se pierda la trazabilidad.

## Que es el workflow

`Workflow` significa flujo de trabajo.

Aqui el flujo documental puede verse asi:

1. alguien crea o sube un documento;
2. se asigna revisor;
3. se asigna aprobador;
4. se envia a revision;
5. se toma una decision;
6. se aprueba o se ajusta;
7. queda registrado.

## Que es la auditoria

La auditoria es la bitacora del sistema.

Sirve para saber:

- quien hizo algo,
- cuando lo hizo,
- sobre que recurso,
- desde donde,
- y con que resultado.

Eso da trazabilidad y ayuda mucho en control interno y revisiones.

## Que es la busqueda avanzada

El sistema no solo busca por nombre. Puede buscar por:

- texto,
- codigo,
- categoria,
- tipo,
- area,
- contenido del documento.

Para eso usa una combinacion de base de datos y Elasticsearch.

## Que aporta OCR

Hay PDFs que ya traen texto y se pueden leer directo.

Pero hay otros que son basicamente una foto escaneada guardada en PDF. En esos casos, el texto no se puede buscar facilmente.

OCR sirve para leer esa imagen y convertirla en texto utilizable.

Gracias a eso, un PDF escaneado tambien puede entrar a la busqueda.

## Idea final

Si tuvieras que resumir DMS SIG en una sola frase, podrias decir:

"Es un sistema web que organiza, controla, versiona, protege y hace buscables los documentos de la empresa."
