"""auth.py — Control de acceso configurable del bot de Telegram.

Reglas:
* Lista de autorizados desde ``TELEGRAM_AUTHORIZED_USERS`` (separada por
  comas: ids numéricos de Telegram o @usernames).
* Comparación sin distinción de mayúsculas y sin '@'.
* Lista vacía/no definida => NADIE autorizado (fallo cerrado).
* Nunca registra ni imprime el token del bot.
"""

import os


def _normalizar(valor: str) -> str:
    return (valor or '').strip().lstrip('@').lower()


def lista_autorizados() -> set:
    raw = os.environ.get('TELEGRAM_AUTHORIZED_USERS', '')
    return {_normalizar(x) for x in raw.split(',') if x.strip()}


def esta_autorizado(user_id=None, username=None) -> bool:
    autorizados = lista_autorizados()
    if not autorizados:
        return False
    if user_id is not None and str(user_id) in autorizados:
        return True
    if username and _normalizar(username) in autorizados:
        return True
    return False
