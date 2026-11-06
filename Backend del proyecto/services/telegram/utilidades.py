"""utilidades.py — Formateo y control de mensajes extensos de Telegram.

* Telegram admite 4096 caracteres por mensaje; ``TELEGRAM_MAX_MSG_LEN``
  permite un límite inferior configurable.
* El corte respeta párrafos cuando es posible (no deja texto a mitad de
  punto sin necesidad).
* ``formatear_respuesta`` une la respuesta del RAG con sus fuentes
  (misma normativa de citación del sistema).
* No imprime nunca el token del bot.
"""

import os


def longitud_maxima_mensaje() -> int:
    raw = os.environ.get('TELEGRAM_MAX_MSG_LEN', '').strip()
    try:
        v = int(raw)
    except ValueError:
        v = 0
    if v <= 0 or v > 4096:
        v = 4096
    return v


def dividir_texto(texto: str, limite: int = None) -> list:
    """Divide en bloques <= limite, respetando párrafos ('\\n\\n')."""
    if limite is None:
        limite = longitud_maxima_mensaje()
    texto = (texto or '').strip()
    if not texto:
        return []
    if len(texto) <= limite:
        return [texto]

    bloques = []
    actual = ''
    for parrafo in texto.split('\n\n'):
        parrafo = parrafo.strip()
        if not parrafo:
            continue
        while len(parrafo) + 2 > limite:
            # párrafo gigante: corte mecánico por caracteres
            if actual.strip():
                bloques.append(actual.strip())
                actual = ''
            bloques.append(parrafo[:limite].strip())
            parrafo = parrafo[limite:]
        if not actual:
            actual = parrafo
        elif len(actual) + len(parrafo) + 2 <= limite:
            actual = actual + '\n\n' + parrafo
        else:
            bloques.append(actual.strip())
            actual = parrafo
    if actual.strip():
        bloques.append(actual.strip())
    return bloques


def formatear_respuesta(respuesta: str, fuente_extra: str = None) -> str:
    """Compone la salida final del bot (respuesta + fuentes, español)."""
    partes = [(respuesta or '').strip()]
    if fuente_extra:
        partes.append(fuente_extra.strip())
    return '\n\n'.join(p for p in partes if p)
