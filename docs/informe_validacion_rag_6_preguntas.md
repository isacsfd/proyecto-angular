# Informe de Validación Formal del RAG — 6 Preguntas (Batería Obligatoria)

**Proyecto:** Biblioteca IUB — Taller 1 Corte 2
**Fecha de ejecución:** 2026-11-05
**Stack validado:** Open WebUI 0.13.0 (`iub-open-webui`, solo `127.0.0.1`) + Ollama 0.40.14 + colección "Manuales Institucionales IUB" (`20c6134e-8825-489c-a972-5f713ba43bf1`, 10 archivos).

## Configuración activa durante la batería (NO modificada durante la sesión de pruebas)

| Componente | Valor |
|---|---|
| Modelo workspace | `biblioteca-iub-asistente-documental` |
| Base | `llama3.2:1b` (CPU, ~1,5 GB en RAM) |
| `num_ctx` / `temperature` | 2048 / 0.2 |
| `function_calling` (params del modelo) | `legacy` |
| `ENABLE_RETRIEVAL_QUERY_GENERATION` | `false` (la pregunta del usuario es la query) |
| `RAG_TEMPLATE` | Template estricto anti-alucinación (1045 caracteres, con `{{CONTEXT}}` y `{{QUERY}}`) |
| `TOP_K` / umbral / híbrido / full-context | 3 / 0 / no / no |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (indexados en Chroma) |

Método: `POST /api/chat/completions` con `stream:true`; fragmentos tomados del evento `sources` del stream (contiene `document[]` y `metadata[]` con archivo origen y `start_index`). Verificación cruzada contra los TXT originales en `docs/txt/`.

---

## Resumen de resultados

| # | Pregunta | T. respuesta | Origen de los 3 fragmentos recuperados | Veredicto |
|---|---|---|---|---|
| 1 | Requisitos de ingreso a pregrado | 33,9 s | `manual pregrado.pdf` (×2, start 53581) + `acuerdo_29_...(pdf)` (start 23132) | ⚠️ Parcial |
| 2 | Requisitos para posgrado | 43,6 s | `acuerdo_29...` + `manual pregrado.pdf` (start 26458, 43941) | ❌ Incorrecta (desviación de retrieval) |
| 3 | Requisitos para prácticas | 52,5 s | `manual practicas.pdf` (×3, start 10697) | ✅ Correcta |
| 4 | Acuerdo 29 de 2021 | 22,5 s | `acuerdo_29...(txt)` + `manual posgrado.pdf` + `acuerdo_29...(pdf)` (start 27534) | ⚠️ Parcial-correcta |
| 5 | Horario de atención de la biblioteca | 7,5 s (re-test 6,0 s) | `manual pregrado.pdf` (×3, start 109604, 113950) | ❌ Incorrecta (alucinación consistente) |
| 6 | Servicio que no aparece en los manuales | 32,1 s | `manual pregrado.pdf` (×3, start 43941) | ✅ Correcta con limitaciones |

**Balance: 2 correctas, 2 parciales, 2 incorrectas. Todas las respuestas en español ✅.**

---

## Evidencia por prueba

### P1 — ¿Cuáles son los requisitos de ingreso a pregrado?

- **Fragmentos recuperados (3):**
  - `manual pregrado.pdf` (start 53581): "…como requisito de grado para optar al título académico de cualquiera de los programas de pregrado… ARTÍCULO 50º. Plan de Estudios…"
  - `acuerdo_29_2021_reglamento_extension_5a2ec906ba.pdf` (start 23132): "ARTÍCULO 20. ESTUDIANTES DE FORMACIÓN MODULAR. Son aquellos que cumplen con las siguientes condiciones…"
  - `manual pregrado.pdf`: "…secuenciales y complementarios. Cada uno de los niveles brinda una formación integral… con salidas al mercado laboral y conducente a un título… Parágrafo 2. Características de los Ciclos…"
- **Respuesta del modelo:** "…Los estudiantes deben ser activos… Son estudiantes interesados en un saber específico… deben cumplir con los prerrequisitos y correquisitos establecidos en el artículo 20… tendré la posibilidad de obtener tres títulos: Técnico Profesional, luego Tecnólogo y posteriormente el de Profesional Universitario…"
- **Fuentes citadas:** colección "Manuales Institucionales IUB" (sin ids individuales por el formato del 1B).
- **Verificación cruzada TXT:** `manual pregrado.txt:61` ("…tres títulos: Inicialmente el de Técnico…"), `:67-68` ("ITSA tendrán la posibilidad…"); `acuerdo_29…:167,175,274` (formación modular).
- **Evaluación:** ⚠️ **Parcial.** No inventa datos (todo el contenido proviene de los fragmentos, incluido el nombre "Institución Universitaria ITSA", que está literalmente en los TXT de la época), pero la respuesta no expone los requisitos de admisión de la pregunta: el retriever trajo textos de ciclos propedéuticos/estudiantes modulares por afinidad léxica débil. Respuesta en español, citas a la colección correctas.

### P2 — ¿Qué requisitos se necesitan para ingresar a posgrado?

- **Fragmentos recuperados (3):** causales de suspensión/congelamiento ("No apertura del programa ofertado", "situaciones judiciales", "incapacidad > 15 días", "congelamiento del 70%/90% del valor de matrícula"), procedentes mayormente de `acuerdo_29` (extensión/educación continuada) y `manual pregrado`.
- **Respuesta del modelo:** lista de dichas causales presentadas como "requisitos para ingresar a posgrado".
- **Verificación cruzada TXT:** las frases clave están en `acuerdo_29_2021_reglamento_extension_5a2ec906ba.txt:363,365,393` (causales de interrupción — contenido de educación continuada), **no** en la sección de admisiones.
- **Evaluación:** ❌ **Incorrecta.** El retrieval no encontró la sección de requisitos de posgrado (`embedding MiniLM` en español débil) y el modelo atribuyó contenido de congelamiento/causales como "requisitos de ingreso" → incumple el criterio de no atribuir información fuera de contexto. No hay alucinación pura, pero sí atribución errónea.

### P3 — ¿Cuáles son los requisitos para realizar prácticas?

- **Fragmentos recuperados (3):** `manual practicas.pdf` (start 10697) — "…el estudiante debe estar matriculado en el cuatrimestre de prácticas de la IUB… PARÁGRAFO 2. Solo podrán realizar prácticas quienes cumplan los requisitos de su programa… PARÁGRAFO 3. Es necesario que el estudiante se encuentre a paz y salvo académico…", requisito de cuatrimestre, ARTÍCULO 20 Práctica Empresarial (contrato de aprendizaje/pasantía).
- **Respuesta del modelo:** 10 puntos fieles: matrícula en cuatrimestre de prácticas, cumplimiento de requisitos del programa, paz y salvo académico, seguimiento institucional,_labores no remuneradas, reubicaciones, término de contrato con 4 meses mínimos para calificación, etc.
- **Verificación cruzada TXT:** `manual practicas.txt:111` ("Es necesario que el estudiante se encuentre a paz y salvo"), `:249-251` ("…cuatro (4) meses de prácticas… mínimo… máximo seis (6) meses…").
- **Evaluación:** ✅ **Correcta.** Fragmentos del documento correcto, respuesta fiel al contenido, español correcto.

### P4 — ¿Qué establece el Acuerdo 29 de 2021?

- **Fragmentos recuperados (3):** "ARTÍCULO 24. DE LAS DISPOSICIONES ADICIONALES… regularadas por el Comité de Extensión e Investigación", "ARTÍCULO 25. El presente acuerdo rige a partir de la fecha de su publicación… PUBLÍQUESE Y CÚMPLASE. Dado en Barranquilla a los quince (15) días del mes de diciembre de 2021…", y un fragmento de `manual posgrado.pdf` (Acuerdo 072/2025 que cita el Acuerdo 030 de 2021).
- **Respuesta del modelo:** "El Acuerdo 29 de 2021 establece que las actividades que no estén previstas en este acuerdo serán reguladas por el Comité de Extensión e Investigación." (literal del Artículo 24)
- **Verificación cruzada TXT:** `acuerdo_29…txt:485` ("ARTÍCULO 24. DE LAS DISPOSICIONES ADICIONALES…"), `:492` ("mes de diciembre de 2021"), `:496` (firmantes).
- **Evaluación:** ⚠️ **Parcial-correcta.** La respuesta es fiel al fragmento recuperado y no inventa nada; pero es demasiado mínima: no describe el objeto del Acuerdo (crear/modificar el comité y regitar la extendión continuada). Limitación del 1B en síntesis con contexto restringido.

### P5 — ¿Cuál es el horario de atención de la biblioteca?

- **Fragmentos recuperados (3):** `manual pregrado.pdf` (start 109604, 113950) — contenido de "estímulos académicos", un fragmento con ruido OCR y exoneración de matrícula — ninguno contiene un horario de biblioteca.
- **Respuesta del modelo:** "El horario de atención de la biblioteca es de 8:00 a.m. a 8:00 p.m. los días laborables." (sin cita documental).
- **Re-test de estabilidad (misma pregunta, segunda corrida):** misma respuesta alucinada ("8:00 a.m. a 8:00 p.m. los días laborables"), 6,0 s.
- **Verificación cruzada TXT:** `grep "8:00"` y `grep "laborables"` en `docs/txt/*.txt` → **0 resultados en los 5 documentos**. El dato NO existe en la base documental.
- **Evaluación:** ❌ **Incorrecta (alucinación consistente 2/2 en esta batería; 1/3 en todas las corridas históricas).** El modelo responde el dato inventado con confianza y sin fuente. En una corrida previa (sesión de corrección) sí respondió correctamente "La información no aparece en los documentos cargados" → cumplimiento inestable del template con un modelo de 1B sobre CPU.

### P6 — ¿Qué debo hacer para solicitar un servicio que no aparece en los manuales?

- **Fragmentos recuperados (3):** `manual pregrado.pdf` (start 43941) — deberes/derechos del estudiante, reconocimiento/validación de módulos — contenido no directamente aplicable.
- **Respuesta del modelo:** "...en este caso, la respuesta NO aparece en los documentos cargados, por lo que responde exactamente: 'La información solicitada no aparece en los documentos cargados.' y luego indica la lista de documentos disponibles: [1], [2]..." (incluye además meta-texto de las propias instrucciones).
- **Evaluación:** ✅ **Correcta con limitaciones.** Cumple el criterio clave de reconocer la ausencia de información (no inventa un procedimiento). Limitación: mezcla la redacción del template en el texto ("meta-habla"), signo de baja capacidad de instrucción del 1B.

---

## Verificación de los 5 criterios solicitados

| Criterio | Estado | Evidencia |
|---|---|---|
| No inventar información | ❌ NO CUMPLE | P5 alucina "8:00–8:00 p.m." en 2/2 corridas (dato ausente en los 5 TXT; grep = 0 resultados). P1–P6 restantes sin inventos, aunque P6 emite meta-texto. |
| No atribuir a documentos que no la contienen | ⚠️ PARCIAL | P2 atribuye causales de congelamiento (educación continuada) como requisitos de posgrado. P1 y P4 fieles; P3 correcta. |
| Reconocer ausencia de información | ⚠️ PARCIAL | P6 lo hace correctamente; P5 empeora (el caso de 不知道 horario es el patrón más probable de uso real y es donde falla). |
| Citas corresponden a fragmentos recuperados | ✅ CUMPLE (a nivel pipeline) | En todas las pruebas el evento `sources` llega con fragmentos reales + `metadata` con archivo y `start_index` verificables en Chroma/TXT (líneas confirmadas). El texto citado como "[1] Manuales Institucionales IUB" siempre refiere a la colección correcta. |
| Respuestas en español | ✅ CUMPLE | 6/6 en español. |

## Hallazgos técnicos adicionales

1. **El pipeline RAG quedó mecánicamente correcto**, pero la **calidad de generación** es el cuello de botella: `llama3.2:1b` es inconsistente en obedecer el template anti-alucinación cuando el fragmento recuperado no contiene la respuesta; y en síntesis mínima (P4).
2. **La calidad de retrieval en español** es débil con `all-MiniLM-L6-v2` (modelo embeddings orientado a inglés): P1/P2/P5/P6 no recuperaron los fragmentos rectores de la respuesta. Fragmentos con ruido OCR ("www. nsA. Eo !l, co") reflejan el PDF fuente original.
3. "Institución Universitaria ITSA" en respuestas P1/P2 no es alucinación: el texto aparece literalmente en el corpus (`manual pregrado.txt:61,67`, `acuerdo_29…:23,27`); los manuales de la colección conservan el redactado de la época (ITSA→IUB).
4. Latencias de 6–53 s por pregunta son aceptables para demostración local (CPU), con el modelo caliente tras la primera llamada.

## Dictamen final

**NO CUMPLE el criterio pleno de cierre (descrito: todas las documentales respondidas con respuestas sustentadas en fragmentos y fuentes verificables) para pasar directamente a Telegram.** Resultado: 2/6 correctas, 2/6 parciales, 2/6 incorrectas; el fallo crítico es la alucinación consistente cuando la información no existe (P5), exactamente el caso más probable de uso real.

Mejoras candidatas (a aplicar **solo con autorización**, no ejecutadas para no alterar configuración con evidencia registrada):

1. Aumentar `num_ctx` a 4096 (+~0,5–1 GB RAM) y evaluar `TOP_K` 3→5 para dar más margen al 1B.
2. Reindexar los PDFs con extracción más limpia (ya existen TXT de respaldo en `docs/txt/`) para eliminar ruido OCR de las subcolecciones.
3. Cambiar el modelo de embedding por uno multilingüe ligero (evaluando el costo RAM antes de la descarga).
4. Implementar, en el futuro conector Telegram, una guarda determinista: si `sources` llega vacío o el score de recuperación es bajo, responder directamente "La información solicitada no aparece en los documentos cargados" **sin pasar por el LLM** — esto neutraliza la alucinación de P5 a nivel de arquitectura sin depender de la obediencia del 1B.
5. Opcional: evaluar un 1B más reciente/multilingüe (p. ej. `gemma3:1b`) con verificación previa de RAM.

## Cumplimiento de restricciones

- ✅ Configuración RAG **no modificada** durante la batería (solo lecturas GET).
- ✅ No se eliminaron colecciones ni documentos; Chroma y volumen `iub_open_webui_data` intactos.
- ✅ No se modificó Render, Neon ni Access.
- ✅ No se creó el bot de Telegram.
- ✅ Resultados conservados como evidencia (este informe, con fragmentos, tiempos y veredicto por pregunta).
- ✅ Sin credenciales ni tokens impresos o versionados.

## Estado

Pendiente de autorización para: aplicar mejoras listadas y/o iniciar la Fase 4 (Telegram).
