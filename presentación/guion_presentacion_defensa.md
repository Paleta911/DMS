# Guion de presentación - Estadía

## Diapositiva 1. Portada

**Título**
Sistema Digital de Gestión Documental para Central El Potrero

**Subtítulo**
Presentación de estadía profesional

**Datos**
- Jesús Ricardo Andrade Carbajal
- Ingeniería en Desarrollo y Gestión de Software
- Universidad Tecnológica del Centro de Veracruz
- Empresa: Central El Potrero
- Asesora académica: Mtra. Estefanía Pulido Álvarez
- Asesora industrial: Ing. Karina Jael López Burgoa
- 16 de abril de 2026

**Qué decir**
Buenas tardes. Presentaré el proyecto desarrollado durante mi estadía en Central El Potrero: un sistema digital de gestión documental orientado a centralizar documentos, controlar versiones, administrar accesos y mejorar la trazabilidad del proceso documental.

**Captura sugerida**
- Portada limpia, sin captura del sistema.

---

## Diapositiva 2. Introducción

**Título**
Introducción

**Contenido**
- El área de Calidad manejaba documentos de forma dispersa.
- Existían problemas de localización, duplicidad y uso de versiones incorrectas.
- No había trazabilidad completa de revisiones, aprobaciones y cambios.
- Se planteó una solución web centralizada para ordenar el flujo documental.

**Qué decir**
El proyecto nace de una necesidad operativa real. La documentación se encontraba distribuida en distintos equipos y no existía un mecanismo confiable para saber cuál era la versión vigente, quién había realizado cambios o qué permisos tenía cada usuario.

**Captura sugerida**
- Una sola captura del módulo `/documents` o de la pantalla principal ya con datos.

---

## Diapositiva 3. Problemática

**Título**
Problemática detectada

**Contenido**
- Documentos dispersos en computadoras individuales.
- Duplicidad de archivos y falta de control de versiones.
- Búsqueda lenta y dependiente del conocimiento de cada persona.
- Dificultad para auditorías y consulta histórica.
- Gestión manual de accesos y permisos.

**Qué decir**
La problemática no era solo tecnológica. También afectaba productividad, control interno y preparación para auditorías. Cada búsqueda tomaba tiempo y existía el riesgo de trabajar con documentos incorrectos o desactualizados.

**Captura sugerida**
- No necesaria.
- Si quieres, una diapositiva tipo esquema simple del “antes”.

---

## Diapositiva 4. Objetivo general y específicos

**Título**
Objetivo general y objetivos específicos

**Objetivo general**
Diseñar e implementar un sistema digital de gestión documental que centralice la documentación, controle versiones, administre accesos por rol y facilite la búsqueda y trazabilidad de documentos en Central El Potrero.

**Objetivos específicos**
- Centralizar documentos y versiones en una sola plataforma.
- Implementar autenticación, registro y control de acceso.
- Incorporar flujo de revisión y aprobación documental.
- Habilitar búsqueda avanzada por texto y filtros.
- Registrar auditoría de acciones relevantes del sistema.

**Qué decir**
El objetivo no fue únicamente almacenar archivos, sino controlar el ciclo documental completo: acceso, carga, revisión, aprobación, consulta y trazabilidad.

**Captura sugerida**
- No necesaria.

---

## Diapositiva 5. Metodología

**Título**
Metodología de trabajo

**Contenido**
- Se trabajó con enfoque iterativo usando Scrum.
- Organización por sprints semanales.
- Validación continua de requerimientos y cambios.
- Desarrollo incremental con pruebas funcionales.
- Ajustes rápidos conforme evolucionaron las reglas del negocio.

**Qué decir**
Se utilizó una metodología iterativa porque el proyecto cambió durante su desarrollo. Esto permitió incorporar nuevos requerimientos, mejorar UX y ajustar reglas del negocio sin perder continuidad.

**Captura sugerida**
- Si quieres, una tabla pequeña de sprints o un diagrama simple.

---

## Diapositiva 6. Arquitectura y tecnologías

**Título**
Arquitectura y tecnologías utilizadas

**Contenido**
- Frontend: React + Vite
- Backend: NestJS
- Base de datos: SQL Server
- Búsqueda: Elasticsearch
- OCR para PDFs escaneados
- Contenedores Docker para infraestructura local

**Resumen técnico**
- Aplicación web con separación frontend/backend
- Persistencia en SQL Server
- Indexación de documentos en Elasticsearch
- Flujo documental y permisos gestionados desde backend

**Qué decir**
La arquitectura se diseñó para separar responsabilidades. El frontend resuelve la interacción del usuario; el backend concentra reglas de negocio, seguridad y flujo documental; SQL Server almacena la información; y Elasticsearch acelera la búsqueda por texto y filtros.

**Captura sugerida**
- Si no tienes diagrama formal listo, usa una diapositiva con cajas simples:
  Frontend -> Backend -> SQL Server / Elasticsearch

---

## Diapositiva 7. Desarrollo de la solución

**Título**
Desarrollo de la solución

**Contenido**
- Registro de usuarios con verificación de correo.
- Aprobación administrativa de cuentas.
- Administración de permisos por usuario.
- Gestión de categorías, tipos documentales y áreas.
- Módulo unificado de administración de usuarios.
- Edición de perfil y actualización de datos personales.

**Qué decir**
Durante el desarrollo no solo se creó el módulo documental. También se construyó el ecosistema administrativo necesario para que el sistema fuera operable: registro, aprobación de cuentas, permisos, catálogos, usuarios y perfil.

**Captura sugerida**
- `/admin/users`
- `/profile`

---

## Diapositiva 8. Módulo documental

**Título**
Funcionalidad principal del sistema

**Contenido**
- Alta de documentos internos y no internos.
- Generación de código documental para documentos internos.
- Carga de nuevas versiones.
- Flujo de revisión y aprobación.
- Cambio de estado documental: borrador, en revisión, aprobado, obsoleto.
- Control de visibilidad por estado para usuarios normales.

**Qué decir**
El núcleo del proyecto es el módulo documental. Aquí se cargan documentos, se generan códigos cuando corresponde, se controlan versiones y se ejecuta el flujo de revisión y aprobación, manteniendo historial y estados del documento.

**Captura sugerida**
- Modal de “Nuevo documento”
- Detalle de documento con flujo y versiones

---

## Diapositiva 9. Búsqueda, OCR y auditoría

**Título**
Búsqueda inteligente, OCR y trazabilidad

**Contenido**
- Búsqueda avanzada por texto y filtros.
- Uso de Elasticsearch para acelerar consultas.
- OCR para extraer texto de documentos PDF escaneados.
- Registro de auditoría de acciones clave.
- Analítica para visualizar actividad del sistema.

**Qué decir**
Una parte importante del valor del sistema es la localización de información. No se limita a almacenar archivos: también permite encontrarlos mejor, indexarlos y rastrear quién hizo qué dentro de la plataforma.

**Captura sugerida**
- `/documents` con filtros
- `/admin/audit-logs`
- `/admin/analytics`

---

## Diapositiva 10. Resultados obtenidos

**Título**
Resultados obtenidos

**Contenido**
- Plataforma funcional para gestión documental.
- Centralización de documentos y versiones.
- Control de acceso por permisos.
- Flujo de aprobación documental operativo.
- Búsqueda avanzada y recuperación más rápida de documentos.
- Mayor trazabilidad para consulta y auditoría.

**Qué decir**
Como resultado se obtuvo un sistema funcional que resuelve la necesidad principal de centralización documental y, además, mejora control, consulta, auditoría y administración de usuarios.

**Captura sugerida**
- Dashboard o conjunto de 2-3 pantallas clave

---

## Diapositiva 11. Valor para la empresa

**Título**
Impacto para Central El Potrero

**Contenido**
- Reduce tiempo de búsqueda de documentos.
- Disminuye uso de versiones incorrectas.
- Mejora el control sobre revisiones y aprobaciones.
- Facilita auditorías y seguimiento de acciones.
- Deja una base ordenada para crecimiento futuro del sistema.

**Qué decir**
El impacto más importante es operativo: la información queda más ordenada, más localizable y con mejor control. Esto reduce errores y fortalece la gestión documental del área.

**Captura sugerida**
- No necesaria.

---

## Diapositiva 12. Trabajos futuros

**Título**
Trabajos futuros

**Contenido**
- Mejorar reportes e indicadores.
- Fortalecer automatizaciones del flujo documental.
- Seguir refinando experiencia de usuario.
- Extender uso del sistema a más áreas.
- Continuar evolución de búsqueda inteligente y analítica.

**Qué decir**
El proyecto quedó funcional, pero también deja una base clara para evolución. La plataforma puede crecer hacia más automatización, más áreas y más inteligencia en la consulta documental.

**Captura sugerida**
- No necesaria.

---

## Diapositiva 13. Cierre

**Título**
Gracias por su atención

**Contenido**
- Espacio para preguntas

**Qué decir**
Con esto concluyo la presentación. Muchas gracias por su atención. Quedo atento a sus preguntas.

---

## Recomendaciones para exponer

- No leas todo el texto de la diapositiva.
- Habla en términos de problema -> solución -> resultado.
- Enfatiza que fue un proyecto real con cambios de requerimientos.
- Cuando muestres capturas, explica qué resuelve cada módulo.
- Si te preguntan por tecnologías, responde primero la razón de uso:
  - React: interfaz
  - NestJS: reglas de negocio y API
  - SQL Server: persistencia
  - Elasticsearch: búsqueda
  - OCR: extracción de texto

---

## Orden sugerido de capturas

1. Login
2. Registro/verificación
3. Administración de usuarios
4. Carga de documento
5. Vista de documentos
6. Detalle con flujo y versiones
7. Auditoría
8. Analítica

---

## Qué conviene NO meter

- Párrafos largos
- Demasiadas tablas de la tesina
- Texto académico extenso en diapositivas
- Detalle técnico excesivo de base de datos
- Demasiados sprints uno por uno
