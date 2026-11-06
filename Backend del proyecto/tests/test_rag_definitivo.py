"""Pruebas de la interfaz compartida rag_definitivo (canal Open WebUI pipe).
Mocks de urllib sin red real.
"""

import io
import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402

from services.ia.rag_definitivo import (  # noqa: E402
    COLECCION_E5,
    EMBEDDINGS,
    MODELO_LLM,
    MODELO_CHAT,
    UMBRAL_EVIDENCIA,
    consultar,
    resumen_para_telegram,
)
from services.ia.rag_guard import FRASE_AUSENCIA  # noqa: E402


def _resp_falsa(eventos, status=200):
    cuerpo = ''.join(
        (isinstance(e, str) and e) or f'data: {json.dumps(e, ensure_ascii=False)}\n\n'
        for e in eventos
    ).encode('utf-8')

    def _clase():
        base = type('_Resp', (io.BytesIO,), {})
        base.status_code = status
        base.status = status
        base.code = status
        return base

    clase = _clase()
    return clase(cuerpo)


def test_identificadores_compartidos():
    assert MODELO_CHAT == 'biblioteca_iub_rag_guarda'
    assert COLECCION_E5 == '37edddd0-ec75-4215-9b1f-f9472b66818c'
    assert EMBEDDINGS == 'intfloat/multilingual-e5-small'
    assert MODELO_LLM == 'llama3.2:1b'
    assert abs(UMBRAL_EVIDENCIA - 0.1572) < 1e-9


def test_consultar_parses_fuentes_y_guarda(monkeypatch):
    eventos = [
        {'sources': [{'source': {'id': COLECCION_E5, 'name': 'manual posgrado.pdf'},
                      'document': ['posgrado debera tener en su programa...'],
                      'metadata': [{'source': 'manual posgrado.pdf', 'start_index': 0,
                                    'distance': 0.1108}]}]},
        {'choices': [{'delta': {'content': 'Requisitos: titulo profesional...'}}]},
        {'choices': [{'delta': {'content': ' [1]'}}]},
    ]
    monkeypatch.setenv('OWUI_TOKEN', 'prueba-no-secreta')
    monkeypatch.setattr(urllib.request, 'urlopen', lambda *a, **k: _resp_falsa(eventos))
    res = consultar('requisitos posgrado')
    assert res.error is None
    assert res.respuesta.endswith('[1]')
    assert res.fuentes and res.fuentes[0]['documento'] == 'manual posgrado.pdf'
    assert res.distancia_top1 == 0.1108
    assert res.guarda is True
    assert not res.fue_bloqueada()


def test_consultar_bloqueo_guarda(monkeypatch):
    eventos = [{'choices': [{'delta': {'content': FRASE_AUSENCIA}}]}]
    monkeypatch.setenv('OWUI_TOKEN', 'prueba-no-secreta')
    monkeypatch.setattr(urllib.request, 'urlopen', lambda *a, **k: _resp_falsa(eventos))
    res = consultar('horario biblioteca')
    assert res.fue_bloqueada()
    assert res.guarda is False
    assert resumen_para_telegram(res) == FRASE_AUSENCIA


def test_consulta_sin_token_falla_cerrada(monkeypatch):
    monkeypatch.delenv('OWUI_TOKEN', raising=False)
    res = consultar('cualquier cosa')
    assert 'OWUI_TOKEN' in res.error
