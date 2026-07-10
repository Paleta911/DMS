# Contribuir

Este proyecto acepta contribuciones mediante Pull Request. La rama `main` representa el estado estable del repositorio.

## Reglas de Ramas

- `main` está protegida.
- `Paleta911` es el owner y mantenedor principal del repositorio.
- El owner puede hacer push directo a `main` cuando sea necesario.
- Los colaboradores no deben hacer push directo a `main`.
- Cada colaborador debe trabajar desde una rama propia.

## Flujo Recomendado

```powershell
git switch main
git pull origin main
git switch -c feature/mi-cambio
```

Después de hacer cambios:

```powershell
git add .
git commit -m "Describe el cambio"
git push -u origin feature/mi-cambio
```

Luego se abre un Pull Request hacia `main`.

## Pull Requests

Todo Pull Request debe cumplir:

- Apuntar a `main`.
- Tener una descripción clara del cambio.
- Mantener la documentación actualizada si el cambio afecta instalación, seguridad, API, flujo funcional o despliegue.
- No incluir credenciales reales, archivos `.env`, logs locales ni artefactos temporales.
- Pasar las validaciones de CI antes de fusionarse.
- Esperar revisión y aprobación del owner.

## Responsabilidad de Revisión

El archivo `.github/CODEOWNERS` define a `@Paleta911` como responsable de revisión de todo el repositorio. Esto hace que las contribuciones externas requieran aprobación del owner antes de fusionarse.

## Seguridad

No publiques secretos, tokens, contraseñas, cadenas de conexión reales ni archivos `.env`.

Si detectas una credencial expuesta:

1. No la reutilices.
2. Revócala en el servicio correspondiente.
3. Genera una nueva.
4. Actualiza el entorno seguro donde deba vivir.
