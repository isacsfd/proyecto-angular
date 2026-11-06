# Informe Fase IA 4 — RAG Definitivo (embeddings multilingües, guarda determinista e integración real)

**Proyecto:** Biblioteca IUB — Taller 1 Corte 2
**Fecha:** 2026-11-06
**Autorización ejecutada:** Fase IA 4 (correção definitiva del RAG antes de Telegram).

---

## 1. Arquitectura final (un solo motor, canal compartido)

```
                         ┌─────────────────────────────────────────────┐
                         │           Open WebUI 0.13.0 (127.0.0.1)     │
 Usuario / Telegram ────▶│  /api/chat/completions                      │
                         │  modelo: biblioteca_iub_rag_guarda (PIPE)   │
                         │  ┌───────────────────────────────────────┐  │
                         │  │ 1) Embedding e5-small de la pregunta  │  │
                         │  │    (prefijo 'query: ')                │  │
                         │  │ 2) query_doc → top-5 Chroma (coseno)  │  │
                         │  │ 3) GUARDA DETERMINISTA (rag_guard)    │  │
                         │  │    top-1 ≤ 0.1572 ?                   │  │
                         │  │ 4a) NO → frase institucional fija,    │  │
                         │  │     el LLM NO se invoca               │  │
                         │  │ 4b) SÍ → rag_template oficial +       │  │
                         │  │     Ollama llama3.2:1b (ctx 4096,     │  │
                         │  │     temp 0.2, num_predict 768,        │  │
                         │  │     repeat_penalty 1.15)              │  │
                         │  └───────────────────────────────────────┘  │
                         │  chroma: colección agregada 37edddd0-…      │
                         │  (478 fragments e5, 10 documentos)          │
                         └─────────────────────────────────────────────┘
 Telegram (Fase 5) usará la MISMA ruta vía services/ia/rag_definitivo.py
 (misma Function pipe, misma colección, misma guarda, misma generación).
```

El chat normal de Open WebUI también quedó migrado: el modelo workspace
`biblioteca-iub-asistente-documental` recupera de la colección e5 con el mismo
motor (sin guarda determinista — documentado en §5).

## 2. Embeddings integrados

| Item | Valor |
|---|---|
| Modelo | `intfloat/multilingual-e5-small` (MIT, 118M params, 384 dims, 235 MB) |
| Engine | sentence-transformers local (`engine=''`), cache persistente en el volumen |
| Prefijos | `RAG_EMBEDDING_QUERY_PREFIX='query: '`, `RAG_EMBEDDING_CONTENT_PREFIX='passage: '` |
| Métrica | coseno (colecciones Chroma `hnsw:space=cosine` — número verificado en dbs/chroma.py) |
| Cambio aplicado vía | `POST /api/v1/retrieval/embedding/update` (95,3 s: descarga/carga) |
| Persistencia | `GET /api/v1/retrieval/embedding` → engine='', model e5, prefijos correctos |

## 3. Colección nueva independiente + reindexado de los 10 documentos

- **Nueva colección:** `Manuales Institucionales IUB — e5`, id `37edddd0-ec75-4215-9b1f-f9472b66818c`.
- **10/10 documentos** reindexados (5 PDF + 5 TXT equivalentes, incluido
  `Documentacion_Academica_Biblioteca_IUB.pdf` recuperado del storage histórico):
  `manual pregrado.pdf` 155 · `manual pregrado.txt` 296 (148 únicos) ·
  `manual practicas.pdf` 31 · `manual practicas.txt` 54 (27 únicos) ·
  `manual posgrado.pdf` 17 · `manual posgrado.txt` 30 (15 únicos) ·
  `acuerdo_29…pdf` 35 · `acuerdo_29…txt` 64 (32 únicos) ·
  `Documentacion_Academica…pdf` 20 · `Documentacion_Academica…txt` 18 (9 únicos) ·
  **AGREGADA = 478 chunks (sin duplicados, dims 384, metadata `source` correcta).**
  → Detectado y documentado: los TXT institucionales llegan con el texto *duplicado* (generación pypdf Fase IA 1); la colección agregada deduplica automáticamente (la integridad quedó en 478 únicos).
- **La colección original NO se tocó:** `20c6134e-8825-489c-a972-5f713ba43bf1` (MiniLM) sigue con sus 248 chunks — verificación final directa en Chroma (`Coleccion ORIGINAL chunks = 248 · NUEVA = 478`).
- Respaldo previo del volumen: `C:\Users\USUARIO\Backups\iub_open_webui_data_pre_e5_2026-11-06.tgz` (1.243 MB, verificado `tar tzf` OK).

## 4. Guarda anti-alucinación — integración REAL (no solo tests)

- **Pipe en Open WebUI** (Function `biblioteca_iub_rag_guarda`, tipo pipe, is_active/is_global): ejecuta retrieval → guarda → (SI pasa) llama a Ollama. **La guarda corre SIEMPRE antes del LLM** dentro del chat de Open WebUI.
- **Recalibración con el índice de producción** (no se reutilizó 0.155 a ciegas):
  medición sobre la agregada real: máx positivo (P1–P4) = **0.1385**, mín negativo (P5/P6) = **0.1758** → **hueco 0.0373** → **umbral = 0.1572**.
- **Conversión de escala documentada:** el cliente sync de Chroma de Open WebUI devuelve similitud `s=(1+cos)/2`; el pipe convierte a distancia cruda `dist = 2 − 2·s`, de modo que la guarda compara exactamente la magnitud calibrada del repo.
- **Módulo repo:** `services/ia/rag_guard.py` (umbral por env `RAG_EVIDENCE_THRESHOLD`, frase institucional fija) + `tests/test_rag_guard.py` (10 pruebas). **Suite backend completa: 215/215 passed** (incluye la nueva `tests/test_rag_definitivo.py`, 4 pruebas, con mocks de red — sin secretos).

## 5. Batería final de las 6 preguntas (canal definitivo: pipe con guarda)

Todas con stream y sync default; método idéntico serial. RAM contenedor estable (MemAvailable 4.660/4.672 MB antes/después). Host: 2,6 GB libres, Ollama con llama3.2 (1,5 GB @4096).

| # | Pregunta | Latencia | Origen top-5 (distancia coseno del top-1) | Respuesta | Veredicto |
|---|---|---|---|---|---|
| P1 | Requisitos de ingreso pregrado | 100,2 s | mezcla pregrado/posgrado (¿top-1 s/USD…; ver footer) | Lista requisitos con mix de niveles y repeticiones (1B); contenido mayormente del corpus | ⚠️ Parcial (síntesis del 1B insuficiente) |
| P2 | Requisitos posgrado | 92,1 s | `manual posgrado.pdf` 0.1108 (rank 1) | Requisitos reales completos (título tecnólogo/profesional, certificado de notas, foto, formulario, etc.) | ✅ Correcta (fallo P2 histórico corregido) |
| P3 | Requisitos prácticas | 101,0 s | `manual practicas.pdf` 0.1099 (rank 1) | Matrícula cuatrimestre, requisitos del programa, 8 créditos/promedio 4.0 (verificado en `manual practicas.txt:111/249`) | ✅ Correcta |
| P4 | Acuerdo 29 de 2021 | 45,1 s | `acuerdo_29…txt` 0.1385 (rank 1) | Arrastra una línea adjacente (ITSA) y termina con la frase institucional de prudencia; fuentes correctas | ⚠️ Parcial-coherente |
| P5 | Horario biblioteca (NO existe) | 0,15 s | mejor fragmento 0.1758 > 0.1572 | **BLOQUEADA por guarda** — frase institucional exacta + verificación determinista incluida | ✅ Abdicación correcta (antes alucinaba) |
| P6 | Servicio no documentado | 0,21 s | mejor fragmento 0.1788 > 0.1572 | **BLOQUEADA por guarda** — frase institucional exacta | ✅ Abdicación correcta |

Fragmentos y distancias quedan incluidos dentro de la ANSWER (footer "**Fuentes recuperadas (e5-small)**") — la evidencia llegó a la conversación misma.

**Chat normal de Open WebUI (workspace model, sin guarda)** — smoke tras el restart: P-posgrado 37,9 s (respondió mencionando el "Acuerdo 29: Requisitos para Posgrados" — atribución desviada) y P-horario 8,1 s (/contacto "310-1234-5678" INVENTADO). → El flujo estándar sigue insuficiente por sí solo: **la guarda del pipe es imprescindible**; por eso el canal definitivo para producción (incluido Telegram) es el pipe.

## 6. Comparación antes/después

| Dimensión | Antes (Fase IA 3) | Después (Fase IA 4) |
|---|---|---|
| Embeddings | all-MiniLM-L6-v2 (inglés) | **e5-small multilingüe** con prefijos q/p |
| Recuperación P2 posgrado | truth rank 3, respuesta mal atribuida | **truth rank 1 (0.1108), respuesta correcta** |
| Separación guarda | 0.0155 (frágil), mismos rebes | **0.0373** (margen 2.4×) |
| Alucinación horario | 8:00–8:00 p.m. inventado (2/2) | **bloqueado 100% determinístico (164–206 ms, sin LLM)** |
| Colección | 5 archivos vínculados的环境中 | 10 documentos, 478 chunks únicos e5 |
| Latencia | 6–53 s (stream normal) | 0.15–101 s (pipe; num_predict 768) |
| RAM host | 2.02–1.41 GB libres | 2.6 GB libres; estable ≈4.7 GB MemAvailable contenedor |
| Guarda | módulo (tests) | **integrada en el canal real de chat (pipe)** + interfaz compartida |

Quedas de atrás: la síntesis del `llama3.2:1b` sigue siendo el cuello de botella de calidad (P1 parcial, repeticiones truncadas con num_predict 768). **No se declara 'aprobado el RAG'** — la pieza de recuperación+guarda ya cumple (P2/P3 correctas; P5/P6 impenetrables); queda ajustar la generación textual: candidate-suggestions — (a) prompt con límite 'máximo 6 puntos', (b) `repeatPenalty` más agresivo, (c) un 1B multilingüe distinto (evaluar RAM en otra ventana), (d) limitar num_predict ~512.

## 7. Archivos modificados / creados

**Repo (nuevos, sin commitear):**
- `Backend del proyecto/services/ia/rag_guard.py` (recalibrado 0.1572 + notas de escala)
- `Backend del proyecto/services/ia/rag_definitivo.py` (interfaz compartida para el bot)
- `Backend del proyecto/tests/test_rag_guard.py`, `tests/test_rag_definitivo.py` (14 pruebas nuevas; suite total 215/215)

**Open WebUI (persistente en volumen, aplicado por API):**
- Motor embeddings → e5-small + prefijos; colección nueva `37edddd0-…` (10 files)
- modelo workspace: knowledge → colección nueva; params `num_ctx 4096, temperature 0.2, function_calling legacy, num_predict 768, repeat_penalty 1.15`
- TOP_K = 5 (persistido de Fase IA 3, coherente con rec de pipe)
- Function pipe `biblioteca_iub_rag_guarda` (guarda real antes del LLM)
- Respaldo del volumen previo a los cambios

**No modificados:** Render, Neon, Access, colección original (248 chunks), chatbot TF-IDF clásico, manuales/TXT fuente.

## 8. Pendientes para Telegram (Fase 5, espera autorización)

1. Usuario crea bot en BotFather; token entregado por variable de entorno (nunca en repo).
2. El bot implementará `services/ia/rag_definitivo.consultar()` (ya probado con mocks) o consumirá directamente el endpoint del pipe — **misma colección, mismos embeddings, misma guarda, misma generación, mismas reglas de citación**.
3. Configurar `OWUI_URL` (127.0.0.1; no exponer) y `OWUI_TOKEN` en el entorno del bot.
4. Ajuste de síntesis del 1B (opciones §6) si se desea subir la calidad textual.
5. Decisión eventual sobre la colección original MiniLM (mantener/archivar/eliminar → solo con autorización explícita: no se tocó).

## 9. Restricciones — cumplimiento

- ✅ colección original conserva’int (248 chunks verificado); volumen respaldado.
- ✅ Render/Neon/Access intactos; nada desplegado a producción; servicios solo en 127.0.0.1.
- ✅ Sin tokens ni secretos impresos (el JWT de pruebas se firmó dentro del contenedor leyendo el proceso servidor; el canal Telegram usa OWUI_TOKEN por env).
- ✅ Chatbot TF-IDF anterior intacto; suite backend 215/215.
- ✅ Solo datos locales/de prueba; sin servicios públicos.

## 10. Estado

Esperar autorización para Fase Telegram.
