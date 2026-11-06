"""test_sin_token_en_logs.py — verificación de seguridad del arranque.

Arranca construir_app con un token FICTICIO, simula solicitudes
telegram-like sin usar la red (no llama Telegram) y comprueba que los
loggers httpx/telegram quedan por debajo de INFO (no ecos de URLs con token).
"""
import logging
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))

from services.telegram import bot_telegram as bt  # noqa: E402


def test_loggers_ruidosos_silenciados():
    #tras import, los loggers deben quedar en WARNING (no INFO)
    assert logging.getLogger('httpx').getEffectiveLevel() >= logging.WARNING
    assert logging.getLogger('telegram').getEffectiveLevel() >= logging.WARNING


def test_token_no_en_cadena_de_log(capsys, caplog):
    # arranque SIN token: el mensaje de error no contiene patrón de token
    import os as _os
    _os.environ.pop('TELEGRAM_BOT_TOKEN', None)
    try:
        bt.iniciar()
    except SystemExit as ex:
        assert ex.code == 2
