# Respaldo y recuperacion de archivos

## Objetivo
Los archivos subidos al DMS deben sobrevivir a reinicios del backend y permitir recuperacion verificable.

## Almacenamiento
- `UPLOAD_DIR`: ruta activa de archivos del sistema.
- `BACKUP_DIR`: ruta donde se generan respaldos versionados.
- En despliegue release ambas rutas viven en volumenes persistentes.

## Scripts disponibles
```powershell
npm run storage:backup
npm run storage:verify -- .\backups\uploads-AAAA-MM-DDTHH-mm-ss-sssZ
npm run storage:restore -- .\backups\uploads-AAAA-MM-DDTHH-mm-ss-sssZ
```

## Estrategia recomendada
- Respaldo diario del volumen `uploads`.
- Verificacion automatica del manifiesto despues de cada respaldo.
- Conservacion minima: 7 respaldos diarios + 4 semanales.
- Restauracion solo despues de verificar checksums.

## Formato del respaldo
Cada respaldo genera:
- `data/`: copia exacta del arbol de archivos.
- `manifest.json`: lista de archivos con `sha256`, tamanos y metadatos.

## Flujo operativo
### Crear respaldo
```powershell
cd C:\Users\alexi\DMS\backend
npm run storage:backup
```

### Verificar respaldo
```powershell
npm run storage:verify -- .\backups\uploads-2026-03-10T12-00-00-000Z
```

### Restaurar respaldo
```powershell
npm run storage:restore -- .\backups\uploads-2026-03-10T12-00-00-000Z
```

## Recuperacion ante incidente
1. Detener el backend o bloquear nuevas cargas.
2. Seleccionar un backup verificado.
3. Ejecutar `storage:restore`.
4. Validar checksum del respaldo restaurado.
5. Levantar backend y probar descarga de una version conocida.

## Validacion minima
- El manifiesto debe reflejar el mismo numero de archivos del origen.
- `storage:verify` debe terminar con `ok`.
- Una descarga real desde `/versions/:id/download` debe funcionar despues de restaurar.
