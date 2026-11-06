"""Pruebas del bot de Telegram (Fase IA 5) — sin red real ni token real.
Verifica: autorización fail-closed, cortes de mensajes extensos, formato de
salida, flujo de consulta (respuesta LLM y bloqueo de guarda) y arranque
sin token.
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402

from services.telegram.auth import esta_autorizado  # noqa: E402
from services.telegram.utilidades import (  # noqa: E402
    dividir_texto,
    formatear_respuesta,
    longitud_maxima_mensaje,
)


# ---- autorización (fallo cerrado) ----

def test_sin_lista_nadie_autorizado(monkeypatch):
    monkeypatch.delenv('TELEGRAM_AUTHORIZED_USERS', raising=False)
    assert esta_autorizado(user_id=1) is False
    assert esta_autorizado(username='cualquiera') is False


def test_autorizado_por_id_y_username(monkeypatch):
    monkeypatch.setenv('TELEGRAM_AUTHORIZED_USERS', '999999, @AlumnoIub')
    assert esta_autorizado(user_id=999999) is True
    assert esta_autorizado(username='alumnoiub') is True
    assert esta_autorizado(username='@AlumnoIub') is True
    assert esta_autorizado(user_id=1, username='otro') is False
    # si el username coincide con el id no debe engañarse con espacios
    assert esta_autorizado(username='') is False


# ---- división de mensajes extensos ----

def test_longitud_maxima_configurable(monkeypatch):
    monkeypatch.delenv('TELEGRAM_MAX_MSG_LEN', raising=False)
    assert longitud_maxima_mensaje() == 4096
    monkeypatch.setenv('TELEGRAM_MAX_MSG_LEN', '150')
    assert longitud_maxima_mensaje() == 150
    monkeypatch.setenv('TELEGRAM_MAX_MSG_LEN', '999999')
    assert longitud_maxima_mensaje() == 4096  # tope duro de Telegram


def test_dividir_texto_respeta_limite():
    texto = '\n\n'.join(f'Párrafo {i} ' + 'x' * 120 for i in range(80))
    bloques = dividir_texto(texto, 500)
    assert len(bloques) > 1
    for b in bloques:
        assert len(b) <= 500


def test_dividir_texto_parrafo_muy_grande():
    texto = 'Z' * 3000 + '\n\n' + 'Y' * 1000
    bloques = dividir_texto(texto, 1500)
    assert all(len(b) <= 1500 for b in bloques)
    reconstruido = ''.join(bloques).replace('\n\n', '')
    assert 'ZZZ' in reconstruido and 'YYY' in reconstruido


def test_formatear_respuesta_incluye_fuentes():
    out = formatear_respuesta('Primera parte', '**Fuentes recuperadas (e5-small):**\n1. manual.pdf')
    assert 'Primera parte' in out
    assert 'manual.pdf' in out


# ---- flujo de consulta (mock del canal, sin red) ----

class _FakeMessage:
    def __init__(self, text=''):
        self.text = text
        self.enviados = []
        self.borrado = False

    async def reply_text(self, texto, **kw):
        self.enviados.append(texto)
        return self

    async def delete(self):
        self.borrado = True


class _Resultado:
    def __init__(self, respuesta='', fuentes=None, error=None):
        self.respuesta = respuesta
        self.fuentes = fuentes or []
        self.guarda = True
        self.error = error


def _update_fake(texto, usuario='999999', username='alumno'):
    return SimpleNamespace(
        effective_user=SimpleNamespace(id=usuario, username=username),
        effective_message=_FakeMessage(texto),
    )


def test_flujo_consulta_llm(monkeypatch):
    from services.telegram import bot_telegram as bt
    monkeypatch.setenv('TELEGRAM_AUTHORIZED_USERS', '999999')
    captured = {}

    def fake_atender(mensaje, user_id=None):
        captured['pregunta'] = mensaje
        captured['user_id'] = user_id
        return {
            'respuesta': '1. Requisito A [1].\n2. Requisito B [2].',
            'intencion': 'institucional',
            'fuentes': ['manual pregrado.pdf'],
        }

    monkeypatch.setattr(bt, '_atender_db', fake_atender)
    upd = _update_fake('¿requisitos de pregrado?')
    ESTADO = bt.ESTADO
    asyncio.run(bt.recibir_mensaje(upd, None))
    assert captured['pregunta'] == '¿requisitos de pregrado?'
    assert upd.effective_message.enviados, 'debe haber respondido'
    assert 'Requisito A [1]' in ' '.join(upd.effective_message.enviados)
    assert 'manual pregrado.pdf' in ' '.join(upd.effective_message.enviados)
    assert 999999 not in ESTADO.en_vuelo  # libera la consulta


def test_flujo_bloqueo_guarda(monkeypatch):
    from services.telegram import bot_telegram as bt
    monkeypatch.setenv('TELEGRAM_AUTHORIZED_USERS', '999999')

    def fake_atender(mensaje, user_id=None):
        return {
            'respuesta': ("La información solicitada no aparece en los documentos cargados. "
                          "(verificado determinísticamente: mejor fragmento 0.1758 > 0.1572)"),
            'intencion': 'institucional',
            'fuentes': [],
        }

    monkeypatch.setattr(bt, '_atender_db', fake_atender)
    upd = _update_fake('¿horario?')
    asyncio.run(bt.recibir_mensaje(upd, None))
    texto = ' '.join(upd.effective_message.enviados)
    assert 'no aparece en los documentos cargados' in texto
    assert '0.1758' in texto


def test_no_autorizado_no_consulta(monkeypatch):
    from services.telegram import bot_telegram as bt
    monkeypatch.setenv('TELEGRAM_AUTHORIZED_USERS', '111111')

    llamados = []

    def fake_consultar(pregunta, timeout_s=None):
        llamados.append(pregunta)
        return _Resultado(respuesta='no debe pasar')

    import services.ia.rag_definitivo as rd
    monkeypatch.setattr(rd, 'consultar', fake_consultar)
    upd = _update_fake('intruso', usuario='999999', username='intruso')
    asyncio.run(bt.recibir_mensaje(upd, None))
    assert not llamados
    assert 'No estás autorizado' in ' '.join(upd.effective_message.enviados)


def test_error_del_canal_avisa_sin_exponer(monkeypatch):
    from services.telegram import bot_telegram as bt
    monkeypatch.setenv('TELEGRAM_AUTHORIZED_USERS', '999999')

    def fake_atender_db(mensaje, user_id=None):
        raise RuntimeError('connection refused 127.0.0.1:5432')

    monkeypatch.setattr(bt, '_atender_db', fake_atender_db)
    upd = _update_fake('consulta')
    asyncio.run(bt.recibir_mensaje(upd, None))
    texto = ' '.join(upd.effective_message.enviados)
    assert 'Se presentó un error' in texto
    assert 'connection refused' not in texto  # no expone detalle del error


def test_arranque_sin_token_falla_cerrado(monkeypatch, caplog):
    from services.telegram import bot_telegram as bt
    monkeypatch.delenv('TELEGRAM_BOT_TOKEN', raising=False)
    with pytest.raises(SystemExit) as ei:
        bt.iniciar()
    assert ei.value.code == 2
    texto_log = caplog.text
    assert 'TELEGRAM_BOT_TOKEN' in texto_log
    assert '123456:ABC' not in texto_log  # no imprime tokens de ejemplo ni secretos
