# Informe Fase IA 5.3.1 — Calidad de respuestas del RAG (pregrado) y recomendaciones

**Proyecto:** Biblioteca IUB — Taller 1 Corte 2 · **Fecha:** 2026-11-07
**Alcance:** auditoría de pregrado con fragmento exacto; recomendaciones (personalización vs genéricas); disponibilidad; regresión de 10 casos.

---

## 1. Auditoría afirmación ↔ fragmento (pregrado)

**Respuesta ANTES (5.2, 29,9 s)** — afirmaciones 1–8 obtenidas íntegramente del fragmento rank 2:
```
"…Ser Tecnólogo o Profesional… Parágrafo 4. Requisitos de Ingresos para el
Estudiante Nuevo a Nivel de ESPECIALIZACIONES Y MAESTRÍAS: Fotocopia… Formulario…
… egresados de la ITSA, la inscripción no tendrá ningún costo… foto 3x4…
Certificado de Notas… Hoja de vida…"
```
➡ **8/8 afirmaciones de la respuesta provenían de la sección de Especializaciones/Maestrías** (posgrado dentro del manual pregrado.pdf) presentadas como requisitos generales de pregrado. Los requisitos REALES de ingreso (educación básica secundaria + 16 años, CAP/SENA; fotocopia/formulario para nivel técnico; SISBEN, pruebas de Estado) SÍ existen en los fragments rank 4 (d=0.1247) y rank 5 (d=0.1254) — y en la respuesta anterior quedaban excluidos.

**Cambios aplicados (pipe v5.5, reescritura coherente):**
- ALCANCE OBLIGATORIO: "…asocia cada requisito EXACTAMENTE al nivel/programa que el fragmento declare… si no lo declara escribe 'el extracto no especifica el alcance'… NO conviertas un particular en general (ni posgrado→pregrado ni al revés)."
- Porterías determinísticas de salida: (a) sin abstención dentro de respuestas con respaldo; (b) sin líneas meta del template; (c) dedupe de puntos + tope (`max_puntos` de valves) — detenidos robustamente los bucles de repetición detectados al subir `TOP_K` (intent intermedio k=7 causó 19 repeticiones y se revirtió a 5); (d) anotación automática de alcance en cada punto sin nivel/programa explícito; (e) nota global de alcance bajo el footer de fuentes.

**Respuesta DESPUÉS (v5.5)** (37 s; P1 regresión) — 6 puntos maximos (dedupe), footer solo `manual pregrado`:
1. "Para ingresar a pregrado, se requiere ser Técnico Profesional o Tecnólogo del área o de áreas afines…" *(mapeo correcto de ciclos propedéuticos previos del nivel técnico)*
2. "Los estudiantes deben cumplir: (el extracto no especifica el alcance del requisito) — Ser Técnico Profesional o Tecnólogo…; **Haber cursado y aprobado la educación básica secundaria… y ser mayor de [diez y seis] (16)**…; Obtener CAP del SENA…" ← requisitos reales de ingreso (d=0.1247 / 0.1254)
3. inscripción para quienes provengan del Nivel Técnico Profesional (registro del sistema)
4. "Los requisitos de ingreso son: (el extracto no especifica el alcance) — Fotocopia…, Formulario al nivel tecnológico o profesional…" ← parágrafo 2 exacto (nivel tecnológico/profesional)

**Notas de auditoría honestas:**
- Todas las afirmaciones de la respuesta nueva provienen de fragmentos del manual de pregrado; ninguna aloja la sección de maestrías como requisito de pregrado.
- Observación de paráfrasis: el modelo re-escribió "diez y seis (16) años" del fragmento como "diez años (16)" — favorito de observación (paraphrase imprecisa del 1B); el dato correcto está en el fragmento citado (d=0.1254, `manual pregrado.txt: start 6074`).
- La anotación "(el extracto no especifica el alcance)" se aplica donde el texto original no declara el alcance en la porción extraída.

## 2. Recomendaciones (personalización correcta)

Cambios en `services/ia/asistente.py::_atender_recomendaciones`:
- Con **temática en la pregunta** ("recomiéndame libros de física") → recommendations por temática, **etiquetadas NO personalizadas**, con disponibilidad real de cada título y nota "recomendar no garantiza ejemplar disponible".
- Con **usuario identificado (web)** → "Recomendaciones PERSONALIZADAS con tu perfil académico e historial" (carrera + historial + popularidad del recomendador existente), mostrando disponibilidad por título.
- Sin identidad NI temática (Telegram mapeado) → **pregunta primero** qué área/temática interesa y sólo lista "sugerencias POPULARES del catálogo (NO personalizadas)". Ya no presenta genéricas como personalizadas.
- Confirmación de disponibilidad siempre viene de `Libro.Ejemplar` consultado; jamás dice "reservado".
- Disponibilidad sigue con su nota de modelo ("una sede por título, NO copias individuales por sede") y se reforzó: "las cantidades registradas en el sistema NO son inventario físico verificado en estante".

## 3. Regresión (10 casos) — resultados del canal

| Caso | Resultado |
|---|---|
| Catálogo (©asistencia ask) | ✔ datos reales + disponibilidad |
| Disponibilidad existente / sin ejemplares / por sede | ✔ (nota de modelo vigente; sede por título; unidades del sistema) |
| Recomendaciones con usuario | ✔ personalizado + disponibilidad, sin afirmar reserves |
| Recomendaciones sin identidad ni tema | ✔ PREGUNTA temática + populares marcadas |
| Préstamos sin vinculación | ✔ explicación de vinculación segura (no consulta de terceros) |
| Pregrado (RAG) | ✔ solo manual pregrado, pts numerados, nota de alcance |
| Posgrado (RAG) | ✔ footer correcto, puntos con [id] |
| Prácticas (RAG) | ✔ footer correcto |
| Acuerdo 29 (RAG) | ✔ footer correcto, 3 puntos |
| Horario inexistente / servicio no documentado | ✔ guard 89–120 ms, sin LLM |

**Pruebas automatizadas: backend 249/249** (incluye `test_asistente_p0.py`: 22 casos P0; los recomendaciones con temática y ask-first actualizados). La varianza de la generación del 1B queda documentada (puntuación, observación de paráfrasis).

## 4. Dictamen

**APROBADO CON OBSERVACIONES**: no inventa documentos (excepción a vigilar: la paráfrasis de números/edades del 1B); el problema de mezcla de niveles quedó mitigado y cualquier dato sin alcance declarado se anota explícitamente; recomendaciones diferencian personalizado/popular y disponibilidad; el guard final no cambió. Las observaciones siguen ligadas a la capacidad del modelo de síntesis (1B) y se recomiendan evaluar un modelo mayor cuando la RAM lo permita.

## 5. Integridad / restricciones

Render, Neon, esquemas de BD, préstamos, colecciones RAG, documentos y respaldos intactos. El bot de Telegram quedó reiniciado con el código definitivo (PID 24432) y cada código y rama sin cambios en producción.
