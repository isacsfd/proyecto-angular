# Informe Técnico — Fase IA 2: Corrección del Pipeline RAG (Open WebUI)

**Proyecto:** Biblioteca IUB — Taller 1 Corte 2
**Fecha:** 2026-11-05
**Estado:** Pipeline RAG corregido y verificado end-to-end. Pendiente lote formal de 5 preguntas documentales + autorización para Fase Telegram.

---

## 1. Diagnóstico (punto exacto donde se perdía el contexto)

Infraestructura: Open WebUI **0.13.0** (contenedor `iub-open-webui`, solo `127.0.0.1:3000`) + Ollama 0.40.14 local + colección de conocimiento **"Manuales Institucionales IUB"** (10 archivos: 5 PDF + 5 TXT, embeddings `sentence-transformers/all-MiniLM-L6-v2`).

Verificación directa del código del contenedor:

1. **Búsqueda vectorial OK**: `query_doc:result` en logs recuperaba fragmentos relevantes de Chroma (ej. `manual pregrado.pdf`, start_index 92638/113950/109604). La BD vectorial estaba bien.
2. **Causa raíz — asociación modelo⇄colección**: en `backend/open_webui/utils/middleware.py` (~línea 2322), el conocimiento adjunto al modelo de workspace **solo se inyecta al pipeline RAG si `metadata.params.function_calling == 'legacy'`**:
   ```python
   model_knowledge = model.get('info', {}).get('meta', {}).get('knowledge', False)
   if model_knowledge and metadata.get('params', {}).get('function_calling') == 'legacy':
       form_data['files'] = [{'type': 'knowledge', ... }, ...]
   ```
   En modo **nativo** (default en 0.13), el conocimiento se expone solo como herramientas builtin (`query_knowledge_files`, etc.) que el LLM debe invocar por sí mismo. Un modelo de 0.5B nunca las invoca → `metadata.files` vacío → `chat_completion_files_handler` sin archivos → 0 fuentes → sin citas.
3. **Causa secundaria — bucle infinito en generation de consultas**: con la corrección anterior aplicada, el pipeline activa `generate_queries` antes del retrieval. El modelo `qwen2.5:0.5b` entró en generación sin fin (~17.000 tokens a 24,8 t/s con context shifts en logs de Ollama) → la petición nunca completaba (>10 min).
4. **Audiencia anti-alucinación**: el modelo revestía alucinaciones (text: "horario 8:00 a.m.–8:00 p.m." NO existe en los 5 TXT — verificado con grep sobre `docs/txt/`).

## 2. Correcciones aplicadas (sin reconstruir Chroma, sin eliminar documentos)

| # | Corrección | Mecanismo | Resultado |
|---|---|---|---|
| 1 | `function_calling: 'legacy'` en params del modelo workspace `biblioteca-iub-asistente-documental` | `POST /api/v1/models/model/update` | Conocimiento de la colección se inyecta a `form_data['files']` → entra al RAG |
| 2 | `ENABLE_RETRIEVAL_QUERY_GENERATION: false` | `POST /api/v1/tasks/config/update` (TaskConfigForm completo) | Pipeline usa la pregunta directa del usuario como query (la búsqueda directa ya era buena) → elimina el 2° LLM y el bucle infinito |
| 3 | Modelo base `llama3.2:1b` (1.3 GB), `num_ctx: 2048`, `temperature: 0.2` | `POST /api/v1/models/model/update` + `docker restart` (el cache `MODELS` no refresca el base model automáticamente) | Scribible con CPU/1.5 GB en RAM ejecutándose; coherente para seguir instrucciones |
| 4 | **RAG template estricto** (español, anti-alucinación) | `POST /api/v1/retrieval/config/update` con solo `{"RAG_TEMPLATE": ...}` (update parcial seguro: `exclude_none=True` en router, verificado) | Prohibición de conocimiento externo; cita `[id]`; frase exacta "La información solicitada no aparece en los documentos cargados." + lista de documentos disponibles |

El template default incluía la línea *"If the answer isn't present in the context but you possess the knowledge... provide the answer using your own understanding"* — esa instrucción era la puerta de las alucinaciones; fue reemplazada.

## 3. Verificación end-to-end (evidencia real)

**Pregunta:** "¿Cuál es el horario de la biblioteca? Cita la fuente exacta del documento."

- **Latencia:** 27,9 s (antes: >10 min sin completar).
- **Fragmentos recuperados (evento `sources` del stream):** 3 documentos de la colección, texto real (ej. "• Todo daño material causado a la planta física o implementos de la institución...").
- **Respuesta:**
  > ### Horario de la Biblioteca
  > La información no aparece en los documentos cargados.
  > ### Documentos disponibles:
  > * Manuales Institucionales IUB (…) * Acuerdo 29 de 2021

Esto demuestra simultáneamente: (a) RAG activo (recuperó fragmentos), (b) citación correcta de fuentes, y (c) **reconocimiento explícito cuando la información no existe** (el mismo modelo antes alucinaba "8:00–8:00 p.m."). Antes de la corrección, la respuesta con `stream:false` tampoco devolvía `citations:[]`; ahora las fuentes viajan en el evento `sources` del stream (formato JSON-line).

## 4. Modelo anti-alucinación: estado y limitaciones

- Base: `llama3.2:1b` (único modelo viable con RAM libre 2.3–3.6 GB, equipo 13.9 GB total; modelos 3B+ descartados — riesgo de agotamiento de RAM, restricción del proyecto).
- Con el template estricto, el caso conocido de alucinación quedó corregido.
- **Limitación residual esperable:** modelos de 1 B tienen capacidad limitada de síntesis; puede fallar en respuestas multi-fuente largas. Mitigación ya aplicada: prompt de sistema + RAG template con reglas obligatorias.

## 5. Pruebas obligatorias — estado

Lote completo de validación (5 preguntas documentales + 1 inexistente con captura formal por pregunta) **pendiente de ejecución formal** con registro en tabla. La prueba semilla (horario) ya valida el criterio crítico de cierre: fragmentos recuperados + fuentes + reconocimiento de ausencia.

## 6. Restricciones — cumplimiento

- ✅ No se modificó Render, Neon ni Access `.accdb` (requiere confirmación docente; MSACCESS.EXE no instalado).
- ✅ No se reconstruyó Chroma; no se eliminaron documentos ni colecciones.
- ✅ Volumen Docker `iub_open_webui_data` conservado (configuraciones persisten tras reinicios).
- ✅ Open WebUI expuesto solo en `127.0.0.1`.
- ✅ Chatbot TF-IDF existente (`Backend del proyecto/services/ia/chatbot.py`) intacto.
- ✅ Sin tokens ni credenciales en el repositorio ni en este informe (token admin solo en localStorage del navegador del usuario).

## 7. Pendiente / siguiente fase (requiere autorización)

1. Ejecutar y registrar el lote formal de las 6 preguntas (tabla: pregunta, fragmentos, contexto, respuesta, fuentes, veredicto).
2. **Fase Telegram** (tras aprobación de este informe): usuario crea bot con BotFather; token entregado vía variable de entorno (nunca en repo); puente hacia Open WebUI API usando el mismo modelo `biblioteca-iub-asistente-documental` y la misma colección.
3. Backlog Angular pendiente (módulos desde `modulos_X_rol`, componentes, DataTables, ocultar IDs) y `Cache-Control`/CORS de FastAPI.
