# Informe Fase IA 5.3 — Auditoría previa: hacia el Asistente Bibliotecario Integral

**Proyecto:** Biblioteca IUB — Taller 1 Corte 2
**Fecha:** 2026-11-07
**Objetivo:** diagnóstico del estado actual ANTES de implementar. Nada fue modificado.

---

## 1. Mapa del sistema actual (código real verificado)

### 1.1 Canales

| Canal | Archivo | Estado |
|---|---|---|
| Chatbot web (Angular) | `Frontend-Angular/src/app/shared/chatbot/chatbot.ts` (selector `app-chatbot`, montado en `layouts/user-layout.html:64` y `admin-layout.html:138`) | ✔ Funcional; entra por `api.service.ts:155→POST /api/ia/chat` |
| Bot Telegram | `Backend del proyecto/services/telegram/{bot_telegram,auth,utilidades}.py` + `scripts/bot_telegram.py` | ✔ Funcional; SOLO canal documental (`rag_definitivo.consultar` → Open WebUI pipe) |
| Chatbot clásico TF-IDF | `Backend del proyecto/services/ia/chatbot.py` (261 líneas, "IUBot") | ✔ NO eliminado; página y Telegram no lo usan directamente (queda como servicio existente) |

### 1.2 Endpoints FastAPI de IA (`routers/ia_router.py`, prefijo `/api/ia`, conectado en `app.py:125`)

| Endpoint | Método | Función | Servicio |
|---|---|---|---|
| `/api/ia/chat` | POST | `chat()` (línea 77) | `chatbot.responder(db, mensaje, user_id)` — intenciones por keywords |
| `/api/ia/buscar` | GET | `buscar_catalogo()` (93) | `busqueda_semantica.buscar()` (TF-IDF del catálogo) |
| `/api/ia/recomendaciones` | GET | `recomendaciones()` (106) | `recomendador.recomendar()` con `user_id` |
| `/api/ia/dashboard` | GET | `dashboard_ia()` (130) | `predictivo.resumen()` (requiere módulo `dashboard`) |
| `/api/ia/estado` | GET | `estado_ia()` (143) | `llm_client.estado()` |

### 1.3 Catálogo (endpoints clásicos en `app.py`)

- `GET /libros/buscar` (685-738): `q` ILIKE sobre `Titulo/Autor/Signatura`, **solo `Ejemplar > 0`**, offset por sede efectiva, token requerido.
- `GET /libros/` (638: lista con filtro `sede`), CRUD completo (650/740/750/770 con RBAC `gestion_libros`).
- Préstamos: `POST /loan/` (799), `GET /loan/` (835), `GET /loan/{id}` (872), `PATCH /loan/{id}` (890). El contador `Libro.Ejemplar` se descuenta al aprobar y reponen al devolver/rechazar.
- **NO existe**: router de sedes, router de ejemplares, ni endpoint dedicado de "disponibilidad".

### 1.4 Modelos (`database.py:84-117`, `models/models.py`)

- `Libro`: `ID, Autor, Titulo, Programa, Item, Signatura, Areas(Integer), Ejemplar(int contador), Editorial, Año, Idioma, sede(Enum Soledad|Barranquilla|Colsamiro), Observaciones, Precio, Proveedor, Registro_en_linea`. Sin FKs.
- `Prestamos`: `user_id`, `book_id`, `loan_date`, `delivery_date`, `entry_date`, `state`(Activo/Vencido/Devuelto), `prestamo_state`(No Aprobado/Aprobado/Rechazado)…
- `UserTable`: `carrera(string)`, `sede(Enum)`, `rol_id(FK→Rol)`.
- **HALLAZGOS CLAVE:**
  - ❌ **No existe tabla de Ejemplar/Copia** (solo contador `Ejemplar`) ⇒ no hay serial, no hay "ejemplar por sede" ni historial por copia.
  - ❌ **No existe campo `ISBN`** en `Libro` (el alcance pide búsqueda por ISBN).
  - ❌ `Areas` es un entero suelto; **no hay catálogos** de área/carrera/asignatura (mapeo `CATEGORIA_PROGRAMA` hardcodeado en `app.py:615-625`).
  - ✔ `sede` existe por Libro (una sede por título, no por ejemplar).

### 1.5 Servicios `services/ia/*`

| Servicio | Qué hace | Reuso para 5.3 |
|---|---|---|
| `chatbot.py` (IUBot determinista) | intenciones: saludo/ayuda/buscar libros (usando `busqueda_semantica`)/recomendar/préstamos activos/manuales/reglamento; Ollama con fallback | ✔ base del orquestador (mejorar keywords y fuentes) |
| `busqueda_semantica.py` | TF-IDF sobre Título+Autor+Programa+Signatura+… con caché; `buscar()` y `sugerencias()` | ✔ reutilizar para búsqueda y sugerencias |
| `recomendador.py` | score carrera 0.40 + similitud historial 0.35 + popularidad 0.25; `para_invitado()` | ✔ reutilizar; añadir disponibilidad como potencia señal |
| `manuales.py` | RAG-lite TF-IDF local de `docs/` (pypdf) | ⚠ convive con RAG e5/Open WebUI (no duplicar: usar solo e5 en 5.3) |
| `predictivo.py` | dashboard predictivo | (informativo) |
| `llm_client.py` | cliente Ollama local | (informativo) |
| `rag_guard.py` / `rag_definitivo.py` | guarda determinista + canal Open WebUI e5 | ✔ canal documental del asistente (Telegram ya lo usa) |

### 1.6 Esquemas de seguridad

- Web: JWT FastAPI; `verificar_token` **relee** el rol/sede desde la BD en cada petición (`auth.py:207`); RBAC por `modulos_X_rol` (`services/rbac.py`: roles `super_administrador, Administrador, Funcionario, Docente, Estudiante`).
- Express: solo compras/proveedores con revalidación vía `/api/auth/introspect`.
- Telegram: **lista de autorizados por env, sin vinculación con la BD** (sin roles de sistema).

---

## 2. Estado por requisito del alcance solicitado

| Requisito | Estado actual | Brecha |
|---|---|---|
| 2. RAG institucional (manuales/reglamentos) | ✔ Fase IA 4 (e5 + guard + pipe) | corregir mezcla pregrado/posgrado (ya corregida en 5.2 con filtro temático; queda variabilidad del 1B) |
| 3. Buscar libros por título/autor | ✔ `/libros/buscar` (ILIKE) y `/api/ia/buscar` (semántica) | errores tipográficos: semántica TF-IDF Ayuda con typos moderados; no hay fuzzy explain; ISBN no existe en la tabla |
| 3. Buscar por ISBN | ✘ no hay campo | migración si se quiere (decisión docente) |
| 3. Por área de conocimiento | ⚠ solo `Programa`/`Areas(int)` sin catálogo | normalizar catálogo o mapa por configuración |
| 3. Por carrera/asignatura | ⚠ `Programa`/`carrera` strings; asignaturas NO existen | mapa de equivalencias ya existe en `recomendador` |
| 4. Disponibilidad real (ejemplares, prestados, sede, préstamo) | ⚠ contador `Ejemplar` + estado de préstamo | servicio determinista "consultar disponibilidad" reutilizando `Libro.Ejemplar` + `Prestamos` activos (sin tabla de copias) |
| 4. Disponibilidad por sede | ⚠ `Libro.sede` es 1 título→1 sede | reportar sede del título; "por sede" => filtro por sede del catálogo, no por almacén |
| 5. Recomendaciones personalizadas | ✔ `recomendador` + `para_invitado` | añadir disponibilidad real en la respuesta y mensaje claro "recomendar ≠ disponible" |
| 5. Sin preferencias → preguntar | ⚠ `para_invitado` popular parcial | interacción: preguntar temática en canales |
| 6. Igualdad WEB ↔ Telegram | ⚠ Telegram solo documental | conectar Telegram al mismo orquestador que la web (o `/api/ia/chat`) emergente |
| 7. Seguridad | ✔ web RBAC revalidado; Telegram autorizados-env | vincular identidad Telegram↔usuario BD para préstamos personales (migración opcional) |

---

## 3. Arquitectura propuesta (canales unificados, sin duplicar motores)

```
   Usuario (web Angular)            Usuario (Telegram)

              │ POST /api/ia/chat          │ mensajes bot
              ▼                              ▼
        ┌──────────── ORQUESTADOR ÚNICO (service nuevo: services/ia/asistente.py) ───────────┐
        │  entra texto+usuario → Clasificador de intención (keywords existentes ampliado):    │
        │  INSTITUCIONAL → rag_definitivo.consultar()          (Open WebUI e5 + guarda)      │
        │  CATÁLOGO       → busqueda_semantica.buscar/sugerencias (TF-IDF ya existente)       │
        │  DISPONIBILIDAD → servicio determinista nuevo: disponibilidad(uid|titulo)+sede      │
        │  RECOMENDAR     → recomendador.recomendar() + disponibilidad en respuesta           │
        │  PRÉSTAMOS PERSONALES → consulta Prestamos del usuario autenticado (existente)      │
        │  Reglas: nuncaInventar títulos/cantidades/sedes; recomendación ≠ disponibilidad;    │
        │  si no hay preferencias y es recomendación → pregunta de temática (conversacional).  │
        └─────────────────────────────────────────────────────────────────────────────────────┘
                    ▲ obtener token/usuario: WEB = JWT; TELEGRAM = mapa env o氨基 BD
```

- La web YA hablaría con el orquestador (mismo `/api/ia/chat`, extendido con intenciones nuevas → **sin cambios de API frontend** salvo UI).
- Telegram: sus mensajes pasarían por el ORQUESTADOR en vez de solo `rag_definitivo` (cambio en `bot_telegram.py` handler). Para "mis préstamos" requiere identidad BD (opción: mapa `TELEGRAM_AUTHORIZED_USERS`→`usuario.ID` configurado por env, Ⴅ衬托 migraciones).
- El modelo de LLM no inventa.Recomendaciones y disponibilidad se resuelven **determinísticamente desde la BD**; el LLM sólo formatea con los datos ya calculados.

## 4. Prioridades

### P0 (crítico para el alcance)
1. **Orquestador compartido** `services/ia/asistente.py` (reutiliza chatbot/busqueda/recomendador/rag_definitivo).
2. **Servicio de disponibilidad determinista** `services/ia/disponibilidad.py`: dado título/ID → {total(Ejemplar), prestadosActivos(count Prestamos Activo), disponibles=total-prestadosActivos, sede, estado préstamo, puedenPréstar = disponibles>0}; جámuye TIFF con actuales models (sin tabla copies).
3. **Telegraph handler integrado** (usar orquestador; mantener autorización env y guard documental).
4. **Garantía anti-invento**: las respuestas de libros/disponibilidad se arman con datos de BD (sin LLM para hechos).

### P1 (completar alcance)
5. Búsqueda por ISBN/código-institucional: si se autoriza, migración leve añadiendo columna `ISBN` nullable (o reuso de `Signatura`/`Registro_en_linea` temporal) + matcher en búsqueda.
6. Disponibilidad por sede: reporte con ajuste a sede del Catálogo + filtrado del listado por sede (usar `sede_efectiva` RBAC del token).
7. Errores tipográficos robustos: extensión de `busqueda_semantica` con normalización de acentos + `difflib`/fuzzy fallback incorporado (sin deps externas).
8. Recomendaciones con disponibilidad + "preguntar temática" cuando no hay preferencias (estados conversacionales en orquestador).
9. Vincular Telegram↔usuario BD (opción A: mapa env `TELEGRAM_USER_MAP= '@usuario:ID'; opción B: columna `telegram_id` en UserTable, migración).

### P2 (pulido web)
10. UI del chatbot web: sugerencias/botones rápidos (buscar, disponibilidad, recomendar) y render de fuentes; coherencia de sesión por usuario (historial local).
11. (opcional) endpoint `GET /api/ia/disponibilidad` público para autocompletado.

### P3 (nice-to-have)
12. Catálogo normalizado de Áreas/Carreras (tabla + admin CRUD) e import de `CATEGORIA_PROGRAMA` a BD.
13. Tabla real de Ejemplares (commografía serial/copia) y por-sede — gran cambio del modelo; requiere autorización docente y plan alterno.

### Archivos a modificar (prouestos)
- **Nuevos:** `services/ia/asistente.py`, `services/ia/disponibilidad.py`, `services/telegram/intentos.py` (mapa), `tests/test_asistente.py`, `tests/test_disponibilidad.py`; (si EXTIENDE Informe 5.3) `routers/ia_router.py` `GET /api/ia/disponibilidad`.
- **Modificados:** `services/telegram/bot_telegram.py` (usar orquestador), `routers/ia_router.py` (rutas nuevas), `services/ia/chatbot.py` (keywords), `services/ia/busqueda_semantica.py` (normalización+fuzzy), `services/ia/recomendador.py` (participar disponibilidad), `Frontend-Angular/src/app/shared/chatbot/chatbot.ts/.html` (UI si P2) y `core/services/api.service.ts` (nuevo endpoint).
- **No tocar:** tablas/modelos existentes, sistema de préstamos, colecciones e5/MiniLM, RAG, Render/Neon.

## 5. Plan de pruebas (al momento de implementar)

| # | Caso | Esperado |
|---|---|---|
| 1 | buscar por título existente | lista de títulos reales + sede |
| 2 | buscar por autor | encuentra por Autor en TF-IDF + ILIKE |
| 3 | buscar con errores tipográficos | fuzzy devuelve el título coincidente |
| 4 | disponibilidad de libro existente | total/disponibles/prestados/sede consistentes con BD |
| 5 | disponibilidad de libro sin ejemplares | "0 disponibles, sin ejemplares" (no miente) |
| 6 | disponibilidad por sede | respeta sede del título y RBAC del usuario |
| 7 | recomendar ingeniería | lista de Libros del programa Engineering (con disponibles marcados) |
| 8 | recomendar temática libre | pregunta temática si no hay preferencias |
| 9 | requisitos institucionales | RAG documental e5 + guard |
| 10 | info inexistente | frase institucional de abstención (sin LLM) |
| 11/12 | mismas consultas desde Telegram y web | mismos servicios/resultados |

## 6. Riesgos/garantías

- Los datos reales reflejan el esquema actual: "disponible" sigue al contador `Ejemplar` — jamas se declarará sin consulta.
- No alterar `/libros`, `/loan` ni producción; el asistente sólo lee.
- El chatbot clásico (IUBot) se conserva; el orquestador lo sustituye en el punto de llamada pero sin eliminar su código.
- Migraciones de esquema (ISBN, telegram_id, tabla copias) quedan **fuera del alcance** salvo autorización expresa, por implicar BD.

## 7. Veredicto

La mayor parte de la infraestructura ya existe (búsqueda semántica, recomendaciones, RBAC, RAG e5 con guard, canal Open WebUI, endpoints y frontend). Faltan: **orquestador unificado**, **servicio de disponibilidad determinista** (sobre el contador actual sin inventar), **Telegram integrado al orquestador**, ISBN (migración pendiente de autorización) y pulido de UI. Con esto se cumple el alcance sin duplicar motores y sin alterar bases de datos.
