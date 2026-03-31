# Auditoria de accesibilidad

Este documento resume la base de accesibilidad implementada y el criterio de validacion aplicado en el frontend.

## Objetivo

Garantizar operacion usable con:
- teclado
- foco visible
- lectores de pantalla
- tablas responsivas
- modo oscuro

## Medidas implementadas

### Navegacion y landmarks
- enlace “Saltar al contenido”
- `main` identificable por `id="main-content"`
- navegacion principal con `aria-label`
- estados de backend en `role="status"`

### Foco y teclado
- estilos `:focus-visible` globales
- modales con trampa de foco
- restauracion de foco al cerrar modales
- botones moviles con `aria-expanded` / `aria-controls`

### Formularios
- `Input`, `Select` y `Textarea` enlazan `label` e `id`
- `aria-invalid` y `aria-describedby` en estados de error
- mensajes claros orientados a siguiente accion

### Tablas responsivas
- `ResponsiveTable` usa `caption` accesible
- lista movil con `aria-label`
- estructura de tarjetas preserva contexto de columnas

### Estados semanticos
- `Spinner` con `role="status"`
- `NoticeBanner` con `role="status"` o `role="alert"`
- `AccessDenied` y `EmptyState` con secciones semanticas

### Tema
- modo claro / oscuro persistente
- boton accesible para alternar tema
- `data-theme` + `color-scheme` actualizados en `documentElement`

## Evidencia automatizada

Pruebas relevantes:
- `src/components/AppShell.test.tsx`
- `src/components/ui/FormControls.test.tsx`
- `src/components/ui/Modal.test.tsx`
- `src/components/ui/ResponsiveTable.test.tsx`
- `src/components/ui/Spinner.test.tsx`
- `src/theme/ThemeProvider.test.tsx`

Estas cubren:
- skip link
- landmarks
- etiquetas accesibles
- foco y tabulacion
- tablas adaptativas
- spinner/avisos
- persistencia y alternancia de modo oscuro

## Cobertura funcional revisada

Rutas y zonas revisadas durante el ajuste:
- `/login`
- `/register`
- `/verify-email`
- `/documents`
- `/documents/:id`
- `/profile`
- `/permissions/request`
- `/admin/registrations`
- `/admin/permission-requests`
- `/admin/audit-logs`
- `/admin/users-areas`
- `/admin/types-areas`
- `/admin/categories`

## Checklist operativo

Antes de liberar cambios visuales, validar:
1. se puede navegar por teclado
2. el foco siempre es visible
3. los modales no “pierden” el foco
4. los mensajes de error son legibles por lector de pantalla
5. el modo oscuro mantiene legibilidad
6. las tablas moviles conservan contexto
