# Frontend con React

## Para que existe el frontend

El frontend es la cara del sistema. Su funcion no es decidir reglas de negocio profundas, sino permitir que el usuario interactue con el sistema de manera clara y segura.

## Stack principal

El frontend usa:

- `React`
- `Vite`
- `TypeScript`
- `React Router`
- `React Query`
- `Tailwind CSS`
- componentes reutilizables

Tambien incorpora:

- modo oscuro,
- i18n formal,
- vistas guardadas,
- notificaciones,
- mejoras de accesibilidad.

## Que resuelve React aqui

React permite descomponer la interfaz en componentes. Eso evita repetir estructuras completas una y otra vez.

Por ejemplo:

- botones,
- inputs,
- selectores,
- modales,
- tablas responsivas,
- toolbars,
- banners de estado,
- centro de notificaciones.

## Que resuelve React Router

La aplicacion tiene varias rutas. Algunas publicas:

- `/login`
- `/register`
- `/verify-email`

Y otras privadas:

- `/documents`
- `/documents/:id`
- `/profile`
- `/permissions/request`

Y ademas rutas administrativas:

- `/admin/categories`
- `/admin/types-areas`
- `/admin/users-areas`
- `/admin/audit-logs`
- `/admin/registrations`
- `/admin/permission-requests`
- `/admin/permission-requests/:id`

Router organiza navegacion y proteccion de pantallas.

## Que resuelve React Query

React Query maneja datos remotos. Eso ayuda a:

- cachear respuestas;
- evitar refetch innecesario;
- invalidar queries cuando cambia algo;
- representar estados de carga y error;
- mejorar la experiencia de usuario.

En este proyecto se uso bastante para:

- documentos,
- catalogos,
- solicitudes,
- auditoria,
- registros admin.

## Estructura funcional del frontend

La estructura principal gira alrededor de:

- `pages`
- `components`
- `hooks`
- `api`
- `app`
- `theme`
- `features`
- `i18n`

### `pages`

Representan pantallas completas del sistema.

### `components`

Agrupan piezas reutilizables.

### `hooks`

Extraen logica de estado, persistencia, queries o comportamiento comun.

### `api`

Centraliza acceso a backend.

### `theme`

Gestiona modo claro/oscuro.

### `features`

Agrupa cosas transversales como feature flags.

## Criterios UX del proyecto

El frontend no quedo como una coleccion improvisada de pantallas. Hay decisiones de UX claras:

- estados vacios mas entendibles;
- mensajes mas humanos;
- tablas con soporte responsivo;
- acciones administrativas mas coherentes;
- confirmaciones mas formales;
- filtros persistentes;
- vistas guardadas;
- notificaciones operativas.

## Accesibilidad

Se mejoro bastante la accesibilidad del frontend:

- `skip link`
- modales con foco controlado
- `aria-*` en formularios
- banners con roles adecuados
- tablas accesibles
- soporte consistente de tema claro/oscuro

No es un frontend "solo bonito". Tiene trabajo de accesibilidad real.

## Performance

Tambien se trabajo rendimiento:

- code splitting;
- chunks mas estables;
- optimizacion de assets;
- React Query con caché mas razonable;
- polling mas barato;
- mejoras en pantallas grandes.

## Frase util para defensa

"El frontend se construyo en React con TypeScript y se organizo por paginas, componentes y hooks reutilizables. React Router controla navegacion y proteccion de rutas, mientras React Query administra datos remotos, cache e invalidaciones. Ademas se incorporaron accesibilidad, modo oscuro, vistas guardadas y mejoras de rendimiento."
