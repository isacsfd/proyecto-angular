# Diagnóstico de Cierre — TALLER 1 CORTE 2 (Biblioteca IUB)

**Fecha:** 2026-11-06 · **Entrega:** HOY 23:55 (aula virtual)
**Fuente de requisitos:** `docs/TALLER 1 CORTE 2.docx` (texto extraído integro).

---

## 1. MATRIZ DE CUMPLIMIENTO (requisito por requisito)

### A. Entregables generales (docx, inicio)

| Requisito | Estado | Evidencia | Acción pendiente | Tiempo |
|---|---|---|---|---|
| Compartir todas las evidencias | PARCIAL | `docs/informe_*.md` (11 informes), backups `C:\Users\USUARIO\Backups\` | Armar carpeta `docs/entrega/` con índice de evidencias | 30 min |
| **Video de funcionamiento de cada punto** | NO CUMPLE | no existe grabación | Grabar con el guion §7 (24-30 min de grabación) | 1 h |
| **Link en la nube de cada evidencia (hosting BD)** | PARCIAL | Neon en uso (BD nube); respaldo en Backups | Exportar backup `.sql`/descarga y subir link (Drive/OneDrive) | 30 min |
| **Link de cada API** | PARCIAL | FastAPI en Render (URL en render.yaml/panel); **Express sin URL** | Desplegar Express en Render (servicio nuevo); recopilar URLs | 40-60 min |
| **Link de Angular en la nube** | NO CUMPLE | `environment.production.ts` apunta a localhost (sin dominio) | Build `ng build -c production` + deploy en Vercel/Netlify con URLs públicas | 1-1.5 h |
| Todos los proyectos locales para descargar (excepto IA, validada en video) | PARCIAL | repositorio con carpetas completas | Comprimir/empaquetar y publicar en Drive | 20 min |

### B. Base de datos (30 % con backend)

| Requisito | Estado | Evidencia | Acción pendiente | Tiempo |
|---|---|---|---|---|
| Campos `created_at`/`updated_at` y `estado` en TODAS las tablas | PARCIAL | 12 coincidencias de created_at/updated_at/estado en modelos; falta verificar tabla por tabla | Auditoría de columnas por tabla + añadidos vía migración SQL (sin esquema destructivo) | 45-60 min |
| BD alojada en nube | C | Neon (Postgres) operando (693 libros, 15 usuarios) | — (solo registrar URL en informe) | 5 min |
| Versión local de la BD | PARCIAL | scripts SQL en `Base de datos del projecto/` + `docker/mysql-init` | Ejecutar/datos locales + capturas | 30 min |
| **BD elaborada con Access (.accdb)** (solo para imprimir/presentar) | NO CUMPLE | MSAccess no instalado; se pidió confirmación docente | **PENDIENTE DE DECISIÓN DEL DOCENTE** (alternativa: versionar la BD desde Postgres→Access; si exige Access, instalar MSAccess) | 1-2 h (si docente permite) |
| 20 registros principales / 10 secundarias | PARCIAL | Usuario: **15/20**; Libro: 693 ✔; Rol 5; Módulos 13; ModuloRol 51 | Insertar 5 usuarios más (y validar tablas secundarias ≥10) por SQL | 20-30 min |

### C. Backend FastAPI + Express

| Requisito | Estado | Evidencia | Acción | Tiempo |
|---|---|---|---|---|
| FastAPI en nube | C | Render configurado (render.yaml) | Verificar URL y health | 5 min |
| FastAPI local | C | ejecutable (262 pruebas pasadas) | — | 5 min |
| Express estructura clase 1 | C | `express-api/src` (middleware + routes) con revalidación introspección | — | — |
| **Express en nube** | NO CUMPLE | sin URL de despliegue | Deploy en Render (nuevo servicio) creando BD compras en Neon (scripts SQL listos) | 40-60 min |
| Express BD nube + local + campos | PARCIAL | scripts `docker/mysql-init/01-compras.sql` listos | crear BD en Neon MySQL/Postgres y desplegar | 30-45 min |

### D. Frontend Angular (40 %)

| Requisito | Estado | Evidencia | Acción | Tiempo |
|---|---|---|---|---|
| ≥10 componentes reutilizables | PARCIAL | `shared/`: 7 (alerta, buscar-sugerencias, chatbot, datatable, estado-badge, paginador-ngx, seleccion-libro) | con criterio de reutilización actual (variables/métodos) ya se supera 10; documentar relación y/o extraer 3 componentes más | 45 min |
| DataTables en todas las tablas | PARCIAL | componente `shared/datatable` (DataTables.js+Bootstrap) implementado | ENCHUFAR `<app-datatable>` en páginas de listado (admin: libros, usuarios, préstamos, dispositivos, ingresos, compras, proveedores; user: mis-préstamos) | 1-1.5 h |
| Autenticación login con roles | C | JWT + interceptor + `verificar_token` revalida BD | — | — |
| Redirección por roles / módulos según BD (`modulos_X_rol`) | PARCIAL | tablas existe (13 módulos, 51 filas modulos_X_rol); Angular carga módulos estáticos por rol | Cargar menú/rutas desde endpoint de módulos por rol | 45-60 min |
| ≥3 páginas por rol | C | admin: 9 páginas; user: 4 páginas | — | — |
| CRUD para los roles (crear/actualizar/eliminar=cambiar estado) + campos created/updated | PARCIAL | CRUD libros ✔; usuarios/préstamos/dispositivos creados; reviso "estado" | Verificar soft-delete en cada módulo y creado/actualizado visible | 45-60 min |
| **Sin mostrar IDs en ningún módulo** | PARCIAL | forms sin `id` visible en la mayoría | revisar tablas/modal que muestren IDs | 20-30 min |
| Función principal reflejada en todos los roles | C | préstamos: admin aprueba y usuario lo ve (mis-prestamos) | demo al video | — |
| Navegación/menú funcionando | C | layouts user/admin con menú | — | — |
| Colores acordes a propuesta | PARCIAL | tema base; revisar contraste | ajustes si 视需要 | 15-30 min |
| Responsive/UX | PARCIAL | base Bootstrap | revisar móvil | 30 min |
| Angular en la nube funcionando | NO CUMPLE | — | deploy (A1) | 1-1.5 h |
| Información real no absurda | C | 693 libros reales, 15 usuarios institucionales | añadir los 5 faltantes | — |

### E. Componente IA (30 %) — TODOS CUMPLEN

| Requisito | Estado | Evidencia |
|---|---|---|
| Ollama instalado + LLM descargado (llama3.2:1b) | C |	sessiones previas; `ollama list` muestra el modelo |
| Open WebUI con PDF/TXT para base de conocimientos | C | 10 documentos, 478 fragmentos e5 (`37edddd0-…`) |
| Chat responde según documentos | C | informes 5.2/5.3.1/5.5; guard 100% abstención correcta |
| BotFather Telegram | C | `@Biblioteca_IUB_BOT` (getMe 200) |
| Mismo chat en Open WebUI y Telegram (mismo LLM) | C | orquestador único + pipe `biblioteca_iub_rag_guarda` |
| Validación clara en video (IA no requiere deploy) | PARCIAL | guion §7 — incluir pantalla de Ollama+Open WebUI+Telegram |

### F. Otros

| Requisito | Estado | Evidencia | Acción | Tiempo |
|---|---|---|---|---|
| Sustentación en vivo (BD/API/web en tiempo real) | PREPARACIÓN | Neon + Render + web local/nube | probar conectividad nube→nube | 15-30 min |
| Scripts SQL por BD | PARCIAL | `Base de datos del proyecto/*.sql`, `docker/mysql-init`, 1 migración | exportar BD final nube→`.sql` (mín. 20/10) | 20 min |
| Prontas URLs de hosting | NO | — | consolidar en `docs/entrega/links.md` | 10 min |

---

## 2. PRIORIDADES DE CIERRE (P0→P3)

**P0 — impiden entregar (hoy):**
1. Deploy Angular nube con URLs públicas (FastAPI+Express).
2. Deploy Express en Render + BD compras nube.
3. `<app-datatable>` en páginas de listado.
4. Registros 20/10 (añadir 5 usuarios).
5. Grabar VIDEO de demostración (usa el guion abajo).
6. Preparar carpeta `docs/entrega/`: enlaces (BD, APIs, Frontend, descargas, video), guion, scripts SQL, informes.

**P1 — importantes para la nota:**
7. Menú por rol cargado desde `modulos_X_rol`.
8. Revisión de `created/updated/estado` por tabla (migración ligera o ajuste UI).
9. Sin IDs visibles: auditar tablas/modal.
10. Sugerencias/demo de sustentación nube→nube.

**P2/P3 — mejoras no obligatorias:**
- UX responsive fino, theme, specs Frontend, IA extras (P1 mejoras ya no: 5.6 cancelado por cierre).

## 3. RIESGOS / DECISIONES DEL DOCENTE

- **Access `.accdb`**: obligatorio para IMPRIMIR/PRESENTAR (no para BD real). Sin MSAccess instalado — decisión del docente (¿acepta la BD Postgres/mysql por scripts y capturas u obliga a Access?).
- Proyecto de Svelte mencionado en docx — el proyecto real es Angular (confirmado por docente en clase); no aplica.
- No modificar Render/Neon (sólo leer); cualquier cambio de producción requiere autorización expresa (deploy Express/Angular es servicio NUEVO, no daña los existentes).

## 4. GUION PARA EL VIDEO DE DEMOSTRACIÓN (2:30-4:00 min aprox)

1. (0:00) Presentación breve: proyecto Biblioteca IUB (FastAPI+Express+Angular, IA: Ollama+Open WebUI+Telegram).
2. (0:20) Login con JWT: entrar como Admin → módulos cargados según `modulos_X_rol` (mostrar tabla BD si es posible).
3. (0:50) CRUD libros: crear libro → BD created_at; editar → updated_at; eliminar (estado) → validar en BD.
4. (1:20) Página usuario: catálogo con búsqueda semántica + `mis préstamos`; préstamo creado por admin refleja en usuario.
5. (1:40) DataTable en tabla listado.
6. (1:50) IA: abrir chatbot web → pregunta requisitos pregrado (respuesta documental con fuentes) → pregunta sin respuesta → abstención.
7. (2:10) Telegram: mismo bot `@Biblioteca_IUB_BOT` con pantalla de Ollama y Open WebUI; repetir pregunta → misma respuesta.
8. (2:30) Cierre: links de hosting (Angular, FastAPI, Express, Neon) + resumen breve.
   *(Registrar pantalla completa, sin contraseñas ni tokens; grabar Ollama/installación previa ya montada).*

## 5. CONFIRMACIÓN/NOTA

Este informe es diagnóstico: **no se implementó nada** en esta fase. La matriz es honesta con estados C/PARCIAL/NO CUMPLE y acción+tiempo por item. P0 (1-6) es lo bloqueante para hoy.
