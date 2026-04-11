# Busqueda, OCR y Worker

## Por que esta parte es importante

Si alguien te pregunta que vuelve especial al sistema, una respuesta fuerte no es solo "tiene documentos". Una respuesta mucho mas interesante es:

"El sistema no solo guarda documentos; tambien los vuelve buscables, incluso cuando provienen de PDFs escaneados."

Para sostener esa frase hay que entender tres cosas:

- busqueda;
- OCR;
- worker.

## Busqueda

La busqueda del sistema no depende solo de una consulta SQL simple. Tiene dos niveles:

1. busqueda optimizada con Elasticsearch;
2. fallback cuando Elasticsearch no esta disponible.

## Elasticsearch

Elasticsearch sirve para:

- buscar texto mas rapido;
- hacer consultas por relevancia;
- indexar contenido documental;
- combinar texto con metadatos.

Esto es util cuando la cantidad de documentos crece o cuando se busca por contenido interno.

## Fallback

No siempre conviene que el sistema quede inutil si Elasticsearch cae. Por eso existe una estrategia de fallback que permite seguir consultando, aunque con menor sofisticacion.

Esa decision mejora resiliencia.

## OCR

OCR significa reconocimiento optico de caracteres. Su funcion es convertir imagenes de texto en texto utilizable.

En este proyecto el problema era claro:

- algunos PDFs ya traen texto;
- otros son escaneos;
- si son escaneos, el texto no se puede buscar de forma normal.

Entonces el sistema:

1. intenta extraer texto nativo;
2. si no encuentra texto suficiente;
3. aplica OCR;
4. guarda el resultado;
5. indexa ese contenido.

## Metadatos de OCR

La tabla `version` no solo guarda el texto. Tambien registra:

- `textSource`
- `ocrApplied`
- `ocrPageCount`

Eso permite saber de donde vino el texto y si OCR realmente participo.

## Worker

El worker separado existe para procesar indexacion sin cargar todo al backend web.

Su razon de ser:

- desacoplar indexacion;
- soportar reintentos;
- mantener cola persistente;
- no bloquear tanto la experiencia del usuario;
- hacer mas robusto el sistema.

## Cola persistente

En algun momento la cola estaba en memoria, pero eso implica riesgo: si el proceso cae, se pierden trabajos. Por eso evoluciono a una cola persistente con `SearchIndexJob`.

Eso es una mejora importante de ingenieria.

## Flujo completo de esta parte

Cuando se sube un documento:

1. se guarda el archivo;
2. se crea o actualiza la version;
3. se extrae texto;
4. si hace falta, entra OCR;
5. se guarda el texto;
6. se genera trabajo de indexacion;
7. el worker procesa la cola;
8. Elasticsearch queda listo para responder busquedas.

## Reprocesamiento

El sistema tambien quedo preparado para reprocesar contenido de documentos ya existentes. Eso es util si:

- cambia la estrategia de OCR;
- se cargaron documentos antes de habilitar OCR;
- se quiere reconstruir contenido textual.

## Frase util para defensa

"La busqueda avanzada del sistema se apoya en Elasticsearch, pero no depende exclusivamente de el porque existe una estrategia de fallback. Ademas, para PDFs escaneados se implemento OCR, de modo que el texto tambien puede indexarse y volverse buscable. La indexacion se desacopla mediante un worker y una cola persistente."
