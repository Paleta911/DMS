# -*- coding: utf-8 -*-
import os
import re
import shutil
import sys
import textwrap
from pathlib import Path

import pythoncom
from PIL import Image, ImageDraw, ImageFont
from win32com.client import DispatchEx, constants

sys.stdout.reconfigure(encoding='utf-8')

LOG_PATH = Path(r'c:\Users\alexi\DMS\tmp_adjust_tesina_semana9.log')

def log(msg):
    with LOG_PATH.open('a', encoding='utf-8') as f:
        f.write(msg + '\n')

BASE_DIR = Path(r"C:\Users\alexi\Documents\Estadías\estadias\PARA _CODEX")
DOC_PATH = BASE_DIR / "Estadías v2.9.docx"
BACKUP_PATH = BASE_DIR / "Estadías v2.9 - respaldo antes semana 9.docx"
ARCH_IMG = BASE_DIR / "_anexo_arquitectura_semana9.png"
ERD_IMG = BASE_DIR / "_anexo_erd_semana9.png"

PROJECT_TITLE = "Sistema digital de gestión documental para el área de Calidad de Central El Potrero"
COVER_DATE = "CUITLÁHUAC, VER.                                                                            MARZO, 2026"

AGRADECIMIENTOS = (
    "Agradezco a la Universidad Tecnológica del Centro de Veracruz por la formación recibida durante esta etapa. "
    "De manera especial, agradezco a mi asesora académica, Mtra. Estefanía Pulido Álvarez, por el seguimiento y las observaciones "
    "que ayudaron a dar forma a este trabajo; y a mi asesora industrial, Ing. Karina Jael López Burgoa, por la apertura para desarrollar "
    "el proyecto dentro de Central El Potrero. También agradezco al personal del área de Calidad por compartir información del proceso documental "
    "y por la disposición mostrada durante el levantamiento de requerimientos. Finalmente, reconozco el apoyo de mi familia, cuya confianza fue "
    "importante para concluir esta etapa."
)

RESUMEN = (
    "El presente reporte documenta el desarrollo de un sistema digital de gestión documental para el área de Calidad de Central El Potrero. "
    "El problema identificado al inicio de la estadía fue la existencia de documentos dispersos, duplicidad de archivos, dificultad para localizar la "
    "versión vigente y poca trazabilidad en revisiones y aprobaciones. Con base en ese diagnóstico, se definió como objetivo general diseñar e implementar "
    "una solución web que centralizara la documentación, controlara versiones, administrara accesos por rol y ofreciera búsqueda avanzada.\n\n"
    "El proyecto se desarrolló con Scrum y, al corte de la semana 9 del cronograma, se concluyeron el análisis del problema, la definición del MVP, la arquitectura "
    "general, el modelo de base de datos, la configuración del entorno, la implementación del backend base, la autenticación con JWT, la gestión documental inicial, "
    "el control de versiones y la integración de Elasticsearch para la búsqueda por filtros. El sistema utiliza React en el frontend, NestJS en el backend, SQL Server como "
    "base de datos y Elasticsearch como motor de consulta. Como resultado parcial, se obtuvo una plataforma funcional capaz de cargar documentos, registrar metadatos, mantener "
    "historial de versiones y localizar información de manera más eficiente. La implementación de OCR para documentos escaneados, la validación formal con usuarios y el cierre "
    "documental corresponden a etapas posteriores del cronograma."
)

CAP2_REWRITE = """
2.2 Metodología de desarrollo
Para el desarrollo del sistema se empleó la metodología Scrum, ya que permitió organizar el trabajo en entregas cortas, revisar avances de manera frecuente y ajustar prioridades conforme surgían hallazgos técnicos o del proceso documental. En el contexto de la estadía, cada sprint se hizo equivalente a una semana oficial de trabajo, de modo que la planeación del proyecto y el avance de la tesina permanecieran alineados.

2.2.1 Roles en Scrum
Debido a que el proyecto fue desarrollado por una sola persona, los roles de Product Owner, Scrum Master y equipo de desarrollo se concentraron en el mismo integrante. Aun así, se conservó el propósito de cada rol: priorizar necesidades, dar seguimiento al proceso y construir el incremento técnico de cada semana.

2.2.2 Eventos de Scrum
En cada sprint se mantuvo una secuencia básica de trabajo: definición del objetivo semanal, ejecución de tareas técnicas, revisión del incremento logrado y retrospectiva breve para ajustar la semana siguiente. Esta adaptación permitió dar seguimiento realista al proyecto sin perder la estructura del marco ágil.

2.2.3 Artefactos y entregables
Los artefactos utilizados fueron el backlog de trabajo, el backlog semanal y el incremento resultante de cada sprint. Como evidencia documental se generaron notas de avance, capturas del sistema, resultados de pruebas, consultas de validación y los apartados de la tesina desarrollados semana a semana.

2.3 Plan de trabajo por sprints
El proyecto se organizó en quince sprints semanales, correspondientes al periodo oficial de estadía comprendido del 5 de enero al 19 de abril de 2026. Esta decisión permitió que cada semana tuviera una meta técnica específica y, al mismo tiempo, un entregable académico asociado. Al corte de este documento, el desarrollo descrito llega hasta la semana 9, punto en el que el sistema ya cuenta con autenticación, gestión documental base, control de versiones y búsqueda avanzada con Elasticsearch.

2.4 Técnicas e instrumentos de recolección de información
Para el diagnóstico y la validación se emplearon entrevistas semiestructuradas, observación directa del flujo documental y registro de métricas técnicas. Las entrevistas ayudaron a identificar puntos de dolor y necesidades del área; la observación permitió entender el flujo real de creación, revisión, aprobación y consulta de documentos; y el registro de métricas se utilizó para documentar compilaciones, pruebas, tiempos de respuesta y comportamiento del sistema en escenarios críticos.

2.5 Criterios de evaluación (indicadores)
Los criterios de evaluación se centraron en la reducción de tiempos de localización de documentos, la disminución de errores relacionados con versiones, el comportamiento del sistema durante pruebas funcionales y la percepción de uso por parte de los involucrados. Estos criterios sirvieron como referencia para valorar si el sistema avanzaba en la dirección correcta.

2.6 Herramientas de apoyo para implementar la metodología
Como herramientas de apoyo se utilizaron Git para el control de versiones del código, Visual Studio Code y Word para desarrollo y documentación, además de utilerías de seguimiento y mensajería institucional según la disponibilidad del entorno. En la parte técnica, se trabajó con React, NestJS, SQL Server y Elasticsearch.

2.7 Lugar, tiempo y elementos de estudio
El proyecto se desarrolló en el Ingenio Central El Potrero, específicamente tomando como referencia el área de Calidad. El periodo formal de estadía comprende quince semanas, del 5 de enero al 19 de abril de 2026. El objeto de estudio fue el proceso de gestión documental del área, mientras que los sujetos de estudio fueron las personas que participan o interactúan con dicho flujo, principalmente en actividades de consulta, resguardo, actualización, revisión y aprobación de documentos. Como apoyo visual del seguimiento se utilizó un tablero semanal de sprint, lo que permitió ubicar actividades pendientes, en curso y concluidas sin perder la relación entre las tareas técnicas y la redacción de la tesina.
"""

CAP3_REWRITE = """
En este capítulo se presenta el desarrollo del proyecto conforme al cronograma realmente ejecutado durante las primeras nueve semanas de estadía. Cada sprint correspondió a una semana oficial de trabajo y produjo un incremento técnico o una definición funcional que permitió continuar con la construcción del sistema.

Por consistencia con el proyecto real, este corte no incluye la semana 10 ni actividades posteriores que todavía no se han implementado en el sistema. Por esa razón, el contenido llega hasta la integración de Elasticsearch para búsqueda avanzada y filtros.

3.1 Sprint 1 / Semana 1 (05-11 enero 2026)
Durante la primera semana se realizó la inducción en la empresa y el levantamiento inicial del proceso documental. La observación del trabajo cotidiano del área permitió identificar cómo se generaban los documentos, quién los resguardaba, cómo se compartían y qué problemas aparecían cuando se necesitaba recuperar una versión específica.

El hallazgo principal fue que la información se encontraba dispersa en carpetas y archivos duplicados, con poca claridad sobre la versión vigente y sin un rastro confiable de cambios, revisiones o aprobaciones. A partir de ello se delimitó el problema central y se estableció el alcance inicial del sistema: centralizar documentos, controlar versiones, administrar accesos y facilitar la búsqueda.

El cierre del sprint dejó una base clara para continuar. Ya se entendía el flujo actual, se reconocían los puntos de dolor prioritarios y se tenía un primer marco funcional y técnico sobre el cual construir el MVP.

3.2 Sprint 2 / Semana 2 (12-18 enero 2026)
Con el problema ya definido, la segunda semana se dedicó al análisis de requerimientos funcionales y no funcionales, así como a la delimitación del alcance del MVP. En esta etapa se revisó qué funciones eran indispensables para resolver el problema detectado y cuáles podían dejarse para una etapa posterior.

Como resultado se estableció un MVP centrado en autenticación, gestión documental, control de versiones, búsqueda, catálogos básicos y auditoría. También se identificaron los requisitos no funcionales más relevantes: seguridad, integridad de la información, trazabilidad, mantenibilidad y facilidad de uso.

Este sprint fue importante porque evitó inflar el alcance desde el principio y permitió ordenar el desarrollo sobre una base realista.

3.3 Sprint 3 / Semana 3 (19-25 enero 2026)
La tercera semana se concentró en definir la arquitectura general del sistema. Se optó por una arquitectura cliente-servidor por capas, con React en el frontend, NestJS en el backend, SQL Server para la persistencia transaccional y Elasticsearch como motor de búsqueda especializada. La representación general de esta solución puede consultarse en el Anexo A.

Una decisión importante de esta etapa fue mantener al backend como fuente de verdad de la lógica de negocio y utilizar Elasticsearch como componente complementario, no como origen principal de los datos. Esta separación permitió prever un modo de operación alterno cuando el motor de búsqueda no estuviera disponible.

El resultado del sprint fue un diseño arquitectónico coherente, suficientemente claro para comenzar la implementación sin perder de vista seguridad, mantenibilidad y crecimiento futuro.

3.4 Sprint 4 / Semana 4 (26 enero-01 febrero 2026)
Durante la cuarta semana se diseñó el modelo de datos en SQL Server y se validó su correspondencia con los procesos definidos. El trabajo no se limitó a listar tablas; también se definieron relaciones, reglas de borrado y criterios de integridad para evitar inconsistencias desde la base del sistema. El modelo entidad-relación general se presenta en el Anexo B.

Se estructuraron entidades para documentos, versiones, aprobaciones, auditoría, usuarios, áreas y catálogos. Además, se consideraron estados y relaciones necesarias para soportar trazabilidad, gobierno documental y control de acceso.

Al concluir el sprint ya se contaba con un esquema que podía llevarse a migraciones y servir como soporte real para los siguientes incrementos del backend.

3.5 Sprint 5 / Semana 5 (02-08 febrero 2026)
En la quinta semana se preparó el entorno de desarrollo y se generó la base del backend con NestJS. Esta etapa fue relevante porque permitió estandarizar dependencias, forma de arranque, estructura de carpetas y punto de entrada del sistema.

También se dejó lista una organización modular que después facilitó separar dominios como autenticación, usuarios, documentos, búsqueda y auditoría. Aunque en esta semana no se implementaron todavía funciones de negocio complejas, sí se estableció la base técnica sobre la cual se construyeron los sprints siguientes.

El resultado fue un backend funcional, compilable y capaz de crecer por módulos sin rehacer la estructura del proyecto.

3.6 Sprint 6 / Semana 6 (09-15 febrero 2026)
Durante la sexta semana se implementó la autenticación mediante JWT y se definieron los primeros mecanismos de control de acceso. Esto permitió pasar de un backend base a un sistema que ya podía distinguir usuarios, proteger rutas y empezar a modelar perfiles de uso.

Además del inicio de sesión y la emisión de tokens, se trabajó en la administración básica de usuarios y en la lógica inicial de roles y permisos. Esta parte resultó clave porque todo el flujo documental posterior depende de que las acciones del sistema estén asociadas a identidad y privilegios concretos.

El sprint cerró con una base segura para habilitar carga de documentos, versionado y búsqueda sin perder control sobre quién puede consultar, registrar o modificar información.

3.7 Sprint 7 / Semana 7 (16-22 febrero 2026)
En la séptima semana se incorporó la gestión documental base. Se habilitó la carga de archivos, el almacenamiento controlado y la persistencia de metadatos esenciales para identificar cada documento dentro del sistema.

Esta etapa resolvió el primer flujo de valor visible: registrar un documento y poder consultarlo de manera centralizada. También permitió definir mejor la relación entre la información del archivo y sus datos descriptivos, como nombre, código, tipo, categoría y área.

Con este sprint el proyecto dejó de ser solo estructura y seguridad; pasó a tener una funcionalidad concreta que ya respondía al problema inicial de dispersión documental.

3.8 Sprint 8 / Semana 8 (23 febrero-01 marzo 2026)
Durante la octava semana se desarrolló el control de versiones y el historial de cambios. El objetivo fue evitar la sobrescritura silenciosa de documentos y conservar un registro claro de la evolución de cada archivo.

Se habilitó la carga de nuevas versiones sobre un mismo documento, manteniendo el historial previo y asociando a cada versión su fecha, responsable y comentario de cambio. Esta decisión respondió directamente a uno de los problemas más frecuentes detectados al inicio de la estadía: no saber con certeza cuál era la versión vigente o quién había modificado un archivo.

Al cierre de la semana, el sistema ya no solo almacenaba documentos; también permitía rastrear su evolución y sentaba la base para una trazabilidad más sólida en revisiones y aprobaciones posteriores.

3.9 Sprint 9 / Semana 9 (02-08 marzo 2026)
En la novena semana se integró Elasticsearch para fortalecer la búsqueda avanzada del sistema. Hasta ese punto ya existía gestión documental, pero hacía falta una forma más ágil de localizar información por texto y filtros sin depender exclusivamente de consultas básicas.

Se implementó la indexación de documentos y se añadieron filtros por campos relevantes como tipo, categoría y área. Además, se mantuvo una estrategia de respaldo para que el sistema continuara operando aunque el motor de búsqueda no estuviera disponible temporalmente.

El resultado de este sprint fue un sistema más cercano a las necesidades reales del área de Calidad: no solo guarda y versiona documentos, sino que también ayuda a encontrarlos con mayor rapidez y precisión.
"""

CAP4_REWRITE = """
Los resultados que se presentan en este capítulo corresponden al avance acumulado hasta la semana 9 del cronograma. A ese corte, el sistema ya cuenta con una arquitectura cliente-servidor definida, un modelo de base de datos validado y una base funcional capaz de sostener el flujo documental principal.

4.1 Resultados
En términos funcionales, se logró implementar autenticación con JWT, control inicial de usuarios y roles, carga de documentos con almacenamiento controlado, persistencia de metadatos, control de versiones e integración de Elasticsearch para búsqueda avanzada y filtros. Esto representa un avance significativo frente al escenario original, donde la documentación se encontraba dispersa y con poca trazabilidad.

También se obtuvo evidencia técnica mediante compilaciones, pruebas de humo, validación del modelo de datos y revisión de los flujos principales del sistema. Aunque el proyecto aún no se encuentra en cierre definitivo, el incremento alcanzado hasta este punto permite demostrar la viabilidad técnica y funcional de la propuesta.

4.2 Trabajos Futuros
Las actividades que quedan fuera de este corte corresponden principalmente a la implementación de OCR para documentos PDF escaneados, la validación funcional con usuarios, la documentación final de uso, la capacitación del personal y el cierre formal del proyecto. Estas actividades forman parte de las semanas posteriores del cronograma y se consideran necesarias para completar la adopción del sistema en el entorno real.

4.3 Recomendaciones
Como recomendación inmediata, conviene mantener el desarrollo por incrementos pequeños y validar cada nueva funcionalidad contra el flujo real del área de Calidad. También resulta importante conservar la evidencia técnica de pruebas y cambios, ya que esto facilita tanto la escritura de la tesina como la defensa del proyecto. Finalmente, cualquier ampliación del sistema debería priorizar la estabilidad del flujo documental antes de incorporar funciones complementarias.
"""

ANNEX_REWRITE = """
Los anexos incluidos en este reporte reúnen los elementos gráficos que, por tamaño y nivel de detalle, se consultan mejor fuera del cuerpo principal del documento.

Anexo A. Arquitectura general del sistema
<<FIGURA_ARQ>>
Figura 1. Arquitectura general del sistema DMS SIG.
Fuente: elaboración propia.

Anexo B. Modelo entidad-relación del sistema
<<FIGURA_ERD>>
Figura 2. Modelo entidad-relación general del sistema DMS SIG.
Fuente: elaboración propia.
"""


def clean_text(value: str) -> str:
    return value.replace('\r', '').replace('\x07', '').strip()


def to_word_text(block: str) -> str:
    normalized = textwrap.dedent(block).strip() + "\n"
    return normalized.replace("\n", "\r")


def create_architecture_image(path: Path):
    w, h = 1800, 900
    bg = '#f7f9fc'
    img = Image.new('RGB', (w, h), bg)
    draw = ImageDraw.Draw(img)
    title_font = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 42)
    label_font = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 30)
    text_font = ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 24)

    draw.text((w//2, 60), 'Arquitectura general del sistema DMS SIG', anchor='mm', font=title_font, fill='#183153')

    boxes = [
        ((110, 320, 420, 500), '#dbeafe', 'Usuario', 'Consulta, registra y da seguimiento'),
        ((520, 300, 920, 520), '#e0f2fe', 'Frontend', 'React + Vite\nInterfaz, formularios y navegación'),
        ((1030, 270, 1430, 550), '#dcfce7', 'Backend', 'NestJS\nReglas de negocio, seguridad\ny orquestación'),
        ((1520, 180, 1710, 360), '#fee2e2', 'SQL Server', 'Persistencia transaccional'),
        ((1520, 470, 1710, 650), '#fef3c7', 'Elasticsearch', 'Búsqueda avanzada e indexación'),
    ]

    for (x1, y1, x2, y2), color, title, subtitle in boxes:
        draw.rounded_rectangle((x1, y1, x2, y2), radius=28, fill=color, outline='#94a3b8', width=3)
        draw.text(((x1+x2)//2, y1+55), title, anchor='mm', font=label_font, fill='#0f172a')
        draw.multiline_text(((x1+x2)//2, (y1+y2)//2+15), subtitle, anchor='mm', font=text_font, fill='#334155', align='center', spacing=8)

    def arrow(points, label):
        draw.line(points, fill='#2563eb', width=8)
        x1, y1, x2, y2 = points
        draw.polygon([(x2, y2), (x2-20, y2-12), (x2-20, y2+12)], fill='#2563eb')
        draw.rounded_rectangle(( (x1+x2)//2 - 95, (y1+y2)//2 - 30, (x1+x2)//2 + 95, (y1+y2)//2 + 30 ), radius=12, fill='#ffffff', outline='#cbd5e1')
        draw.text(((x1+x2)//2, (y1+y2)//2), label, anchor='mm', font=text_font, fill='#1e3a8a')

    arrow((420, 410, 520, 410), 'Uso web')
    arrow((920, 410, 1030, 410), 'HTTP / JSON')
    arrow((1430, 320, 1520, 270), 'ORM / SQL')
    arrow((1430, 500, 1520, 560), 'Índice / búsqueda')

    draw.text((w//2, 820), 'El backend concentra la seguridad, la lógica de negocio y la comunicación con la base de datos y el motor de búsqueda.', anchor='mm', font=text_font, fill='#475569')
    img.save(path)


def create_erd_image(path: Path):
    w, h = 2100, 1300
    img = Image.new('RGB', (w, h), '#f8fafc')
    draw = ImageDraw.Draw(img)
    title_font = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 40)
    head_font = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 24)
    text_font = ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 20)
    small_font = ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 18)

    draw.text((w//2, 50), 'Modelo entidad-relación general del sistema', anchor='mm', font=title_font, fill='#1e293b')

    boxes = {
        'user': ((140, 180, 430, 340), '#ede9fe', ['id (PK)', 'email', 'role', 'status']),
        'email_verification': ((560, 180, 930, 340), '#e0f2fe', ['id (PK)', 'userId (FK)', 'codeHash', 'expiresAt']),
        'permission_request': ((1060, 180, 1450, 360), '#fee2e2', ['id (PK)', 'userId (FK)', 'reviewedById (FK)', 'status']),
        'audit_log': ((1550, 180, 1900, 340), '#dcfce7', ['id (PK)', 'userId (FK)', 'action', 'createdAt']),
        'category': ((140, 520, 430, 650), '#fde68a', ['id (PK)', 'nombre', 'isArchived']),
        'document_type': ((540, 500, 900, 670), '#fef3c7', ['id (PK)', 'code', 'nombreLargo', 'isArchived']),
        'area_code': ((1020, 500, 1370, 670), '#dbeafe', ['id (PK)', 'code', 'nombre', 'isArchived']),
        'user_area_codes': ((1470, 500, 1870, 650), '#e9d5ff', ['userId (FK)', 'areaCodeId (FK)']),
        'document': ((520, 860, 900, 1080), '#ccfbf1', ['id (PK)', 'categoryId (FK)', 'documentTypeId (FK)', 'areaCodeId (FK)', 'createdById (FK)']),
        'version': ((1000, 900, 1320, 1080), '#fee2e2', ['id (PK)', 'documentId (FK)', 'uploadedById (FK)', 'createdAt']),
        'document_approval': ((1450, 860, 1900, 1080), '#dbeafe', ['id (PK)', 'documentId (FK)', 'userId (FK)', 'step', 'decision']),
    }

    def box(name, rect, color, fields):
        x1, y1, x2, y2 = rect
        draw.rounded_rectangle(rect, radius=22, fill=color, outline='#94a3b8', width=3)
        draw.rectangle((x1, y1, x2, y1+42), fill='#1e293b')
        draw.text((x1+18, y1+21), name, anchor='lm', font=head_font, fill='white')
        y = y1 + 68
        for field in fields:
            draw.text((x1+18, y), field, anchor='lm', font=text_font, fill='#334155')
            y += 32

    for name, (rect, color, fields) in boxes.items():
        box(name, rect, color, fields)

    def connect(a_name, b_name, label=''):
        ax1, ay1, ax2, ay2 = boxes[a_name][0]
        bx1, by1, bx2, by2 = boxes[b_name][0]
        start = ((ax1+ax2)//2, ay2)
        end = ((bx1+bx2)//2, by1)
        draw.line((start[0], start[1], start[0], start[1]+40, end[0], end[1]-40, end[0], end[1]), fill='#2563eb', width=5)
        if label:
            lx = (start[0]+end[0])//2
            ly = (start[1]+end[1])//2
            draw.rounded_rectangle((lx-45, ly-18, lx+45, ly+18), radius=9, fill='white', outline='#cbd5e1')
            draw.text((lx, ly), label, anchor='mm', font=small_font, fill='#1e40af')

    connect('user', 'email_verification', '1:1')
    connect('user', 'permission_request', '1:N')
    connect('user', 'audit_log', '1:N')
    connect('category', 'document', '1:N')
    connect('document_type', 'document', '1:N')
    connect('area_code', 'document', '1:N')
    connect('area_code', 'user_area_codes', '1:N')
    connect('user', 'user_area_codes', '1:N')
    connect('document', 'version', '1:N')
    connect('document', 'document_approval', '1:N')

    draw.text((w//2, 1230), 'El modelo organiza documentos, versiones, aprobaciones, auditoría, usuarios, áreas y solicitudes de permisos dentro de un esquema relacional centralizado.', anchor='mm', font=small_font, fill='#475569')
    img.save(path)


def set_body_format(paragraph):
    rng = paragraph.Range
    rng.Font.Name = 'Arial'
    rng.Font.Size = 11
    rng.Font.Bold = False
    rng.Font.Color = 0
    rng.ParagraphFormat.Alignment = constants.wdAlignParagraphJustify
    rng.ParagraphFormat.LineSpacingRule = constants.wdLineSpace1pt5
    rng.ParagraphFormat.SpaceAfter = 6
    rng.ParagraphFormat.SpaceBefore = 0


def set_heading_format(paragraph, level):
    rng = paragraph.Range
    rng.Font.Name = 'Arial'
    rng.Font.Bold = True
    rng.Font.Color = 0
    if level == 1:
        rng.Font.Size = 14
        rng.ParagraphFormat.Alignment = constants.wdAlignParagraphCenter
        rng.ParagraphFormat.SpaceBefore = 12
        rng.ParagraphFormat.SpaceAfter = 12
    elif level == 2:
        rng.Font.Size = 12
        rng.ParagraphFormat.Alignment = constants.wdAlignParagraphLeft
        rng.ParagraphFormat.SpaceBefore = 10
        rng.ParagraphFormat.SpaceAfter = 6
    else:
        rng.Font.Size = 11
        rng.ParagraphFormat.Alignment = constants.wdAlignParagraphLeft
        rng.ParagraphFormat.SpaceBefore = 8
        rng.ParagraphFormat.SpaceAfter = 4


def set_caption_format(paragraph, source=False):
    rng = paragraph.Range
    rng.Font.Name = 'Arial'
    rng.Font.Size = 10
    rng.Font.Bold = False if source else True
    rng.Font.Italic = False if not source else True
    rng.Font.Color = 0
    rng.ParagraphFormat.Alignment = constants.wdAlignParagraphCenter
    rng.ParagraphFormat.LineSpacingRule = constants.wdLineSpaceSingle
    rng.ParagraphFormat.SpaceAfter = 4
    rng.ParagraphFormat.SpaceBefore = 2


def find_paragraph(doc, text, exact=True, style_contains=None):
    for i in range(1, doc.Paragraphs.Count + 1):
        para = doc.Paragraphs(i)
        para_text = clean_text(para.Range.Text)
        style_name = str(para.Range.Style)
        matches = para_text == text if exact else text in para_text
        if matches and (style_contains is None or style_contains in style_name):
            return para
    raise RuntimeError(f'No se encontró el párrafo: {text}')


def replace_paragraph_text(doc, old_text, new_text):
    para = find_paragraph(doc, old_text, exact=False)
    para.Range.Text = new_text + '\r'
    return para


def replace_range(doc, start_para, end_para, text):
    rng = doc.Range(Start=start_para.Range.Start, End=end_para.Range.Start)
    rng.Text = to_word_text(text)
    return doc.Range(Start=start_para.Range.Start, End=start_para.Range.Start + len(to_word_text(text)))


def style_paragraphs_between(doc, start_pos, end_pos):
    numbered_heading2 = re.compile(r'^(1|2|3|4)\.\d+\s')
    numbered_heading3 = re.compile(r'^2\.2\.\d+\s')
    for i in range(1, doc.Paragraphs.Count + 1):
        para = doc.Paragraphs(i)
        if para.Range.Start < start_pos or para.Range.Start > end_pos:
            continue
        text = clean_text(para.Range.Text)
        style_name = str(para.Range.Style)
        if not text:
            continue
        if style_name.startswith('TDC') or 'Título TDC' in style_name:
            continue
        if text in {'AGRADECIMIENTOS', 'RESUMEN', 'CAPÍTULO 1. INTRODUCCIÓN', 'CAPÍTULO 2. METODOLOGÍA', 'CAPÍTULO 3. DESARROLLO DEL PROYECTO', 'CAPÍTULO 4. RESULTADOS Y CONCLUSIONES', 'ANEXOS', 'BIBLIOGRAFÍA'}:
            para.Range.Style = constants.wdStyleHeading1
            set_heading_format(para, 1)
        elif numbered_heading3.match(text):
            para.Range.Style = constants.wdStyleHeading3
            set_heading_format(para, 3)
        elif numbered_heading2.match(text) or text.startswith('Anexo '):
            para.Range.Style = constants.wdStyleHeading2
            set_heading_format(para, 2)
        elif text.startswith('Figura '):
            set_caption_format(para, source=False)
        elif text.startswith('Fuente:'):
            set_caption_format(para, source=True)
        else:
            para.Range.Style = constants.wdStyleNormal
            set_body_format(para)


def insert_picture_at_placeholder(doc, placeholder, image_path, width_cm=14):
    para = find_paragraph(doc, placeholder)
    start = para.Range.Start
    para.Range.Text = '\r'
    insert_range = doc.Range(Start=start, End=start)
    shape = doc.InlineShapes.AddPicture(FileName=str(image_path), LinkToFile=False, SaveWithDocument=True, Range=insert_range)
    shape.LockAspectRatio = True
    shape.Width = word.CentimetersToPoints(width_cm)
    pic_para = doc.Range(Start=start, End=start).Paragraphs(1)
    pic_para.Range.ParagraphFormat.Alignment = constants.wdAlignParagraphCenter
    pic_para.Range.ParagraphFormat.SpaceAfter = 4


if not BACKUP_PATH.exists():
    shutil.copy2(DOC_PATH, BACKUP_PATH)

log('backup ok')
create_architecture_image(ARCH_IMG)
create_erd_image(ERD_IMG)
log('images ok')

pythoncom.CoInitialize()
word = DispatchEx('Word.Application')
word.Visible = False
word.DisplayAlerts = 0

try:
    doc = word.Documents.Open(str(DOC_PATH), ReadOnly=False)
    log('doc open')

    # Cover and front matter replacements
    replace_paragraph_text(doc, 'Auditoría de seguridad', PROJECT_TITLE)
    replace_paragraph_text(doc, 'CUITLÁHUAC, VER.', COVER_DATE)
    replace_paragraph_text(doc, 'Apartado opcional destinado a agradecer a quienes contribuyeron', AGRADECIMIENTOS)
    replace_paragraph_text(doc, 'Breve explicación del contenido del reporte', RESUMEN)
    log('front matter ok')

    # Chapter title correction
    cap3_heading = find_paragraph(doc, 'DESARROLLO DEL PROYECTO', exact=False, style_contains='Título 1')
    cap3_heading.Range.Text = 'CAPÍTULO 3. DESARROLLO DEL PROYECTO\r'

    # Chapter 2 rewrite from 2.2 onwards
    cap22 = find_paragraph(doc, '2.2 Metodología de desarrollo')
    cap3_heading = find_paragraph(doc, 'DESARROLLO DEL PROYECTO', exact=False, style_contains='Título 1')
    replace_range(doc, cap22, cap3_heading, CAP2_REWRITE)
    log('chapter2 ok')

    # Ensure 2.1 is heading 2
    cap21 = find_paragraph(doc, '2.1 Enfoque y tipo de investigación')
    cap21.Range.Style = constants.wdStyleHeading2

    # Chapter 3 rewrite up to chapter 4
    cap3_heading = find_paragraph(doc, 'CAPÍTULO 3. DESARROLLO DEL PROYECTO', exact=True, style_contains='Título 1')
    cap4_heading = find_paragraph(doc, 'RESULTADOS Y CONCLUSIONES', exact=False)
    rng3 = doc.Range(Start=cap3_heading.Range.End, End=cap4_heading.Range.Start)
    rng3.Text = to_word_text(CAP3_REWRITE)
    log('chapter3 ok')

    # Chapter 4 rewrite up to annexes
    cap4_heading = find_paragraph(doc, 'RESULTADOS Y CONCLUSIONES', exact=False)
    anexos_heading = find_paragraph(doc, 'ANEXOS', exact=True)
    rng4 = doc.Range(Start=cap4_heading.Range.End, End=anexos_heading.Range.Start)
    rng4.Text = to_word_text(CAP4_REWRITE)
    log('chapter4 ok')

    # Annexes rewrite up to bibliography
    anexos_heading = find_paragraph(doc, 'ANEXOS', exact=True)
    biblio_heading = find_paragraph(doc, 'BIBLIOGRAFÍA', exact=False)
    rng_anx = doc.Range(Start=anexos_heading.Range.End, End=biblio_heading.Range.Start)
    rng_anx.Text = to_word_text(ANNEX_REWRITE)
    log('annex text ok')

    # Insert annex figures
    insert_picture_at_placeholder(doc, '<<FIGURA_ARQ>>', ARCH_IMG, width_cm=14.5)
    insert_picture_at_placeholder(doc, '<<FIGURA_ERD>>', ERD_IMG, width_cm=15.5)
    log('annex figures ok')

    # Page setup
    for i in range(1, doc.Sections.Count + 1):
        sec = doc.Sections(i)
        sec.PageSetup.TopMargin = word.CentimetersToPoints(2.5)
        sec.PageSetup.BottomMargin = word.CentimetersToPoints(2.5)
        sec.PageSetup.LeftMargin = word.CentimetersToPoints(3.5)
        sec.PageSetup.RightMargin = word.CentimetersToPoints(2.5)

    # Apply style formatting only to corrected ranges and front matter
    for key in ['AGRADECIMIENTOS', 'RESUMEN', 'CAPÍTULO 2. METODOLOGÍA', 'CAPÍTULO 3. DESARROLLO DEL PROYECTO', 'CAPÍTULO 4. RESULTADOS Y CONCLUSIONES', 'ANEXOS', 'BIBLIOGRAFÍA']:
        try:
            para = find_paragraph(doc, key, exact=False)
            set_heading_format(para, 1)
        except Exception:
            pass
    for key in ['2.1 Enfoque y tipo de investigación', '2.2 Metodología de desarrollo', '2.3 Plan de trabajo por sprints', '2.4 Técnicas e instrumentos de recolección de información', '2.5 Criterios de evaluación (indicadores)', '2.6 Herramientas de apoyo para implementar la metodología', '2.7 Lugar, tiempo y elementos de estudio', '3.1 Sprint 1 / Semana 1 (05-11 enero 2026)', '3.2 Sprint 2 / Semana 2 (12-18 enero 2026)', '3.3 Sprint 3 / Semana 3 (19-25 enero 2026)', '3.4 Sprint 4 / Semana 4 (26 enero-01 febrero 2026)', '3.5 Sprint 5 / Semana 5 (02-08 febrero 2026)', '3.6 Sprint 6 / Semana 6 (09-15 febrero 2026)', '3.7 Sprint 7 / Semana 7 (16-22 febrero 2026)', '3.8 Sprint 8 / Semana 8 (23 febrero-01 marzo 2026)', '3.9 Sprint 9 / Semana 9 (02-08 marzo 2026)', '4.1 Resultados', '4.2 Trabajos Futuros', '4.3 Recomendaciones', 'Anexo A. Arquitectura general del sistema', 'Anexo B. Modelo entidad-relación del sistema']:
        try:
            para = find_paragraph(doc, key, exact=True)
            set_heading_format(para, 2)
        except Exception:
            pass
    try:
        set_body_format(find_paragraph(doc, AGRADECIMIENTOS[:60], exact=False))
        set_body_format(find_paragraph(doc, 'El presente reporte documenta el desarrollo', exact=False))
    except Exception:
        pass
    numbered_heading2 = re.compile(r'^(2|3|4)\.\d+\s')
    for i in range(1, doc.Paragraphs.Count + 1):
        para = doc.Paragraphs(i)
        txt = clean_text(para.Range.Text)
        if not txt:
            continue
        if txt.startswith('Figura '):
            set_caption_format(para, source=False)
        elif txt.startswith('Fuente:'):
            set_caption_format(para, source=True)
        elif txt.startswith('2.2.1') or txt.startswith('2.2.2') or txt.startswith('2.2.3'):
            set_heading_format(para, 3)
        elif numbered_heading2.match(txt) or txt.startswith('Anexo '):
            set_heading_format(para, 2)
    log('format ok')

    # Update TOC and tables of figures
    try:
        for i in range(1, doc.TablesOfContents.Count + 1):
            doc.TablesOfContents(i).Update()
    except Exception:
        pass
    try:
        for i in range(1, doc.TablesOfFigures.Count + 1):
            doc.TablesOfFigures(i).Update()
    except Exception:
        pass

    log('updating fields')
    doc.Save()
    log('save ok')
    doc.Close(False)
finally:
    word.Quit()
    pythoncom.CoUninitialize()

print('Documento actualizado:', DOC_PATH)
print('Respaldo:', BACKUP_PATH)
print('Imágenes generadas:', ARCH_IMG.name, ERD_IMG.name)
