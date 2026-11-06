# Informe Fase IA 5.2 — Precisión y Coherencia del RAG (post-integración Telegram)

**Proyecto:** Biblioteca IUB — Taller 1 Corte 2
**Fecha:** 2026-11-06
**Problema reportado:** la pregunta pregrado mezclaba contenido de posgrado y una abstención dentro de la misma respuesta.

---

## 1. Causa raíz (auditoría de fragmentos)

Para *«¿Cuáles son los requisitos de ingreso a pregrado?»* el top-5 de e5-small devolvía:

| rank | source | d coseno | Contenido |
|---|---|---|---|
| 1 | `manual posgrado.pdf` (start 0) | 0.1134 | "…podrá fijar requisitos adicionales para **pregrado** → posgrado…" (homologación de PROGRAMA DE POSGRADO) |
| 2 | `manual pregrado.pdf` | 0.1173 | "Ser Tecnólogo u Profesional… al nivel Profesional" (sección traslados/homologación, en el MISMO manual de pregrado) |
| 3 | `manual posgrado.pdf` | 0.1199 | promedio 3.8 para posgrado |
| 4 | `manual pregrado.pdf` | 0.1247 | Certificación SISBEN (requisito de ingreso técnico, contenido correcto) |
| 5 | `manual pregrado.txt` (start 6074) | 0.1254 | "…quienes reúnan los siguientes requisitos" (zona correcta de ingreso) |

**Conclusión:** el embedding semántico agrupa "pregrado" con "programas de posgrado que reciben estudiantes de pregrado" (co-ocurrencia literal) y el 1B mezcla los niveles. Además el 1B agregaba la frase institucional de abstención "como cobertura" en respuestas con contenido.

## 2. Cambios aplicados (solo en el pipe `biblioteca_iub_rag_guarda`; colección/umbral/guarda intocados)

1. **Filtro temático determinista por documento** (función `_filtrar_por_tema` del pipe): mapa `pregrado → manual pregrado.*`, `posgrado → manual posgrado.*`, `prácticas → manual practicas.*`, `Acuerdo 29/Reglamento Extensión → acuerdo_29*`. Si la pregunta menciona un tema y existen fragmentos afines tras el retrieval, conserva SOLO esos fragmentos (renumerados). Si no hay coincidencia de tema, usa el top-5 sin filtrar (P5/P6 nunca se bloquean por este filtro).
2. **Instrucciones de síntesis anti-mezcla y "abstención exclusiva"**: prohibida la mezcla de niveles; la frase de abstención solo si NINGÚN fragmento respalda la respuesta.
3. **Porterías de coherencia en la salida del LLM** (post-proceso determinístico, sin tocar el corpus):
   - elimina líneas que mezclan la abstención con contenido respaldado;
   - elimina líneas meta del template (`<source…>`, "Documentos disponibles", "Preguntas relacionadas");
   - **condicional**: elimina puntos numerados sin citación SOLO si el resto lleva citas (si ninguno cita, conserva la respuesta íntegra — nunca vacía la respuesta).

Corrección parcial de un bug intermedio: la comparación de la frase de abstención usaba la cadena original vs normalizada (fallaba con acentos) — corregido con `_norm()` en ambas partes.

## 3. Regresión comparativa (antes 5.1 vs después 5.2)

| # | Pregunta | Antes (5.1): síntesis | Después (5.2 final): docs en footer | Mezcla abstención | Lat. media |
|---|---|---|---|---|---|
| P1 | pregrado | mezclaba pregrado+posgrado (+abstención) | **solo manual pregrado** | NO | 12.3 s |
| P2 | posgrado | content mixto | **solo manual posgrado** | NO | 8.2 s |
| P3 | prácticas | OK pero con pieces meta | **solo manual practicas** | NO | 12.1 s |
| P4 | Acuerdo 29 | acceptable | **solo acuerdo_29** | NO | 19.2 s |
| P5 | horario (N/A) | bloqueada | bloqueada 119 ms (guard intacto: 0.1758 > 0.1572) | — | 0.12 s |
| P6 | servicio no documentado | bloqueada | bloqueada 92 ms (0.1788 > 0.1572) | — | 0.09 s |

**Latencia media documental: ~15 s** (antes 40–65 s en la fase 5.1).

## 4. Límites residuales (honestos)

1. **P1 relevante pero parcialmente orientada a ciclos propedéuticos** (los fragments top del manual de pregrado traman la zona de continuidad de ciclos): los requisitos concretos de ingreso técnico (educación básica secundaria, CAP/SENA) comparecen pero el "título profesional previo" aparece confusamente como requisito general. Con el doc filtrado, la respuesta es documental, no inventada.
2. **P3 muestra variabilidad del 1B**: en la última corrida quedó como lista de artículos disponibles ("Reglamento", "Artículo 6: CONDICIONES…"), sin síntesis (varianza de generación; en corridas previas del mismo código respondió completa). No inventa; pero es pobre a veces.
3. **P4 punto 2 con una referencia inventada** ("Constitución Política del Estado de Atlántico Sur") — este pápulo CONTINÚA siendo un defecto adjudicado a la capacidad del 1B (hallazgo de(lineerra): el footer de fuentes sigue correcto y la restricción "sin frases de abstención" no mitiga tal clase de invento puntual (tendría que requerirse un modelo mayor o una re-verificación de entidades; queda como trabajo futuro si se autoriza).
4. Ninguna respuesta de las 6 alteró el corpus, el umbral (0.1572) ni la guarda; la colección MiniLM original permanece; Render/Neon intactos; suite automatizada intacta (25/25 en submódulos RAG+bot; 226/226 total previo).

## 5. Dictamen de precisión

**APROBADO CON OBSERVACIONES**: las 6 preguntas producen respuestas documentalmente respaldadas, con un solo documento por tema (footer citado), sin mezcla de nivel ni de abstención; la abthing en sin-evidencia permanece 100% determinística. Las observaciones son de calidad de texto del 1B (variabilidad n P3 y un invento puntual en P4), demandarían un modelo de síntesis mayor (evaluado en Fase 4.1 por RAM) o filtros de entidades adicionales.

**Archivos actualizados (pipe, contenedor):** función `biblioteca_iub_rag_guarda` (v5.2) — mapa temático + porterías. No hay cambios de repo en este ciclo (todo el cambio es de pipeline en Open WebUI; el repositorio conserva rag_guard/rag_definitivo idéntico y suite intacta).
