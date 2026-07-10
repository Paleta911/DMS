# Flujo Completo del Documento

## Por que este flujo importa tanto

Si hay un solo flujo que resume el proyecto, es este. Aqui se cruzan casi todas las piezas:

- autenticacion;
- permisos;
- areas;
- base de datos;
- almacenamiento de archivos;
- OCR;
- indexacion;
- workflow;
- auditoria;
- frontend.

Entender este flujo te permite defender la mayoria de decisiones del sistema.

## Fase 1: entrada por frontend

El usuario interactua con la pagina de documentos. Desde alli puede:

- ver el listado;
- filtrar;
- abrir detalle;
- subir nuevo documento;
- subir nueva version.

El frontend recolecta:

- archivo;
- nombre;
- categoria;
- tipo;
- area;
- comentario;
- y contexto del usuario autenticado.

## Fase 2: llegada al backend

La peticion entra al backend a traves del controlador de documentos. Pero ese controlador no "resuelve todo". La estructura real es mas madura:

- el controlador recibe;
- DTOs validan;
- guards filtran acceso;
- servicios especializados ejecutan.

Aqui ya se filtra una primera capa de seguridad.

## Fase 3: autorizacion

Antes de guardar cualquier cosa, el sistema valida:

- autenticacion;
- permiso de carga;
- permiso de nueva version si aplica;
- alcance por area;
- politicas administrativas o de estado si corresponde.

Esta fase es importante porque evita que el documento exista en un contexto improcedente.

## Fase 4: validacion de archivo

El archivo no se acepta a ciegas. Se revisa:

- extension;
- MIME;
- consistencia entre extension y contenido;
- nombres de archivo;
- reglas de seguridad;
- limites y politicas de subida.

Esto reduce riesgos de cargas ambiguas o inseguras.

## Fase 5: persistencia documental

Si la carga es valida, ocurre algo importante: el backend ya no trabaja solo con archivo. Construye un documento formal.

Se crea o actualiza:

- `document`
- `version`

Y se enlaza con:

- categoria,
- tipo,
- area,
- creador,
- consecutivo/codigo.

## Fase 6: extraccion de texto

Despues de crear la version, el sistema intenta obtener texto utilizable.

### Caso A: PDF con texto real

Se usa extraccion nativa.

### Caso B: DOCX

Se usa procesamiento estructural del archivo.

### Caso C: PDF escaneado

Si el texto nativo no es suficiente, el sistema ejecuta OCR.

El resultado se guarda en:

- `contentText`
- `textSource`
- `ocrApplied`
- `ocrPageCount`

## Fase 7: cola de indexacion

Con el texto y metadatos ya listos, el sistema prepara un trabajo de indexacion.

Ese trabajo ya no vive solo en memoria. Se guarda de forma persistente. Eso significa que:

- si el proceso se reinicia, el trabajo no se pierde;
- si hay error, puede reintentarse;
- si hay backlog, puede observarse.

## Fase 8: worker

El worker separado toma trabajos pendientes y:

- resuelve documento y version;
- construye el payload de indexacion;
- escribe en Elasticsearch;
- limpia o actualiza estado del trabajo.

Este desacoplamiento mejora robustez.

## Fase 9: consulta del documento

Cuando un usuario entra al detalle del documento, el sistema recupera:

- metadatos principales;
- historial de versiones;
- estado;
- flujo de aprobacion;
- indicadores de OCR o fuente textual.

Eso permite que el documento no sea una caja negra.

## Fase 10: workflow

El documento puede entrar a flujo de revision/aprobacion.

Se registran pasos en `document_approval` con datos como:

- usuario;
- paso;
- decision;
- comentario;
- fecha.

Eso mantiene trazabilidad del proceso.

## Fase 11: nueva version

Si el documento evoluciona:

- no se destruye el historial;
- se crea una nueva version;
- se repite extraccion de texto;
- se vuelve a indexar;
- se conserva trazabilidad.

## Fase 12: auditoria

Durante todo este viaje se generan eventos de auditoria. Eso convierte el flujo en algo explicable y verificable.

No solo se sabe que existe el documento. Tambien se sabe:

- quien lo subio;
- quien lo modifico;
- quien lo consulto;
- quien lo reviso;
- quien lo aprobo;
- y cuando paso todo eso.

## Version de defensa

Si te piden explicar el flujo del documento de forma tecnica pero clara, puedes decir:

"El frontend captura archivo y metadatos; el backend autentica, autoriza y valida la carga; luego persiste documento y version en SQL Server, extrae texto nativo o aplica OCR si el PDF esta escaneado, encola indexacion persistente para un worker separado, actualiza Elasticsearch para busqueda y registra evidencia en auditoria. Sobre ese documento despues se puede operar workflow de revision y aprobacion manteniendo trazabilidad completa."
