# Tuning de base de datos

Este documento resume los ajustes de indices y el procedimiento de analisis para validar consultas frecuentes del sistema.

## Objetivo

Reducir costo en consultas calientes de:
- documentos
- registros/admin
- catalogos activos
- auditoria
- solicitudes

## Migraciones relevantes

### Indices previos
El proyecto ya contaba con indices para llaves unicas y consultas base del dominio.

### Ajustes agregados

#### `20260309201000-AddCoverageIndexes`
Refuerza consultas frecuentes sobre:
- `document`
- `user_area_codes`
- `document_type`
- `area_code`

#### `20260310003000-AddCatalogArchiveAndNameIndexes`
Agrega:
- `category.activo`
- `IDX_category_activo_nombre`
- `IDX_document_type_activo_nombreLargo`
- `IDX_area_code_activo_nombre`
- `IDX_document_nombre_createdAt`

## Script de analisis

```powershell
cd C:\Users\alexi\DMS\backend
npm run db:analyze
```

El script:
1. obtiene conteos por tabla
2. ejecuta consultas representativas con tiempo medido
3. lista indices vigentes en tablas criticas

## Consultas representativas medidas

- documentos recientes
- documentos ordenados por nombre
- documentos por area
- registros por estado
- solicitudes pendientes
- auditoria reciente
- catalogos activos

## Criterio adoptado

No se agregan indices “por si acaso”. Solo se mantienen indices que respondan a:
- filtros server-side realmente usados
- ordenamientos frecuentes
- pantallas administrativas con paginacion

## Resultado esperado del tuning

- listados administrativos paginados sin full scans innecesarios
- catalogos activos filtrables por nombre/estado
- mejor costo para `ORDER BY nombre / createdAt`
- mejor respuesta en listados de documentos con filtros combinados

## Recomendacion operativa

Ejecutar `npm run db:analyze` despues de:
- nuevas migraciones
- crecimiento significativo del dataset
- cambios en filtros/ordenamientos del frontend

Si se observa una consulta caliente nueva, el siguiente paso correcto es:
1. capturar la consulta real
2. revisar plan de ejecucion
3. agregar indice dirigido
4. volver a medir
