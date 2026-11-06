# Informe Fase IA 5 — Integración Telegram (implementación local lista)

**Proyecto:** Biblioteca IUB — Taller 1 Corte 2
**Fecha:** 2026-11-06
**Estado:** Código completo + pruebas locales 226/226. **Pendiente: token de BotFather para la batería real desde Telegram** (el token se entrega por variable de entorno; no está en repos/logs).

---

## 1. Arquitectura (un solo canal documental, sin segundos motores)

```
Telegram (usuario autorizado)
   │ long polling (SOLO tráfico saliente a api.telegram.org; cero puertos abiertos)
   ▼
services/telegram/bot_telegram.py           (Backend del proyecto venv)
   ├─ auth.py: TELEGRAM_AUTHORIZED_USERS (fallo cerrado: vacío ⇒ nadie)
   ├─ utilidades.py: mensajes ≤ 4096 (corte por párrafos), formato español
   ├─ límites: máx 3 consultas simultáneas (semáforo) + 1 en vuelo por usuario
   ▼
services/ia/rag_definitivo.consultar()      (misma interfaz compartida de Fase IA 4)
   ▼
Open WebUI pipe `biblioteca_iub_rag_guarda`
   e5-small (query:) → top-5 colección `37edddd0-…` (478 frag.) → GUARDA (≤ 0.1572)
      ├─ SIN evidencia → frase institucional fija (el LLM NO se invoca)
      └─ CON evidencia → llama3.2:1b ctx4096/temp0.2/num_predict1024/
                          repeat_penalty1.2 (config F) + fuentes [id] + footer
```

**Config F intacta:** valves del pipe quedaron en los valores de la Fase IA 4.1 (estructura, max 6 puntos, temperatura 0.2, num_predict 1024, repeat 1.2/128, top_k 40, top_p 0.9, num_ctx 4096).

## 2. Archivos creados/modificados

**Nuevos:**
- `services/telegram/__init__.py`
- `services/telegram/auth.py` — authorización configurable fail-closed (ids numéricos o @usernames, sin mayúsculas, sin '@')
- `services/telegram/utilidades.py` — corte por párrafos ≤ límite, `formatear_respuesta`
- `services/telegram/bot_telegram.py` — handlers (/start, /help, mensajes), colas, errores, sin puertos
- `scripts/bot_telegram.py` — launcher (lee `.env` si existe, sin imprimir secretos)
- `.env.example_bot` — plantilla de variables sin valores reales
- `tests/test_bot_telegram.py` — 11 pruebas (mocks, sin red real)

**Modificados:**
- `requirements.txt`: `python-telegram-bot==21.11.1` (instalado en el venv del backend)

## 3. Seguridad implementada

| Medida | Detalle |
|---|---|
| Token | SOLO `TELEGRAM_BOT_TOKEN` (env o `.env` local no versionado); arranque sin token falla cerrado (exit 2) explicando cómo configurarlo SIN eco de secretos |
| Autorización | `TELEGRAM_AUTHORIZED_USERS`; lista vacía ⇒ NADIE; respuesta '⛔ No estás autorizado…' sin detalles de errores |
| Privacidad entre usuarios | No se persisten datos; solo set en memoria de consultas en vuelo; consultas sobre el corpus institucional compartido |
| Puertos | Long polling: sin puertos abiertos; Ollama (11434) y Open WebUI (3000) siguen en 127.0.0.1 |
| Errores | − Los fallos del canal se traducen a mensaje genérico al usuario; el detalle queda en log local sin secretos |
| Concurrencia | Semáforo global (configurable) + 1 consulta por usuario en vuelo (nota '⏳ ya tienes una consulta') |

## 4. Pruebas locales ejecutadas (evidencia)

| Prueba | Resultado |
|---|---|
| `pytest tests/test_bot_telegram.py` | **11/11 passed** (autorización fail-closed, cortes, formato, flujo LLM con fuentes, flujo bloqueo de guarda con distancia, rechazo de no-autorizado sin consulta, error de canal sin exponer detalle, arranque sin token sin imprimiendo secretos) |
| Suite backend completa | **226/226 passed** (215 previas intactas + 11 nuevas) |
| Compilación de los 5 módulos nuevos | OK (`ast.parse`) |
| `scripts/bot_telegram.py` sin token | exit 2 con instrucciones claras (sin secretos) |
| `rag_definitivo` 14 pruebas canal compartido | passed (de Fase IA 4, sin regresión) |

La lógica de consulta NO se duplica: el bot delega 100% en `rag_definitivo.consultar()` → pipe Open WebUI (misma colección e5, misma guarda, misma síntesis F).

## 5. Cómo configurar el token (para el usuario)

1. En Telegram: conversar con **@BotFather** → `/newbot` → nombre y @usuario; copia el token (solo localmente).
2. PowerShell:
```powershell
cd "C:\Users\USUARIO\OneDrive\Documentos\Proyecto-Organizado\Backend del proyecto"
$env:TELEGRAM_BOT_TOKEN = '<token de BotFather>'
$env:TELEGRAM_AUTHORIZED_USERS = '<tu id de Telegram o @usuario>'   # quién puede usarlo
docker start iub-open-webui          # motor RAG (y Ollama debe estar activo con llama3.2:1b)
.\venv\Scripts\python.exe scripts\bot_telegram.py
```
O editorialmente escribir las variables en `Backend del proyecto/.env` (no versionado).

3. Si prefiere no столкнется con PowerShell cada vez: crear `Backend del proyecto\.env` con `TELEGRAM_BOT_TOKEN=` y `OWUI_TOKEN=` — el launcher lo lee automáticamente.

## 6. Prueba de las seis preguntas desde Telegram (una vez con el token)

Enviar desde la cuenta autorizada:
1. `¿Cuáles son los requisitos de ingreso a pregrado?`
2. `¿Qué requisitos se necesitan para ingresar a posgrado?`
3. `¿Cuáles son los requisitos para realizar prácticas?`
4. `¿Qué establece el Acuerdo 29 de 2021?`
5. `¿Cuál es el horario de atención de la biblioteca?` → **debe devolver la frase de abstención** (guarda)
6. `¿Qué debo hacer para solicitar un servicio que no aparece en los manuales?`

Además: `/start` y `/help`; y un mensaje NO autorizado desde otra cuenta → '⛔'.

Registro: ejecutar el bot con `LOG_BOT_LEVEL=INFO`; las respuestas se capturará desde los logs locales sin secretos; la comparación con Open WebUI es por construcción (mismo pipe; solo varía el muestreo del LLM entre corridas).

## 7. Restricciones — cumplimiento

- ✅ Sin segundo motor RAG (el bot solo consume el canal existente); colección MiniLM original y respaldos intactos.
- ✅ Sin Render/Neon/Access; sin producción; sin puertos entrantes; sin secretos en código/logs/repo.
- ✅ Chatbot TF-IDF clásico intacto; cola/anthropo antedatas preserve.
- ✅ Config F no modificada; suite 226/226.

## 8. Estado

Esperando: **(a)** configuración local de `TELEGRAM_BOT_TOKEN` (+ usuario autorizado) por el equipo del proyecto; **(b)** luego ejecutar la batería de las 6 preguntas desde Telegram y confrontar con el informe; **(c)** cualquier despliegue/integración productiva requiere nueva autorización.
