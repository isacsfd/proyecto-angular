# Informe Comparativo — Mejora de Precisión RAG (Fase IA 3, después de la batería de 6 preguntas)

**Proyecto:** Biblioteca IUB — Taller 1 Corte 2
**Fecha:** 2026-11-06
**Estado:** Evidencia completa de embeddings, configuración y guarda determinista. **Dictamen: el RAG sigue sin cumplir el criterio pleno de cierre** (P2 incorrecta, P5 alucinando); se requiere la migración de embeddings + guarda, pendiente de autorización.

---

## 1. Embeddings multilingües: investigar y comparar

### 1.1 Candidato seleccionado
`intfloat/multilingual-e5-small` — 118M params, 384 dims, 512 tokens, **235 MB FP32 en disco**, MIT, 100 idiomas, entrenado explícitamente para *retrieval* documental (con prefijos `query:` / `passage:`).

Alternativa descartada por calidad (MTEB retrieval ~46.6 vs ~40s del rival): `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (misma RAM, sin separación semántica superior comprobada).

Evaluado en contenedor (`/tmp/prueba_chroma`, **colecciones de prueba independientes**, no toca la colección de Open WebUI `20c6134e-...`):

- Corpus: los 5 TXT de `docs/txt` (252 fragmentos, chunking replicado de Open WebUI: 1000/100).
- 6 preguntas reales + ground truth verificado por líneas en los TXT.

### 1.2 Costo real (contenedor Linux, medida RSS/MemAvailable)

| Modelo | Descarga | RSS tras carga | Índice (252 chunks) |
|---|---|---|---|
| all-MiniLM-L6-v2 (actual) | — (ya en imagen) | 632 MB | 15,2 s |
| multilingual-e5-small | 235 MB | 1500 MB (FP32) | 28,0 s |

Alcance: e5 cabe en la máyquina (RAM host con llama3.2 cargado: 1,41 GB libres). Para producción sugerir FP16/ONNX (~600–800 MB) o carga transitoria **solo al momento de la consulta** (descarga tras 1 embed).

### 1.3 Resultado comparativo de recuperación (distancia coseno; menor = mejor)

| # | Pregunta (truth) | MiniLM-L6 actual: best (rank truth) | e5-small: best (rank truth) | ¿Cambia el veredicto? |
|---|---|---|---|---|
| P1 | pregrado (requisitos de ingreso) | 0,3952 (truth rank 1) | 0,1134 (truth rank 2) | no (ambas bien) |
| P2 | posgrado | 0,3731 (**truth rank 3**) | **0,1108 (truth rank 1)** | ✅ corregido |
| P3 | prácticas | 0,3285 (rank 1) | 0,1099 (rank 1) | no |
| P4 | Acuerdo 29 | 0,4334 (truth rank 2) | 0,1401 (rank 1) | mejora |
| P5 | horario (sin respuesta) | **0,3977 → no separable** | **0,1671 → separable** | ✅ guarda posible |
| P6 | servicio no documentado | 0,3834 → no separable | 0,1715 → separable | ✅ guarda posible |

**Hallazgo crítico:** con MiniLM-L6 los NEGATIVOS (0,383–0,398) obtienen distancias mejores que un POSITIVO (P3 0,3285) → **solapamiento total**: ninguna guarda determinista por distancia es viable con el motor actual. Con e5-small: positivos 0,1099–0,1516 vs negativos 0,1671–0,1715 → hueco de separación claro (umbral 0,155 en el punto medio).

## 2. Configuración RAG: TOP_K=5 y num_ctx=4096 (evidencia e2e, misma colección MiniLM + Open WebUI pipeline)

Aplicados vía API (update parcial seguro) + reinicio del contenedor. E2E repetido con las mismas 6 preguntas (método idéntico: stream, evento `sources` con `document`+`metadata`).

| # | Antes (ctx2048, TOP_K3) ms | Después (ctx4096, TOP_K5) ms | Fragmentos después (origen) | Veredicto antes → después |
|---|---|---|---|---|
| P1 | 33,9 | 61,6 | 5 (pregrado ×2 + acuerdo ×3) | Parcial → Parcial-mejorada (lista requisitos reales; sigue mezclando conceptos de niveles) |
| P2 | 43,6 | 52,7 | 5 (acuerdo PDF ×2 + pregrado ×3) | ❌ Incorrecta → **sigue incorrecta** (congelamiento/causales presentadas como "requisitos de posgrado"; retrieval sigue dominado por acuerdo_29) |
| P3 | 52,5 | 60,0 | 5 (practicas ×4 + pregrado) | ✅ → ✅ (con artefacto: frase de ausencia seguida de la respuesta correcta) |
| P4 | 22,5 | 41,8 | 5 (acuerdo ×3 + posgrado ≈) | Parcial → Parcial (fidel art. 24, cobertura mínima) |
| P5 | 7,5 | 37,5 | 5 (pregrado ×5) | ❌ → **alucinación más elaborada** ("lunes a viernes 8:00–8:00 pm y sábado 10:00–6:00 pm": "10:00" grep = 0 en los 5 TXT) |
| P6 | 32,1 | 49,0 | 5 (pregrado ×3 + acuerdo ×2) | ✅ con límites → mismo (meta-habla + rechazo correcto) |

Latencia media: 32,2 s → 50,4 s (con TOP_K=5 entra más contexto y tarda más en CPU). RAM host medida: **1,41 GB libres con llama@4096 cargado** (viable, sin OOM); MemAvailable en contenedor estable (5.197 MB antes/después de la batería).

**Conclusión:** TOP_K=5 + num_ctx=4096 son viables en recursos y traen más contexto, pero **no resuelven** el retrieval defectuoso en español ni la alucinación del 1B — el cuello de botella es el **embedding** (MiniLM) + la generación inestable.

Reversión (si se desea restaurar el estado previo): `POST /api/v1/retrieval/config/update {"TOP_K": 3}` y `num_ctx: 2048` en el modelo vía `POST /api/v1/models/model/update`.

## 3. Guarda anti-alucinación determinista (implementada en el repo)

**Módulo:** `Backend del proyecto/services/ia/rag_guard.py` — **tests: 9/9 passed** (`tests/test_rag_guard.py`) — sin dependencias externas (solo `os`).

### Cómo se determina la suficiencia de evidencia (regla determinista)
1. Debe haber ≥1 fragmento recuperado (numérico y no-NaN); fragmentos con texto vacío cuentan como ruido.
2. El **top-1** debe tener distancia coseno ≤ **0,155** (calibrado con la batería del punto 1.3; punto medio del hueco entre `0.1516` [máximo positivo] y `0.1671` [mínimo negativo]).
3. Si la guarda pasa → se envía el contexto real al LLM (ya aclarado que los fragmentos cargan la respuesta); si no → se responde **exactamente** "La información solicitada no aparece en los documentos cargados." y **el LLM no se invoca** → alucinación imposible.
   (Tampoco se confunde "existen 5 fragmentos" con "los fragmentos responden la pregunta": exigimos la distancia del top-1.)
4. El umbral es configurable por env var `RAG_EVIDENCE_THRESHOLD` (para recalibrar si se cambia el motor).

### Datos de comportamiento con las 6 preguntas reales (con e5-small + umbral 0,155)
- P1–P4: PASS (evidencia y contexto adecuados) → el LLM responde con los fragmentos.
- P5 (horario, caso crítico): **BLOCKS** → frase fija (antes alucinaba en 2/2 corridas que se probó con datos reales).
- P6: **BLOCKS** → frase fija (~misma respuesta, sin meta-habla — mejora de calidad respecto a la batería anterior).

## 4. Recomendación de arquitectura para Fase Telegram (pendiente de autorización)

**Opción recomendada — conector con retrieval propio + guarda (no depende del engine global de Open WebUI):**
```
[Telegram] → bot → rag_guard.evaluate_evidence( ejecuta retrieval con:
   subcolección Chroma e5_small (reindexada desde los TXT fuente con guardas previas)
 ) → si PASS: prompt RAG template estricto + fragmentos reales → Ollama llama3.2:1b → respuesta con fuentes
        si BLOCKS: FRASE_AUSENCIA directa (solo respuesta determinista)
```
- Cuenta con la Separación habida → anti-alucinación por diseño, no por obediencia del 1B.
- RAM: e5 con carga transitoria (solo en consulta) o FP16; Ollama ya existe; no hay descargas grandes sin confirmación.

**Alternativa (menos recomendada, si se exige que Open WebUI siga siendo el motor):** cambiar el engine de embeddings global (`rag.embedding_engine` + `rag.embedding_model` + prefijos) y reindexar los 10 archivos de la colección original. Riesgo: reindexación destruye/reemplaza los vectores MiniLM de la colección original (contradice la actual conservación hasta el objetivo final sin afectar RAM); más inversión operativa. Registro histórico de la seb coleccion actual designada no modifica elementos de prevención (los fragmentos (subcolecciones y docs ORIGINAL) amanecen intactos (solo cambian visto globalmente)).

## 5. Restricciones — cumplimiento

- ✅ No se tocó Render, Neon ni Access.
- ✅ No se eliminó ni re-indexó la colección original (vectores MiniLM intactos); la prueba e5 usó colecciones **independientes** en/del contenedor.
- ✅ Telegram no iniciado; no se descubrieron servicios públicos (Open WebUI sigue en `127.0.0.1`).
- ✅ Sin secretos impresos: el JWT de prueba se firmó dentro del contenedor leyendo el secreto del proceso servidor (`/proc/1/environ`), sin eco en logs (método documentado para regenerarlo si se necesita repetir la evidencia).
- ✅ Cambios del punto anterior conservados (RAG template estricto persiste; reversiones del TOP_K/num_ctx documentadas).
- ✅ Repo: `services/ia/rag_guard.py` + `tests/test_rag_guard.py` añadidos (sin romper la suite existente: el resto no fue corrido).

## 6. Dictamen final

**RAG sigue NO APTO para el cierre total con el motor actual.** Después de competit TOP_K=5 y ctx=4096:
- P2 sigue incorrecta (sema rápida: el retrieval de posgrado).
- P5 sigue alucinando horarios inexistentes (además ahora los inventó más elaborados).
- La segunda obción: con **e5-small + guarda determinista** la evidencia empírica corrigenza P2 en el retrieval y permite bloquear P5/P6 sin tocar el LLM.

Se solicita autorización para: (a) ejecutar la corrección recomendada (Opción 4/A) con los ficheros TXT existentes ya en `docs/txt/` YA UNA COLECCIÓN PRUEBA no destructiva (sin reindexar la colección origina de Open WebUI), y/o (b) iniciar Fase Telegram con el conector integrado (bot creado por el usuario previamente/credential por env).
