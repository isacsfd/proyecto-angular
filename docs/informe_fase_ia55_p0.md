# Informe Fase IA 5.5 — Corrección P0: integridad de búsqueda por título y disponibilidad

**Proyecto:** Biblioteca IUB — Taller 1 Corte 2 · **Fecha:** 2026-11-07
**Hallazgos corregidos:** H-5 y H-13 (auditoría 5.4). Alcance EXCLUSIVO de esta fase.

---

## 1. Causa raíz

La intención de *disponibilidad* y el catálogo delegaban directamente en la
búsqueda semántica TF-IDF, que SIEMPRE devuelve el vecino más cercano
(`min_score=0.05`). Con esa vía, un título inexistente («El Código Perdido de la
Biblioteca Babel») presentaba libros no solicitados («Crecimiento en América
Latina…», «Tengo Miedo») como respuesta, con sus cantidades, lo que podía
hacer creer que el título pedido existía.

## 2. Algoritmo aplicado (determinista, reutiliza BD)

`services/ia/disponibilidad.py`:

1. `titulo_especifico(texto)`: detecta sí la consulta va dirigida a UN título
   (misma pedigree: `disponibilidad de X`, `disponibilidad del libro X`,
   `¿tienes el libro X?`, `busca el libro X`, `busca libros <X>`, comillas
   `«X»`/`"X"`). Las formas temáticas (`busca libros de X`, `sobre X`) NO se
   tratan como título y siguen por la búsqueda semántica exacta existente.
2. `determinar_modo(db, titulo)` en orden:
   * **exacto** — comparación normalizada (mayúsculas/acentos/espacios/«» irrelevantes);
   * **parcial** — el título pedido está contenido en un título real;
   * **sugerencia** — `difflib` ≥ 0.78 (títulos parecidos, **sin** disponibilidad);
   * **no_encontrado** — nada razonable → sin alternativos.

`services/ia/asistente.py` (`_atender_disponibilidad` / `_atender_catalogo`):

* exacto/parcial → listado etiquetado «coincidencia exacta/parcial» con disponibilidad consultada en tiempo real;
* sugerencia → «No se encontró el título «X»…" + SUGERENCIAS (NO son coincidencia y NO muestran disponibilidad — requisito 6/7);
* no_encontrado → «No se encontró el título «X» en el catálogo real. Verifica la ortografía…» (requisito 3);
* temáticas → búsqueda semántica existente con cabecera expresa **"Coincidencias semánticas APROXIMADAS (no validan la existencia de un título específico)"** (requisitos 4/5).

La búsqueda semántica, endpoints, RAG/colecciones y guard **NO se modificaron**
(requisito 9; sin duplicar motores).

## 3. Archivos modificados

| Archivo | Cambio |
|---|---|
| `services/ia/disponibilidad.py` | + `titulo_especifico`, `determinar_modo`, `_normalizar_titulo` (deterministas, sólo lectura) |
| `services/ia/asistente.py` | `_atender_disponibilidad`/`_atender_catalogo` usan la estrategia exacto/parcial/sugerencia/no_encontrado; cabecera explícita en semántica |
| `tests/test_p055.py` | NUEVO — 10 pruebas (batería 8 obligatorias + 2 regresión) |
| `tests/test_asistente_p0.py` | mensaje de inexistente actualizado al texto nuevo (literal «No se encontró el título») |

No se tocaron: `busqueda_semantica.py`, endpoints, chatbot clásico, recomendador, RAG/modelos/colecciones/umbral, esquema/préstamos/producción.

## 4. Evidencia antes/después (BD real, sólo lectura — script de auditoría)

| Caso | ANTES (5.4) | DESPUÉS (5.5) |
|---|---|---|
| título exacto "Gestión de municipios turísticos" | lista semántica más larga | **coincidencia exacta** con el título; 2 disponibles; sede Soledad |
| con error tipográfico/truncado | OMITÍA el título deseado | **coincidencia parcial** con el título correcto (etiquetado) |
| inexistente — catálogo ("busca libros El Código Perdido…") | lista de títulos no pedidos | **"No se encontró el título «el codice perdido de la biblioteca babel»…"** |
| inexistente — disponibilidad ("¿disponibilidad de El Código Perdido…?") | lista de títulos no pedidos con cantidades | **"No se encontró el título … Verifica la ortografía…"** |
| temática ("busca libros de administración") | lista sin etiqueta | **Coincidencias semánticas APROXIMADAS** (cabecera expresa) |

## 5. Resultados de pruebas

- `pytest tests` → **260/260 passed** (incremento +11: 10 nuevas P055 + ajustes previos 249→258 + estos).
- Batería obligatoria 5.5: 8/8 casos cubiertos en `tests/test_p055.py` (exacto, parcial, inexistente, pequeñas diferencias por acentos/espacios, error tipográfico con etiqueta de sugerencia, temática sin título, disponibilidad existente/inexistente unificado web+Telegram vía el mismo orquestador) + `determinar_modo` niveles.
- Regresión previa completa sin fallos (chatbot web/Telegram/préstamos/RAG/autorización cuentan en la misma suite).

## 6. Confirmación

No hubo cambios en producción/hosted: Render y Neon intactos; sin migraciones; préstamos intocados; esquema sin cambios; RAG/colecciones/umbral intactos; documentos no alterados. El bot de Telegram fue reiniciado (PID 33344) con el código actualizado; Open WebUI sigue healthy en 127.0.0.1.
