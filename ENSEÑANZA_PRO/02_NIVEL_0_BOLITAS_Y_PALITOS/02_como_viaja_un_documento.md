# Como Viaja un Documento dentro del Sistema

## La idea general

Un documento dentro de DMS SIG no aparece por arte de magia ni se queda estatico. Recorre un camino. Entender ese camino es una de las mejores formas de entender el proyecto completo.

## Paso 1: alguien entra al sistema

Todo empieza con un usuario autenticado. Ese usuario:

- ya se registro,
- verifico su correo,
- fue aprobado por administracion si el flujo lo exige,
- y tiene permisos definidos.

Sin eso, no puede operar con normalidad.

## Paso 2: el usuario crea o sube un documento

El usuario entra a la parte de documentos y sube un archivo.

En ese momento, el sistema no solo recibe el archivo. Tambien recibe metadatos:

- nombre,
- categoria,
- tipo,
- area,
- comentario,
- y contexto del usuario que lo sube.

## Paso 3: el backend valida si la accion esta permitida

Antes de guardar algo, el backend revisa:

- si el usuario tiene permiso para subir,
- si puede operar en esa area,
- si el archivo cumple reglas de seguridad,
- si el tipo de archivo es valido,
- si los datos requeridos vienen completos.

Esto es importante porque el frontend muestra la interfaz, pero la decision real la toma el backend.

## Paso 4: el archivo se guarda y el documento queda registrado

Si todo sale bien:

- el archivo se guarda fisicamente;
- el documento se registra en base de datos;
- se crea una version;
- se asocia al usuario que lo subio.

Desde ese momento, ya existe un documento formal dentro del sistema.

## Paso 5: se extrae texto

Despues de guardar el archivo, el sistema intenta obtener texto utilizable.

Puede pasar una de estas cosas:

- si es un PDF con texto real, se extrae directamente;
- si es un DOCX, se extrae por su estructura interna;
- si es un PDF escaneado, entra OCR;
- si no se puede procesar, el documento sigue existiendo, pero la busqueda por contenido sera limitada.

Este paso es clave porque conecta documentos con busqueda inteligente.

## Paso 6: se indexa para busqueda

Una vez obtenido texto y metadatos, el sistema prepara ese contenido para que pueda ser encontrado rapidamente.

Para eso:

- se manda trabajo a la cola de indexacion;
- un worker procesa la indexacion;
- Elasticsearch queda listo para responder consultas.

Eso significa que el documento ya no solo esta guardado: tambien esta preparado para encontrarse rapido.

## Paso 7: el documento puede entrar a workflow

Un documento puede quedarse solo como borrador o puede entrar a flujo formal.

Si entra al flujo:

- se asigna un revisor;
- se asigna un aprobador;
- se registra cada paso;
- se deja historial de decision.

## Paso 8: el revisor decide

Cuando un documento esta en revision:

- el revisor puede ver el documento;
- puede emitir una decision;
- puede dejar comentario.

El sistema registra esa accion en el flujo y en la auditoria.

## Paso 9: el aprobador decide

Despues de la revision, el aprobador toma la decision final:

- aprobar,
- rechazar,
- o mantener el flujo segun el estado.

Otra vez, nada se pierde: todo queda trazado.

## Paso 10: el documento puede generar nuevas versiones

Si el documento cambia, no se reemplaza de forma destructiva. Se sube una nueva version.

Eso permite:

- conservar historial;
- saber que archivo era el anterior;
- comparar evolucion del documento;
- y evitar confusion sobre la version vigente.

## Paso 11: el documento puede buscarse

Cuando un usuario usa la busqueda:

- el sistema filtra por permisos y areas;
- consulta Elasticsearch cuando esta disponible;
- si hace falta, usa fallback;
- devuelve resultados con coincidencia y datos relevantes.

El usuario ve resultados, pero debajo hubo todo un proceso tecnico y de seguridad.

## Paso 12: todo queda auditado

Durante todo el viaje del documento, el sistema va dejando huella:

- quien subio;
- quien actualizo;
- quien consulto;
- quien reviso;
- quien aprobo;
- quien intento algo prohibido;
- cuando se hizo;
- con que resultado.

Eso convierte al sistema en una herramienta de control, no solo de almacenamiento.

## La moraleja

El documento no "se sube y ya". El documento:

- entra,
- se valida,
- se guarda,
- se convierte en registro formal,
- se indexa,
- puede pasar por workflow,
- puede tener nuevas versiones,
- se busca,
- y todo queda auditado.

Entender este viaje es entender el corazon del proyecto.
