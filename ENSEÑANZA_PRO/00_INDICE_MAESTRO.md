# Indice Maestro de ENSEÑANZA_PRO

Este material existe para que puedas aprender el proyecto `DMS SIG` por capas, sin saltar directamente al nivel tecnico profundo. La idea no es solo que "sepas que hace el sistema", sino que puedas explicarlo con seguridad en una defensa, responder preguntas imprevistas y demostrar que entiendes la relacion entre problema, solucion, arquitectura y operacion.

## Como esta organizado

El contenido esta dividido en siete bloques:

1. `01_PLAN_DE_ESTUDIO`
   - Te dice en que orden estudiar.
   - Te explica como usar todo este material sin perderte.

2. `02_NIVEL_0_BOLITAS_Y_PALITOS`
   - Explicacion desde cero.
   - Ideal si quieres empezar como si estuvieras explicandoselo a alguien que no es de sistemas.

3. `03_NIVEL_1_PUBLICO_GENERAL`
   - Explica el sistema como producto.
   - Sirve para hablar con asesores, jurado, usuarios o publico no tecnico.

4. `04_NIVEL_2_TECNICO`
   - Explica como esta construido el sistema.
   - Aqui ya entran frontend, backend, base de datos, OCR, Elasticsearch y seguridad.

5. `05_NIVEL_3_TECNICO_PROFUNDO`
   - Explica los flujos internos.
   - Es la parte que te da mas armas para defensa tecnica.

6. `06_DEFENSA`
   - Preguntas probables.
   - Argumentos fuertes del proyecto.

7. `07_APOYOS`
   - Glosario.
   - Mapa de rutas y endpoints.
   - Mapa del codigo fuente.

## Ruta recomendada

Si vas empezando de cero:

1. `01_PLAN_DE_ESTUDIO/01_ruta_de_aprendizaje.md`
2. `02_NIVEL_0_BOLITAS_Y_PALITOS/01_que_es_dms_sig.md`
3. `02_NIVEL_0_BOLITAS_Y_PALITOS/02_como_viaja_un_documento.md`
4. `02_NIVEL_0_BOLITAS_Y_PALITOS/03_quien_hace_que.md`
5. `03_NIVEL_1_PUBLICO_GENERAL/01_vision_general.md`
6. `03_NIVEL_1_PUBLICO_GENERAL/02_modulos_del_sistema.md`
7. `04_NIVEL_2_TECNICO/*`
8. `05_NIVEL_3_TECNICO_PROFUNDO/*`
9. `06_DEFENSA/*`
10. `07_APOYOS/*`

Si ya entiendes lo general y quieres prepararte para preguntas duras:

1. `04_NIVEL_2_TECNICO/01_arquitectura_general.md`
2. `04_NIVEL_2_TECNICO/05_busqueda_ocr_y_worker.md`
3. `04_NIVEL_2_TECNICO/06_seguridad_permisos_y_auditoria.md`
4. `05_NIVEL_3_TECNICO_PROFUNDO/01_flujo_completo_del_documento.md`
5. `05_NIVEL_3_TECNICO_PROFUNDO/02_registro_aprobacion_y_permisos.md`
6. `05_NIVEL_3_TECNICO_PROFUNDO/03_observabilidad_deploy_y_operacion.md`
7. `05_NIVEL_3_TECNICO_PROFUNDO/04_pruebas_calidad_y_riesgos.md`
8. `06_DEFENSA/01_preguntas_probables.md`

## Objetivo final

Al terminar este material deberias poder responder, con tus propias palabras, cosas como:

- Que problema resuelve el sistema.
- Por que se eligio una arquitectura cliente-servidor en capas.
- Como fluye un documento desde que se sube hasta que se revisa o aprueba.
- Como se controlan permisos, areas y roles.
- Como funciona la busqueda y por que se usa Elasticsearch.
- Que papel juega OCR y en que casos entra.
- Como se registra la auditoria.
- Como se valida la calidad del sistema.
- Como se despliega y opera.

## Sugerencia practica de estudio

No intentes memorizar frases exactas. Lo correcto es entender el sistema por capas:

- primero el problema,
- luego la solucion,
- luego los modulos,
- luego los flujos,
- luego las decisiones tecnicas,
- y al final los argumentos de defensa.

Si entiendes esa secuencia, no dependes de aprenderte un guion. Puedes adaptarte a las preguntas.

## Archivos clave del proyecto real que conviene tener presentes

Estos documentos del repositorio complementan este material:

- `README.md`
- `GUIA_OPERATIVA_FUNCIONAL.md`
- `backend/README.md`
- `backend/AUTHORIZATION_AUDIT.md`
- `backend/DB_TUNING.md`
- `backend/OBSERVABILITY.md`
- `backend/SECURITY_PRODUCTION.md`
- `backend/FILE_STORAGE_BACKUP.md`
- `frontend/README.md`
- `frontend/ACCESSIBILITY_AUDIT.md`

Este indice maestro es tu punto de entrada. No esta hecho para que leas todo de corrido sin pensar. Esta hecho para que vayas subiendo de nivel.
