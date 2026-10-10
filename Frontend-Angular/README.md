# Biblioteca IUB — Frontend (Angular)

SPA en **Angular 22** (componentes standalone) + **Bootstrap 5** + **DataTables** para la gestión de la Biblioteca IUB.

## Requisitos

- Node.js ≥ 20 (probado con Node 24) y npm.
- (Opcional, para datos reales) La API FastAPI en `http://127.0.0.1:8000`.

## Instalación y ejecución local

```bash
cd Frontend-Angular
npm install
npm start        # ng serve → http://localhost:4200
npm run build    # compilación de producción → dist/
```

Configuración de la URL del backend: `src/environments/environment.ts` (campo `apiUrl`).

## Modos de ejecución

### 1) Modo real (por defecto)
Inicia sesión con identificación + contraseña. Autentica contra **FastAPI** (JWT) y consume datos reales.

### 2) Modo demostración (sin API)
Pensado para presentaciones: **no llama a la API**. En la pantalla de login:
1. Selecciona un **rol** en el selector.
2. Marca **"Modo demostración"**.
3. Pulsa **Ingresar (Demo)**.

Se muestran **datos de ejemplo realistas**, separados de la base de datos real (ver `src/app/core/services/demo.service.ts` y `demo.interceptor.ts`). Para salir, "Cerrar sesión". No se mezclan con datos de producción.

## Roles y permisos (navegación)

La navegación refleja la matriz RBAC del backend (`services/rbac.py`); la autoridad real sigue siendo FastAPI.

| Rol | Módulos de usuario | Módulos administrativos |
|---|---|---|
| super_administrador | inicio, catálogo, mis préstamos, dispositivos | dashboard, libros, dispositivos, usuarios, préstamos, estadísticas, ingresos |
| Administrador | (todos) | (todos) |
| Funcionario | (todos) | (todos) |
| Docente | inicio, catálogo, mis préstamos, dispositivos | — |
| Estudiante | inicio, catálogo, mis préstamos, dispositivos | — |

- El menú oculta los módulos no permitidos.
- `moduloGuard` impide el acceso por **URL directa** a módulos no autorizados (redirige a la ruta inicial del rol).
- Código de la matriz: `src/app/core/auth/permisos.ts`.

## Componentes reutilizables (`src/app/shared/`)

| Componente | Tipo | Dónde se usa |
|---|---|---|
| `chatbot` | componente | `admin-layout`, `user-layout` |
| `buscar-sugerencias` | componente | `admin-layout`, `usuarios`, `libros`, `dispositivos`, `ingresos`, `estadisticas`, `catalogo` |
| `seleccion-libro` | componente | `prestamos`, `mis-prestamos` |
| `estado-badge` | componente | `usuarios`, `dispositivos` |
| `alerta` | componente | `usuarios`, `libros` |
| `DatatableDirective` (`table[appDatatable]`) | directiva | `usuarios`, `libros`, `dispositivos`, `prestamos` (2 tablas), `ingresos`, `estadisticas`, `mis-prestamos` |

### Tablas
Las tablas administrativas usan `DatatableDirective` (DataTables.js + Bootstrap 5) con **búsqueda, ordenación, paginación** y selector de tamaño en español.

## Estructura

```
src/app/
├── core/            services (api, auth, demo, notificaciones, reportes, sugerencias), guards, interceptors (jwt, demo), models/, auth/permisos.ts, utils/
├── shared/          chatbot, buscar-sugerencias, seleccion-libro, estado-badge, alerta, datatable
├── layouts/         admin-layout, user-layout
└── features/
    ├── auth/pages/login
    ├── admin/pages/{dashboard,libros,dispositivos,usuarios,prestamos,estadisticas,ingresos}
    └── user/pages/{inicio,catalogo,mis-prestamos,dispositivos}
```

## Pruebas

- `npm test` — el runner de unit tests no está configurado en este proyecto (se generó sin Karma/Vitest); `ng test` requeriría añadirlo.
- Verificación de integración: se valida con `npm run build` (compilación estricta de plantillas y tipos) y pruebas manuales de navegación.

## Despliegue (pendiente de esta fase)

Publicar la carpeta `dist/` en un hosting estático (Vercel/Netlify) y ajustar `apiUrl` a la API en la nube y `CORS_ORIGINS` en el backend.
