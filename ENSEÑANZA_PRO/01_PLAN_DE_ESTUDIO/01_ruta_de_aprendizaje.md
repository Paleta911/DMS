# Ruta de Aprendizaje del Proyecto DMS SIG

## Proposito de esta ruta

Este documento no explica el sistema todavia. Explica como estudiarlo de forma correcta. El error mas comun cuando alguien intenta preparar una defensa tecnica es empezar por detalles sueltos: nombres de carpetas, endpoints, tecnologias o tablas. Eso suele provocar dos problemas:

1. se memoriza informacion sin entenderla;
2. cuando llega una pregunta ligeramente distinta, la persona se bloquea.

Para evitar eso, aqui la estrategia es ir por capas.

## Capa 1: entender el problema antes que la tecnologia

Antes de hablar de NestJS, React, SQL Server o Elasticsearch, debes poder explicar esto:

- la empresa necesita controlar documentos;
- un documento no es solo un archivo, sino una pieza de informacion formal que puede tener version, aprobacion, auditoria y restricciones de acceso;
- cuando ese control no existe, aparecen problemas concretos:
  - duplicidad,
  - confusion sobre cual version es la vigente,
  - busqueda lenta,
  - accesos incorrectos,
  - mala evidencia para auditorias.

Si no dominas esta capa, cualquier explicacion tecnica se siente hueca.

## Capa 2: entender la solucion en lenguaje humano

Despues debes poder explicar la solucion sin sonar demasiado tecnico:

- el sistema centraliza documentos;
- controla quien entra y que puede hacer;
- registra versiones;
- registra revisiones y aprobaciones;
- guarda evidencias de acciones;
- permite buscar rapido por nombre, codigo, categoria, area y contenido;
- incluso puede aplicar OCR cuando un PDF esta escaneado y no trae texto utilizable.

Esta capa es clave para hablar con asesores o jurado no tecnico.

## Capa 3: entender los modulos

Una vez entendido el problema y la solucion, sigue la estructura funcional:

- autenticacion y registro,
- perfil y permisos,
- catalogos,
- documentos,
- versiones,
- workflow,
- busqueda,
- auditoria,
- administracion.

Aqui ya debes poder relacionar cada modulo con una necesidad real del negocio.

## Capa 4: entender la arquitectura

Ahora si entra la parte tecnica:

- frontend React como capa de interfaz;
- backend NestJS como capa de reglas de negocio;
- SQL Server como persistencia transaccional;
- Elasticsearch como motor de busqueda;
- worker separado para indexacion;
- OCR para PDFs escaneados;
- observabilidad y despliegue.

La idea no es repetir nombres de herramientas, sino entender por que cada una existe.

## Capa 5: entender los flujos principales

Aqui debes poder narrar historias completas:

- como se registra un usuario;
- como se verifica por codigo;
- como se aprueba administrativamente;
- como solicita permisos o areas;
- como sube un documento;
- como genera versiones;
- como se asignan revisor y aprobador;
- como se busca;
- como se audita lo que paso.

Esta capa suele ser la que mejor impresiona en una defensa, porque demuestra entendimiento real del sistema.

## Capa 6: entender decisiones y tradeoffs

Esta es la parte donde dejas de sonar como alguien que solo ejecuto tareas y empiezas a sonar como alguien que entiende por que el sistema esta hecho asi:

- por que SQL Server y no solo archivos sueltos;
- por que Elasticsearch ademas de la base de datos;
- por que permisos granulares y areas;
- por que se usa un worker para indexar;
- por que se requiere OCR;
- por que se separa backend y frontend;
- por que se hace auditoria;
- por que hay feature flags, observabilidad y despliegue multiambiente.

## Capa 7: defensa y preguntas

Hasta el final debes trabajar preguntas probables:

- por que este sistema y no uno comercial;
- que valor aporta a la empresa;
- que riesgos resuelve;
- que limitaciones tiene;
- que decisiones tecnicas fueron mas importantes;
- que quedaria como trabajo futuro.

## Orden real de estudio

### Fase A. Comprension sin tecnicismos

Lee:

- `02_NIVEL_0_BOLITAS_Y_PALITOS/01_que_es_dms_sig.md`
- `02_NIVEL_0_BOLITAS_Y_PALITOS/02_como_viaja_un_documento.md`
- `02_NIVEL_0_BOLITAS_Y_PALITOS/03_quien_hace_que.md`

Objetivo:

Que puedas explicar el sistema como si se lo contaras a alguien de otra carrera.

### Fase B. Comprension funcional

Lee:

- `03_NIVEL_1_PUBLICO_GENERAL/01_vision_general.md`
- `03_NIVEL_1_PUBLICO_GENERAL/02_modulos_del_sistema.md`
- `03_NIVEL_1_PUBLICO_GENERAL/03_historia_de_uso.md`

Objetivo:

Que puedas contar que hace el sistema, a quien ayuda y como se usa.

### Fase C. Comprension tecnica base

Lee:

- `04_NIVEL_2_TECNICO/01_arquitectura_general.md`
- `04_NIVEL_2_TECNICO/02_backend_nestjs.md`
- `04_NIVEL_2_TECNICO/03_frontend_react.md`
- `04_NIVEL_2_TECNICO/04_base_de_datos.md`
- `04_NIVEL_2_TECNICO/05_busqueda_ocr_y_worker.md`
- `04_NIVEL_2_TECNICO/06_seguridad_permisos_y_auditoria.md`

Objetivo:

Que puedas justificar como esta construido el sistema.

### Fase D. Comprension tecnica profunda

Lee:

- `05_NIVEL_3_TECNICO_PROFUNDO/01_flujo_completo_del_documento.md`
- `05_NIVEL_3_TECNICO_PROFUNDO/02_registro_aprobacion_y_permisos.md`
- `05_NIVEL_3_TECNICO_PROFUNDO/03_observabilidad_deploy_y_operacion.md`
- `05_NIVEL_3_TECNICO_PROFUNDO/04_pruebas_calidad_y_riesgos.md`

Objetivo:

Que puedas responder preguntas de arquitectura, operacion y calidad sin improvisar.

### Fase E. Preparacion de defensa

Lee:

- `06_DEFENSA/01_preguntas_probables.md`
- `06_DEFENSA/02_argumentos_fuertes_del_proyecto.md`
- `07_APOYOS/*`

Objetivo:

Poder defender el proyecto con estructura, criterio y vocabulario correcto.

## Como saber si ya entendiste un nivel

Un nivel esta realmente dominado cuando puedes explicarlo sin leer. No hace falta memorizar texto exacto. Basta con que puedas responder con tus palabras.

### Señales de que ya dominas el nivel 0

- puedes explicar el problema y la solucion;
- no dependes de tecnicismos;
- no confundes rol con permiso ni documento con version.

### Señales de que ya dominas el nivel 1

- puedes contar como se usa el sistema;
- puedes explicar para que sirve cada modulo;
- puedes describir un caso de uso completo.

### Señales de que ya dominas el nivel 2

- entiendes la arquitectura;
- sabes por que existe cada capa;
- puedes ubicar responsabilidades generales de frontend, backend, base de datos y busqueda.

### Señales de que ya dominas el nivel 3

- puedes explicar flujo de datos;
- puedes hablar de OCR, worker, auditoria y seguridad con sentido;
- puedes responder preguntas de calidad, pruebas y riesgos.

## Recomendacion final

No estudies esto como si fuera una lista para recitar. Estudialo como si fueras a enseñarselo a otra persona. Cuando puedes enseñar un sistema, ya lo entendiste.
