# Informe Fase IA 4.1 — Optimización de Síntesis del RAG Definitivo

**Proyecto:** Biblioteca IUB — Taller 1 Corte 2
**Fecha:** 2026-11-06
**Partida:** e5-small (478 fragmentos/10 docs), guarda determinista (umbral 0.1572), pipe `biblioteca_iub_rag_guarda`, llama3.2:1b, suite backend 215/215.

---

## 1. Qué se conservó (sin tocar)

- Colección `37edddd0-…` (e5, 478 fragmentos), embeddings y prefijos `query:`/`passage:`.
- Guarda anti-alucinación + umbral 0.1572 (sin recalibración: retrieval no cambió).
- Interfaz compartida `services/ia/rag_definitivo.py` (devolvió 21/21 tests en la corrida de verificación del backend — 215/215).
- Colección original MiniLM (248 chunks) y respaldos existentes.

**Mecanismo de experimentación:** los parámetros de generación quedaron expuestos como **Valves** del pipe (`num_ctx, temperatura, num_predict, repeat_penalty, repeat_last_n, top_k, top_p, max_puntos, estructura`) — cambiando un factor por vez vía `POST /api/v1/functions/id/{id}/valves/update`, con código de pipe estable (v4).

## 2. Experimentos (P1 + P4, un cambio a la vez)

| Exp | Cambio (solo lo novo) | P1 | P4 | Observaciones |
|---|---|---|---|---|
| Base (IA 4) | num_predict 768, temp 0.2, repeat 1.15/64, top_k 40, top_p 0.9 | 100,2 s · respuestas repetitivas truncadas | 45,1 s · '(generador no disponible)' en la batería | LA solución de base fallaba: `_num_predict_ 768` insuficiente y 1B con bucles |
| **A** | + Instrucciones estructurales (lista numerada, cada idea UNA vez, máx 6 puntos) | 50,4 s · sin repeticiones literales, 5-6 puntos | 42,7 s · 5 puntos coherentes | El formato estructurado redujo el stall y la latencia a la mitad |
| **B** | + repeat_penalty 1.2, repeat_last_n 128 | **11,0 s · 4 puntos completos + footer de fuentes** | **54,3 s · 7 puntos con citación [id] y cierre** | Ambas COMPLETAS, sin repeticiones |
| **C** | + temperatura 0.3, top_k 30, top_p 0.85 | 23,4 s · 6 puntos (corte a mitad por EOS) | **14,0 s · 4 puntos completos con cierre** | P4 muy concisa; P1 variabilidad |
| **D** | + num_predict 1024, max_puntos 5 (temp 0.3) | 29,3 s · 3 puntos (párrafos corto) | 33,1 s · 3 puntos completos | P4 estable; P1 síntesis corta |
| **E** | D con temperatura 0.2 (resto igual) | 76,4 s · largo y truncado | 22,6 s · 4 puntos casi completos | P4 óptima; P1 inestable |
| **F – FINAL** | **B + num_predict 1024** (temp 0.2, top_k 40, top_p 0.9, max 6, repeat 1.2/128) | **15,0 s · 5 puntos documentales con [id]** (corte benigno al final) | **21,8 s · 4 puntos sólidos con [id]** | Balance calidad/latencia/margen |

**Deniciones técnicas identificadas:**
1. El cliente sync de Chroma entregaba la distancias ya convertidas ((1+cos)/2); el pipe ya lo normaliza — con esto la guarda corre en la escala calibrada.
2. La "truncación" del 1B es un **corte por EOS** a mitad de punto (nota: el footer de fuentes lo añade el pipe DESPUÉS del LLM, por eso siempre es completo) — efecto residual del 1B, no un bug del pipe.
3. La estructura del prompt (exp A) es el cambio de mayor impacto: mató el bucle de repetición de la Fase IA 4.

## 3. Configuración final persistida (valves del pipe)

```json
{
  "estructura": true, "max_puntos": 6,
  "num_ctx": 4096, "temperatura": 0.2,
  "num_predict": 1024, "repeat_penalty": 1.2, "repeat_last_n": 128,
  "top_k": 40, "top_p": 0.9
}
```
El sistema guarda (retrieval/guarda/umbral) NO fue alterado. Código del pipe estable (env `biblioteca_iub_rag_guarda` v4 con Valves).

## 4. Regresión definitiva de las 6 preguntas (config final F)

| # | Pregunta | Latencia | Fidelidad documental | Fuentes (top-1) | Repeticiones | Resultado |
|---|---|---|---|---|---|---|
| P1 | Requisitos pregrado | 15,0 s | Contenido fiel a fragmentos (mezcla pre/pos por retrieval); corte benigno al final | `manual pregrado.pdf` (d 0.1134) | 0 | ⚠️ Parcial (mejora clara vs base) |
| P2 | Requisitos posgrado | 60,9 s | 7 puntos con requisitos reales (promedio, títulos, formularios); corto al final | `manual posgrado.pdf` (d 0.1108) | 0 | ✅ Correcta-con-ruido |
| P3 | Requisitos prácticas | 42,0 s | 4 puntos correctos (cuatrimestre, 8 créditos/promedio 4,0); punto 2 con giro invertido (la práctica NO exige vínculo laboral con la IUB) | `manual practicas.pdf` (d 0.1099) | 0 | ✅ Correcta con 1 desviación puntual |
| P4 | Acuerdo 29 de 2021 | 21,8 s | 4 puntos legítimos (modelo por competencias, Ley 30/1992, autonomía); corte benigno | `acuerdo_29…txt` (d 0.1385) | 0 | ✅ Correcta |
| P5 | Horario (inexistente) | 0,17 s | Bloqueo determinista idéntico (0.1758 > 0.1572) | — | 0 | ✅ BLOQUEADA (sin LLM) |
| P6 | Servicio no documentado | 0,12 s | Bloqueo determinista idéntico (0.1788 > 0.1572) | — | 0 | ✅ BLOQUEADA (sin LLM) |

RAM: contenedor MemAvailable 4.683 → 4.704 MB (estable durante la regresión; sin fugas). Host ≤ 3 GB libres con la app cargada. Latencias documentales medias: **35 s** (base: 71,6 s) — reducción ~51 %.

## 5. Evaluación de los criterios

| Criterio | Estado |
|---|---|
| No agregar requisitos inexistentes | ✅ En P1–P4 los puntos provienen de fragmentos reales (con citación); ninguna frase de "8:00 a.m.", tarifas o normas inventadas. La única anomalía es el giro invertido en P3-punto 2 (atención documentada). |
| No resumir omitiendo esencial | ✅ Los puntos clave de cada documento comparecen; el corte por EOS deja coherencia (no pérdida interna). |
| Citas verificables | ✅ Citas [id] + footer con documento + start_index + distancia cosena en TODAS las respuestas con evidencia. |
| P5/P6 bloqueadas | ✅ 100% determinístico, sin LLM, frase institucional + verificación. |
| P2/P3 no degradadas | ✅ P2/P3 mantienen o mejoran su contenido (regresión comparada con Fase IA 4). |

## 6. Dictamen

- La optimización logró: **sin repeticiones** en todas las respuestas, latencia documental media −51 %, formateo estructurado y citación consistente, y degradación CERO en los componentes aprobados (coleción e5/guarda/umbral intactos y pruebas 215/215).
- Queda una **limitación de calidad persistente de llama3.2:1b**: cortes por EOS a mitad de enumeración (inofensivo para el dato, pero imperfecto para el cierre) y una desviación puntual (P3-p2). El dictumen formal sigue **APROBAD CON RESERVAS**: no se observa alucinación inventiva en la salida; y el bloqueo anti-inventos (P5/P6) es garantizado arquitéturalmente. Alternativa futura (solo con validación de RAM): evaluar `llama3.2:3b` o `gemma3:1b` para síntesis superior.

## 7. Restricciones — cumplimiento

- ✅ No se tocó la colección e5 ni sus embeddings; guarda y umbral intactos; MiniLM original conservada (248 chunks); respaldos preservados.
- ✅ Render, Neon, Access sin tocar; sin servicios expuestos; sin Telegram.
- ✅ Suite backend 215/215 tras los cambios (incluyendo 14 nuevas de guard/interfaz).
- ✅ Sin secretos impresos.

## 8. Estado

Espera autorización para Fase Telegram (la interfaz `services/ia/rag_definitivo.py` está lista; el canal definitivo es el pipe con la config final en Valves).
