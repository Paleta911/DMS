# DMS Frontend

## Requisitos
- Node.js 18+
- Backend corriendo en http://localhost:3000

## Variables de entorno
Crea un archivo `.env` en la raiz del frontend:

```
VITE_API_URL=http://localhost:3000
```

## Como correr (dev)
```
npm install
npm run dev
```

## Build
```
npm run build
npm run preview
```

## Checklist de demo
- Login con usuario valido
- Documentos: listar, filtrar, abrir detalle
- Descargar version desde detalle
- Workflow: enviar/revisar/aprobar (segun rol)
- Buscar: verificar badge `engine` (elastic/fallback)
- Admin: categorias CRUD
- Admin: usuarios/areas (con userId)
- Admin: auditoria

## Troubleshooting
- CORS: el backend debe permitir http://localhost:5173
- 401: expiro token -> cerrar sesion y volver a login
- 403: acceso denegado por rol o areas asignadas
- Elasticsearch down: /search funciona en fallback y muestra `engine=fallback`

## Responsividad
- Usa `PageContainer` + `PageHeader` para estructurar pantallas.
- Usa `SectionCard` para bloques con borde/padding consistente.
- Usa `ResponsiveTable` para listas/tablas (cards en mobile, tabla en desktop).
- Usa `ResponsiveActions` para agrupar botones (stack en mobile, fila en desktop).

Patron recomendado:
```
<PageContainer>
  <PageHeader title="..." actions={<ResponsiveActions>...</ResponsiveActions>} />
  <SectionCard>...</SectionCard>
</PageContainer>
```

## Logo BSM
Logo BSM: `src/assets/brand/logo-bsm.png` (nombre exacto: `logo-bsm.png`).
