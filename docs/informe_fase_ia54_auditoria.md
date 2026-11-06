# Informe Fase IA 5.4 — Auditoría Integral del Asistente Bibliotecario (sin cambios de código)

**Proyecto:** Biblioteca IUB — Taller 1 Corte 2 · **Fecha:** 2026-11-07
**Alcance de esta fase:** SOLO auditoría (34 pruebas). Nada implementado. No toca Render/Neon/esquemas/préstamos/umbrales RAG; datos usados en modo **sólo lectura** (BD real vía `MM_DATABASE_URL` del entorno local; sin credenciales impresas).

---

## 1. Metodología de las pruebas (canales)

- **WEB**: petición real a `POST /api/ia/chat` (pipeline completo: clasificador→orquestador→servicios) contra la BD real; token firmado con `MM_JWT_SECRET` del entorno (sin login concretos); institucionales pasan por el pipe Open WebUI (e5+guard) activo.
- **TELEGRAM**: logs reales del bot (PID 24432) de ejecuciones anteriores + pruebas automatizadas (unit) + mensaje de reproducción disponible para la batería en cualquier momento (véase §6).
- **SIEMPRE datos reales**: títulos/autores/cantidades provistos por la BD; nada simulado.

## 2. Matriz de resultados (resumen completo en `C:\Users\USUARIO\AppData\Local\Temp\opencode\audita_54.json`, generada por el script de auditoría)

Leyenda de estado: C = Cumple · CO = Cumple con observación · NO = No cumple (hallazgo).

| # | Canal | Prueba | Esperado | Obtenido (evidencia abreviada) | Estado | Hallazgo |
|---|---|---|---|---|---|---|
| 1 | web | Búsqueda por título exacto | título real + disponibilidad | "Gestión de municipios turísticos — Wallingre, Noemí | sede Soledad. 2 ejemplar(es) disponibles ahora" (idx TF-IDF) | C | — |
| 2 | web | Título parcial ("Gestión") | coincidencias parciales | 4+ títulos "Gestión/Gestion*" con sede y ejemplares | C | — |
| 3 | web | Búsqueda por autor | encuentra por Autor | case autor "Wallingre, Noemí" respondido con el título | C | — |
| 4 | web | Búsqueda con error tipográfico | fuzzy razonable o no-encontrado | devolvió otros títulos de "Gestión*" pero OMITIÓ el solicitado | NO | **H-4 (P1)** |
| 5 | web | Libro inexistente ("El Código Perdido de la Biblioteca Babel") | no encontrado, sin inventar | devolvió lista de títulos ("Crecimiento en América…", "Tengo Miedo") por score semántico menor | NO | **H-5 (P0)** |
| 6 | web | Recomendar temática "ingeniería telemática" | títulos de esa temática | devolvió general de ingeniería (Investigación de Operaciones, Matemáticas, **Biología**) | CO | **H-6 (P1)** |
| 7 | web | Recomendar "redes de computadores" | títulos reales + disponibilidad | respuesta con 4 títulos y disponibilidad ind. | C | — |
| 8 | web | Recomendar sin temática (con usuario) | personalizado según perfil | "Recomendaciones PERSONALIZADAS con tu perfil e historial…" + nota reservar≠disponible | C | — |
| 9 | web | Diferencia populares vs personalizadas | etiquetado claro | sin identidad → pregunta temática y listar "POPULARES (NO personalizadas)" | C | — |
| 10 | web | Recomendar ≠ reservar | nota explícita | "tener recomendación NO equivale a tener ejemplar reservado" + disponibilidad | C | — |
| 11 | web | Disponibilidad libro con ejemplares | disponibles > 0, sede | "2 ejemplar(es) disponibles ahora" (título real) | C | — |
| 12 | web | Disponibilidad libro agotado | 0 disponibles (sin mencia) | "El Héroe Discreto" → **sin ejemplares; en préstamo activo: 1** + nota de modelo | C | **H-7 (P3)** |
| 13 | web | Disponibilidad libro inexistente | no lo encuentra | igual que #5: devolvió títulos no solicitados | NO | **H-13 (P0)** |
| 14 | web | Disponibilidad por sede | nota limitación modelo | "Detalle por sede (una sede por título): Soledad: 693 títulos, 705 ejemplares" + nota (sin copias físicas verificadas) | C | — |
| 15 | web | Requisitos pregrado | documental, alcance cantado | P1 con footer solo manual pregrado + anotación de alcance global | CO | **H-15 (P1: paráfrasis numérica)** |
| 16 | web | Requisitos posgrado | footer correcto | footer `manual posgrado`, promedio 3,8 y homologaciones con [id] | C | — |
| 17 | web | Requisitos prácticas | footer correcto | footer `manual practicas`, cuatrimestre y matrícula | C | — |
| 18 | web | Acuerdo 29 | footer correcto | 3-4 puntos con [id] y Ley 30/1992 | C | — |
| 19 | web | Horario no documentado | guard | "no aparece… (0.1745 > 0.1572)" — sin LLM | C | — |
| 20 | web | Servicio no documentado | guard | ídem | C | — |
| 21–23 | web | Fidelidad numérica (edades, cantidades) | sin alterar datos | **observación:** paráfrasis "diez y seis (16) años" → "diez años (16)" (H-15) | CO | **H-15 (P1)** |
| 24 | web | Porcentajes/requisitos numéricos | fidelidad | promedio ≥3,8 y crédito citados con [id] en posgrado (fidelid. OK) | C | — |
| 25 | web | Préstamos sin identidad | pedir identidad en Telegram / en web informational | "No tienes préstamos activos…" *(nota auditoría: el canal web usa usuario real y siempre tiene identidad; el mensaje de identidad se aplica a Telegram sin mapping)* | CO | **H-25 (P2)** |
| 26 | web | Préstamos de otro usuario | no exponer terceros | la petición ℕo accede a datos de terceros (va a RAG institucional → guard) | C | — |
| 27 | web | RBAC dashboard (rol Estudiante real) | 403 módulo | **HTTP 403** con usuario rol Estudiante (id real) | C | — |
| 28 | telegram | no vincular por username | sólo mapeo explícito | `TELEGRAM_USER_MAP` exacto; tests `test_asistente_p0.py`/`bot` (12+) cubren | C | — |
| 29 | web/tg | errores sin exponer detalle | mensajes genéricos | tests: error oculto ("Se presentó un error…" sin detalle), sin tokens en logs | C | — |
| 30 | ambos | misma pregunta web vs Telegram | mismo servicio | ambos canales pasan por el orquestador; la variación textual es del LLM documental (si aplica) | C | — |
| 31 | ambos | tiempos web | ≤ ~1–3 s datos; RAG 8–48 s | medidos: catálogo 0.5–1.6 s; disponibilidad 0.4–1.4 s; pregrado 48.9 s / posgrado 26.1 s / prácticas 37.6 s / acuerdo 66.8 s (1B CPU) | C (obs latencia 1B) | **H-31 (P2)** |
| 32 | ambos | mensajes largos | bloques ≤4096 | tests unitarios `dividir_texto` (±4096, párrafo gigante) | C | — |
| 33 | ambos | concurrencia | máximo 3, 1 por usuario | semáforo + en-vuelo; tests pasan; incidente previo 'Timed out' manejado con mensaje sin detalle | C | **H-33 (P2: telemetría de timeouts)** |
| 34 | ambos | recuperación Ollama/Open WebUI | respuesta de servicio, sin detalle | incidente real documentado: pipe respondía "(generador no disponible)" y luego se MEJORÓ para decir el motivo interno sin exponer secretos; guard siempre cubre | C | — |

**Teleun bot ativo:** PID 24432 (log `C:\Users\USUARIO\AppData\Local\Temp\opencode\bot_run.err.log`); re-ejecución de las pruebas de Telegram: instrucciones en Fase 5.1 (enviar misma batería; el orquestador ya resuelve libros/disponibilidad/recomendaciones).

## 3. Clasificación de hallazgos (sin implementar)

| Hallazgo | Definición | Severidad | Propuesta (pendiente de autorización) |
|---|---|---|---|
| **H-5 / H-13** | Búsqueda/disponibilidad de título inexistente devuelve títulos semánticamente aproximados, lo que puede inducir a atribuir disponibilidad a un título NO pedido | **P0** | En intención de disponibilidad: primero igualdad exacta/ILIKE del título; si ninguna coincide → "no encontrado en el catálogo" sin listado alternativo; en catálogo, exigir score mínimo más alto o etiqueta "coincidencia semántica aproximada" en la cabecera |
| **H-4** | Búsqueda con typos no alcanza el título deseado (TF-IDF sin normalización de dígrafos/fuzzy) | **P1** | Extender `busqueda_semantica` con normalización y fallback difuso (`difflib`, sin deps externas) |
| **H-6** | Recomendar por temática aparte del programa real (Biología en telemática) | **P1** | Filtrar además por `Programa` pertinente o etiquetar "relacionado de forma general" con explicación |
| **H-15** | Paráfrasis numérica del 1B ("diez y seis (16) años" → "diez años (16)") | **P1** | Portería de verificación numérica: detectar cantidades en la respuesta que no existan literalmente en los fragmentos citados y anotar/reescribir con el valor literal del documento |
| **H-7** | El estado "en préstamo activo: 1" es correcto; la frase singular/dual ("ejemplar… / n. ejemplar(es)") es abrupta | **P3** |.SetValue — pulir redacción plural |
| **H-25** | Mensaje de préstamos sin identidad difiere entre web (usuario real) y Telegram (mapping pendiente) | **P2** | UX: mensaje continuo con instrucciones de vinculación segura (sin tocar BD) |
| **H-31** | Latencia institucional 26–67 s en CPU (1B) | **P2** | Evaluar alternativa de síntesis cuando la RAM lo permita (ya documentado) |
| **H-33** | Incidente 'Timed out' previo sin telemetría específica | **P2** | Métricas mínimas en log (etapa y duración) sin contenido sensible |

## 4. Estado final

- **APROBADO CON OBSERVACIONES** como cuadro general de funcionamiento (comportamientos de seguridad, guard, disponibilidad real y RBAC correctos); observar los hallazgos P0 H-5/H-13 (búsqueda inexistente semántica en intención disponibilidad/catálogo) que exigen corrección ANTES de declarar el asistente apto para usuarios reales libros, y P1 H-4/H-6/H-15 como mejoras de precisión.
- No se implementó nada en esta fase; el orquestador y canales quedaron tal como estaban al inicia la auditoría (bot activo PID 24432 con el código de la 5.3.1).
- No se alteraron: Render, Neon, esquema, préstamos, colecciones RAG, umbral, documentos, respaldos; sin secretos impresos; 249/249 pruebas backend sin cambios.

## 5. Reproducción de la batería Telegram (opcional)

Enviar desde la cuenta autorizada (mismos mensajes que Fase 5.1 adaptados P0):
`/start` · `¿tienes libros de administración?` · `¿disponibilidad de <título real>?` · `¿disponibilidad de <título inexistente>?` · `recomiéndame libros de ingeniería telemática` · `recomiéndame libros` · `¿cuáles son los requisitos de ingreso a pregrado?` · `¿cuál es el horario de atención de la biblioteca?` · texto >4.000 caracteres · dos consultas seguidas.
