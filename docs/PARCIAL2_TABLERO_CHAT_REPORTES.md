# Parcial 2 — Tablero analítico, Chat en tiempo real y Reportes/Notificaciones

Implementación de los tres entregables del **Parcial Corte 2 (Angular)** sobre la
arquitectura existente (FastAPI + Angular 22 + JWT + RBAC). Este documento
describe qué se implementó, cómo se valida y qué configuración externa queda
pendiente.

---

## 1. Tablero analítico (25%)

**Ruta:** `/admin/tablero` (módulo `estadisticas`; también en el menú lateral).

| Requisito | Implementación |
|---|---|
| ≥ 4 indicadores | **7 tarjetas**: libros, préstamos activos, préstamos vencidos, dispositivos disponibles (con total), accesos exitosos y usuarios (si el rol puede listarlos). |
| ≥ 6 gráficos | **7 gráficos SVG** (componentes propios, sin librerías nuevas): 1) préstamos por mes (barras), 2) préstamos por estado (dona), 3) libros por sede (barras), 4) top-8 programas por títulos (barras horizontales), 5) dispositivos por estado (dona), 6) accesos por día — 14 días (línea), 7) usuarios por rol (barras, solo roles con `gestion_usuarios`). |
| 1 filtro | **Filtro por sede** (Todas/Soledad/Barranquilla/Colsamiro) que recalcula indicadores y gráficos con dimensión de sede. |

- Datos: mismos endpoints ya usados por la plataforma (`/libros/`, `/loan/`,
  `/dispositivos/`, `/api/library-access/`, `/usuarios/`), respetando el
  alcance por rol del backend (no se inventan fuentes).
- Agregaciones puras y testeadas en `tablero.datos.ts` (vitest).
- **Nota sobre Power BI:** el repositorio no contiene Power BI. El tablero se
  implementó dentro de Angular con los datos reales de la API; los mismos
  endpoints JSON (`/api/ia/dashboard`, listados RBAC) pueden consumirse desde
  Power BI si el docente lo exige, autenticando con el Bearer JWT.

## 2. Chat en tiempo real con WebSocket (50%)

**Rutas:** `/admin/chat` (módulo `dashboard`) y **`/inicio/chat` (módulo
`inicio` — TODOS los roles)**. Es un módulo distinto del chatbot IA existente
(`app-chatbot`).

**Backend** (`Backend del proyecto/routers/chat_router.py`):
- `WSS /api/chat/ws?token=<JWT>` — el token viaja en la consulta porque los
  navegadores no pueden enviar headers en WebSocket; se valida igual que un
  Bearer (firma, vigencia, usuario activo). Conexión rechazada con código
  **4401** si falla.
- Presencia: al conectar/desconectar se difunde `{"type":"presence","users":[…]}`
  — la interfaz muestra los usuarios conectados y su estado en vivo.
- Mensajes: `{"message": "…"}` → difusión inmediata a todos los conectados
  (`{"type":"message","user_id","name","message","sent_at"}`), sin recargar.
- Ping/pong (`{"type":"ping"}` → `{"type":"pong"}`) cada 30 s desde el cliente
  para mantener viva la conexión tras el proxy de Render.
- Soporta **varias pestañas por usuario** (presencia deduplicada por usuario).
- El hub vive en memoria: válido con la instancia única actual de Render Free.

**Frontend** (`Frontend-Angular/src/app/features/chat/pages/chat/`):
- Reconexión automática (hasta 10 reintentos cada 3 s) y reintento manual.
- Mensajes propios resaltados a la derecha (color institucional), auto-scroll,
  contraste propio/otros, contador "en línea" y marcador "Tú" en la presencia.
- `JSON.parse` protegido: una trama corrupta no rompe la sesión.

**Demo de dos clientes (evidencia del parcial):**
1. Cliente A: iniciar sesión como administrador → `/admin/chat`.
2. Cliente B (otro navegador/perfil o ventana privada): iniciar sesión como
   **Estudiante** → menú del usuario → "Chat en vivo" (`/inicio/chat`).
3. Ambos ven la presencia del otro; un mensaje escrito en A aparece al instante
   en B (y viceversa); al cerrar B, la lista de conectados de A se actualiza.
4. Prueba automatizada equivalente:
   `tests/test_chat_ws.py::test_ws_dos_clientes_sincronizan_mensajes` (TestClient
   con dos sockets simultáneos).

## 3. Reportes y notificaciones por correo (25%)

**Rutas:** `/admin/reportes` (módulo `estadisticas`) y **`/inicio/reportes`
(módulo `inicio` — todos los roles)**.

| Requisito | Implementación |
|---|---|
| Reportes filtrables | Tipo de reporte (catálogo, dispositivos, préstamos, usuarios*, ingresos*), **sede**, **estado**, **rango de fechas** y **búsqueda**; vista previa tabular con DataTables. `*` solo si el rol tiene el módulo (RBAC real del backend). |
| Descarga XLSX y PDF | Reutiliza `ReportesService` (SheetJS + jsPDF/autotable) con encabezado institucional — misma exportación que ya existía en libros/estadísticas. |
| Envío al correo registrado | El archivo se genera en el cliente, viaja al backend (cuerpo binario, sin dependencias nuevas) y se envía por SMTP al correo del usuario autenticado. Límite 5 MB. |
| Almacenamiento temporal y distribución | El backend adjunta el archivo exacto generado (mismo bytes verificados en pruebas) y lo entrega al SMTP configurado. |
| Notificaciones automáticas por eventos | **Registro de usuario** (bienvenida al correo del nuevo usuario) y **generación de reporte** (confirmación con adjunto). Otros eventos del enunciado (alertas académicas, cambios monitoreados) NO se inventaron: quedan como configuración futura sobre el mismo mecanismo. |
| Registro del estado de cada envío | Tabla `notificaciones_email` (se crea sola con `create_all`): estado `pendiente / enviado / fallido / no_configurado`, detalle del motivo, fechas de creación/envío. Panel de **seguimiento administrativo** (solo admins) en `/admin/reportes` con filtros por tipo y estado. |

**Backend nuevo:**
- `services/email_service.py` — SMTP con `smtplib` (stdlib, 0 dependencias
  nuevas). Configuración 100% por variables de entorno.
- `services/notificaciones_service.py` — registro y envío *best-effort*
  (un fallo de correo NUNCA rompe el registro de usuarios ni los reportes).
- `routers/notificaciones_router.py` — `POST /api/notificaciones/reporte`,
  `GET /api/notificaciones/` (solo administradores), `GET /api/notificaciones/estado-smtp`.

---

## Configuración externa pendiente (SMTP)

El envío real de correos exige credenciales SMTP **que no están ni deben estar
en el repositorio**. Definir en Render (servicio `biblioteca-iub-api`,
Environment) — ya declaradas en `render.yaml` con `sync: false`:

| Variable | Ejemplo | Nota |
|---|---|---|
| `MM_SMTP_HOST` | `smtp.gmail.com` | Servidor SMTP. |
| `MM_SMTP_PORT` | `587` (defecto) | `465` implica SSL. |
| `MM_SMTP_USER` | `biblioteca@iub.edu.co` | Usuario SMTP. |
| `MM_SMTP_PASSWORD` | *(contraseña de aplicación)* | Secreto: solo en el panel. |
| `MM_SMTP_FROM` | `Biblioteca IUB <biblioteca@iub.edu.co>` | Opcional (defecto: usuario). |
| `MM_SMTP_MODO` | `starttls` (defecto) | `ssl` o `ninguno` como alternativas. |

Sin estas variables el sistema es **honesto**: la interfaz muestra "SMTP no
configurado" (vía `/api/notificaciones/estado-smtp`) y cada intento queda
registrado con estado `no_configurado` para seguimiento administrativo — nunca
falla el flujo principal ni se simula un envío inexistente.

## Pruebas y validación

| Suite | Resultado |
|---|---|
| Backend pytest (chat WS) | `tests/test_chat_ws.py` — **7/7** (auth 4401, dos clientes sincronizados, presencia, multi-pestaña, ping/pong, mensajes vacíos/largos). |
| Backend pytest (notificaciones) | `tests/test_notificaciones_email.py` — **13/13** (registro de usuario, adjunto con bytes exactos, falla SMTP registrada, validaciones 400/413, listado admin 403/200, filtros, config SMTP). |
| Backend pytest (suite completa) | Ver el informe de la sesión: 278 pruebas (incluido Telegram tras instalar `python-telegram-bot==21.11.1`, ya declarado en `requirements.txt`, en el venv local). |
| Angular vitest | **20 archivos / 113 pruebas** (91 previas + 22 nuevas: URL del chat, agregaciones del tablero, geometría de gráficos). |
| Build Angular producción | `ng build` sin errores. |

> **Runner correcto de las pruebas Angular:** `npm test` o `npx ng test --watch=false`.
> NO usar `npx vitest run` directo: vitest crudo corre en Node puro (sin el
> entorno jsdom ni las transformaciones que aporta el builder
> `@angular/build:unit-test` de `angular.json`), por lo que TODOS los specs
> que tocan el DOM fallan con `ReferenceError: window/document is not defined`
> — incluidos los preexistentes. No es un defecto del código ni de los tests.

## Archivos principales

**Backend:** `routers/chat_router.py` (corregido), `routers/notificaciones_router.py`,
`services/email_service.py`, `services/notificaciones_service.py`,
`models/models.py` (+`NotificacionEmail`), `app.py` (+router, +evento de
registro), `tests/test_chat_ws.py`, `tests/test_notificaciones_email.py`,
`tests/conftest.py`, `render.yaml` (solo variables `sync:false`).

**Frontend:** `features/chat/pages/chat/` (movida y robustecida),
`features/reportes/pages/reportes/`, `features/admin/pages/tablero/`
(+`tablero.datos.ts`), `shared/graficos/` (4 componentes SVG + paleta),
`core/models/index.ts` (interfaces nuevas), `core/services/chat-url.ts`,
`core/services/correo.service.ts`, `core/services/reportes.service.ts`
(refactor con blobs, sin `any` nuevo), `app.routes.ts`, `layouts/` (menús),
specs: `chat-url.spec.ts`, `tablero.datos.spec.ts`, `graficos.spec.ts`.

## Limitaciones conocidas

- WebSocket en memoria: con una sola instancia de Render Free funciona; con
  escalamiento horizontal se necesitaría un broker (no inventado aquí).
- **Soporte WS en uvicorn (corregido):** `requirements.txt` instalaba `uvicorn`
  plano, sin librería WebSocket — uvicorn rechazaba los upgrades con 404
  (advertencia: "No supported WebSocket library detected"). Se añadió
  `websockets` a los requirements; validado local y en producción.
- Render Free puede "dormir" el servicio: la primera conexión del chat puede
  tardar ~50 s en despertar; la UI lo indica y reintenta.
- Los eventos automáticos implementados son los que existen en el repositorio
  (registro de usuario y generación de reportes); alertas académicas adicionales
  requerirían reglas de negocio nuevas que no se añadieron sin definición.
