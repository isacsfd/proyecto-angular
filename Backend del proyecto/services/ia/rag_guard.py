"""rag_guard.py — Guarda determinista anti-alucinación para el RAG documental
==========================================================================
Decide, ANTES de invocar al LLM, si existe evidencia suficiente en los
fragmentos recuperados para generar una respuesta documental. La regla es
100% determinista (no depende de la obediencia del modelo): si la evidencia
no alcanza el umbral, la respuesta se envía YA FORMADA y el LLM no participa,
eliminando la posibilidad de alucinaciones sobre cursos ausentes.

Criterio de suficiencia de evidencia (recalibrado 2026-11-06, producción):

1. Debe existir al menos ``MIN_FRAGMENTOS`` (default: 1) fragmento recuperado.
2. Un fragmento "recuperado" no implica evidencia: se exige que el top-1
   esté por debajo de un umbral de distancia (similitud semántica fuerte).
3. Se usa distancia coseno (1 - similitud) sobre embeddings ``e5-small``.
   Dos calibraciones con el mismo corpus IUB:
   * Fase IA 3 (colección de prueba, 252 chunks, top-1):
     positivos P1–P4 = 0.1099–0.1516; negativos P5/P6 = 0.1671–0.1715.
   * Fase IA 4 (colección agregada de producción, 478 chunks, top-5):
     positivos P1–P4 = 0.1099–0.1385; negativos P5/P6 = 0.1758–0.1788.
   → Umbral de producción: 0.1572 (punto medio del hueco 0.1385/0.1758,
   margen ±0.0186 por lado).
4. Fragmentos con texto vacío cuentan como ruido: "" no evidencia.
5. Si pasa la guarda, se envía al LLM el contexto; si no, se devuelve
   directamente la frase institucional de ausencia.

NOTA DE CALIBRACIÓN: el umbral 0.1572 corresponde específicamente a
``intfloat/multilingual-e5-small`` (distancia coseno, embeddings
normalizados). Con otro motor la distribución cambia (con
all-MiniLM-L6-v2 los negativos P5/P6 registraron 0.383–0.398 SOLAPADOS con
los positivos 0.329–0.443: impossible calibrar guarda determinista).
Recalibrar con la misma batería antes de cambiar el modelo.

NOTA DE ESCALA (Open WebUI): el cliente sync de Chroma de Open WebUI
devuelve la similitud remapeada ``s = (1 + cos) / 2``; convertir a distancia
con ``dist = 2 - 2*s`` antes de aplicar este umbral (el pipe
``biblioteca_iub_rag_guarda`` ya lo hace).

Variable de entorno opcional: ``RAG_EVIDENCE_THRESHOLD`` (numérico,
distancia coseno) para operar con otro motor de embeddings sin tocar código.
"""

import os

FRASE_AUSENCIA = "La información solicitada no aparece en los documentos cargados."

_UMBRAL_DEFAULT = 0.1572
_MIN_FRAG_DEFAULT = 1


def umbral_evidencia() -> float:
    """Umbral de distancia coseno del top-1 para admitir evidencia."""
    raw = os.environ.get("RAG_EVIDENCE_THRESHOLD", "").strip()
    if raw:
        try:
            v = float(raw)
            if 0 <= v <= 2:
                return v
        except ValueError:
            pass
    return _UMBRAL_DEFAULT


def min_fragmentos_evidencia() -> int:
    raw = os.environ.get("RAG_MIN_FRAGMENTOS", "").strip()
    if raw:
        try:
            v = int(raw)
            if v >= 0:
                return v
        except ValueError:
            pass
    return _MIN_FRAG_DEFAULT


def evaluate_evidence(
    distancias,
    textos_fragmentos=None,
    umbral=None,
    min_fragmentos=None,
):
    """Evalúa la suficiencia de evidencia de una recuperación RAG.

    Parameters
    ----------
    distancias: iterable numérico (distancia coseno por fragmento; menor = más
        similar). Puede ser ``None`` si no hubo retrieval.
    textos_fragmentos: iterable de texto opcional (paralelo a ``distancias``);
        un fragmento vacío/espacios no aporta evidencia.
    umbral: sobrescribe el umbral calculado (p. ej. para baterías).
    min_fragmentos: mínimo de fragmentos con evidencia (default 1).

    Returns
    -------
    dict con ``evidencia`` (bool), ``motivo`` (texto del veredicto),
    ``mejor_distancia`` (float | None) y ``n_fragmentos`` (int).
    """
    if umbral is None:
        umbral = umbral_evidencia()
    if min_fragmentos is None:
        min_fragmentos = min_fragmentos_evidencia()

    limpios = []
    if distancias:
        for d in distancias:
            try:
                d = float(d)
            except (TypeError, ValueError):
                continue
            if d != d:  # NaN
                continue
            limpios.append(d)

    n_util = len(limpios)
    if textos_fragmentos is not None:
        sin_texto = [str(t or "").strip() for t in textos_fragmentos]
        utiles = [d for d, t in zip(limpios, sin_texto) if t]
        n_util = len(utiles)
        limpios = utiles

    if n_util < min_fragmentos:
        return {
            "evidencia": False,
            "motivo": "no se recuperaron fragmentos suficientes",
            "mejor_distancia": None,
            "n_fragmentos": n_util,
        }

    mejor = min(limpios)
    if mejor <= umbral:
        return {
            "evidencia": True,
            "motivo": f"top-1 dentro del umbral ({mejor:.4f} <= {umbral})",
            "mejor_distancia": mejor,
            "n_fragmentos": n_util,
        }
    return {
        "evidencia": False,
        "motivo": (
            f"mejor fragmento fuera del umbral ({mejor:.4f} > {umbral}): "
            "contenido más similar disponible sigue siendo lejano de la pregunta"
        ),
        "mejor_distancia": mejor,
        "n_fragmentos": n_util,
    }


def decidir_respuesta(evaluacion):
    """Dado el dict de ``evaluate_evidence`` devuelve (frase, uso_llm).

    ``uso_llm`` es False cuando la respuesta ya está lista (sin evidencia):
    la frase se entrega tal cual y el LLM NO se invoca → imposible alucinar.
    """
    if evaluacion.get("evidencia"):
        return None, True
    return FRASE_AUSENCIA, False
