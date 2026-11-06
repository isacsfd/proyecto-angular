"""Pruebas de la guarda determinista anti-alucinación del RAG.

Los valores de distancia provienen de la batería empírica 2026-11-06
(colección de prueba cromada con 252 fragmentos de los 5 manuales IUB,
embeddings e5-small, coseno): positivos P1–P4 = 0.1099–0.1516,
negativos P5 (horario inexistente) y P6 (servicio no documentado) = 0.1671–0.1715.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.ia.rag_guard import (  # noqa: E402
    FRASE_AUSENCIA,
    decidir_respuesta,
    evaluate_evidence,
    umbral_evidencia,
)


def test_umbral_por_defecto_calibrado():
    # Recalibrado producción 2026-11-06 (colección agregada e5, 478 chunks):
    # max positivo 0.1385 / min negativo 0.1758 -> punto medio 0.1572.
    assert abs(umbral_evidencia() - 0.1572) < 1e-9


def test_preguntas_documentales_obtienen_evidencia():
    # P1 pregrado, P2 posgrado, P3 prácticas, P4 Acuerdo 29 (top-1 medidos)
    for d in (0.1134, 0.1108, 0.1099, 0.1401):
        ev = evaluate_evidence([d])
        assert ev["evidencia"] is True
        assert ev["mejor_distancia"] == d


def test_pregunta_sin_info_no_aparece_rechazada():
    # P5 horario (0.1671) y P6 servicio no documentado (0.1715)
    for d in (0.1671, 0.1715):
        ev = evaluate_evidence([d])
        assert ev["evidencia"] is False
        frase, usa_llm = decidir_respuesta(ev)
        assert frase == FRASE_AUSENCIA
        assert usa_llm is False


def test_sin_fragmentos_no_evidencia():
    ev = evaluate_evidence([])
    assert ev["evidencia"] is False
    assert ev["mejor_distancia"] is None
    frase, usa_llm = decidir_respuesta(ev)
    assert frase == FRASE_AUSENCIA
    assert usa_llm is False


def test_fragmentos_vacios_cuentan_como_ruido():
    ev = evaluate_evidence([0.10, 0.12], textos_fragmentos=["", "   "])
    assert ev["evidencia"] is False


def test_fragmentos_validos_con_texto_pasan():
    ev = evaluate_evidence([0.1401], textos_fragmentos=["ARTÍCULO 24. DE LAS DISPOSICIONES ADICIONALES... "])
    assert ev["evidencia"] is True


def test_valores_invalidos_se_descartan():
    # NaN strings y None no cuentan como fragmentos
    ev = evaluate_evidence(["no-numérico", None])
    assert ev["evidencia"] is False


def test_umbral_por_variable_de_entorno(monkeypatch):
    monkeypatch.setenv("RAG_EVIDENCE_THRESHOLD", "0.40")
    assert umbral_evidencia() == 0.40
    # Datos "sucios" del motor MiniLM (distancias ~0.39) quedan admitidos:
    # demuestra que el umbral es configurable por motor. Con e5-small se usa 0.155.
    ev = evaluate_evidence([0.3977])
    assert ev["evidencia"] is True


def test_evidencia_borde_rechaza_sobre_el_umbral():
    ev = evaluate_evidence([0.1573])
    assert ev["evidencia"] is False


def test_datos_produccion_fase4_aplican_el_umbral():
    # Fase IA 4 (producción, e5-small, coseno): P4 0.1385 debe pasar; P5/P6 bloquear.
    ev = evaluate_evidence([0.1385])
    assert ev["evidencia"] is True
    for d in (0.1758, 0.1788):
        assert evaluate_evidence([d])["evidencia"] is False
