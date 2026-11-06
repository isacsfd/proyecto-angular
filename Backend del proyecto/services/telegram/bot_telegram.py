"""bot_telegram.py — Bot de Telegram de la Biblioteca IUB

Arquitectura Fase IA 5:
  Usuario Telegram -> long polling (SIN puertos abiertos; solo trafico saliente)
    1) autorizacion (TELEGRAM_AUTHORIZED_USERS, fallo cerrado)
    2) limite: max 3 consultas simultaneas, 1 en vuelo por usuario
    3) services.ia.rag_definitivo.consultar()
       (mismo canal Open WebUI pipe: e5-small -> top-5 -> guarda -> llama3.2:1b)
    4) respuesta en espanol + fuentes, por bloques <= 4096

Seguridad:
* Token SOLO por variable de entorno TELEGRAM_BOT_TOKEN (nunca en codigo).
* Al faltar, el bot no arranca y explica como configurarla (sin eco de secretos).
* Sin webhooks ni puertos entrantes.
* No persiste datos de usuarios.
"""
import asyncio
import logging
import os
import sys
from pathlib import Path

from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from services.telegram.auth import esta_autorizado  # noqa: E402
from services.telegram.utilidades import (  # noqa: E402
    dividir_texto,
    formatear_respuesta,
    longitud_maxima_mensaje,
)


def mapear_usuario(telegram_user_id=None, username=None):
    """Vinculación SEGURA Telegram→usuario de la BD.

    Sólo acepta pares definidos explícitamente en la variable de entorno
    ``TELEGRAM_USER_MAP`` (formato: 'idTelegram:usuarioBD,@username:usuarioBD').
    NUNCA vincula por nombre/username similar: debe coincidir el id o username
    EXACTOS declarados por el administrador. Sin mapping ⇒ sin identidad.
    """
    raw = (os.environ.get('TELEGRAM_USER_MAP', '') or '').strip()
    if not raw:
        return None
    for par in raw.split(','):
        if ':' not in par:
            continue
        k, _, v = par.partition(':')
        k = k.strip().lstrip('@').lower()
        v = v.strip()
        if not k or not v.isdigit():
            continue
        coincide = (
            (telegram_user_id is not None and str(telegram_user_id) == k)
            or (username and username.strip().lstrip('@').lower() == k)
        )
        if coincide:
            return int(v)
    return None


def _atender_db(mensaje: str, user_id=None):
    """Ejecuta el ORQUESTADOR ÚNICO (Fase IA 5.3) con sesión propia de BD.
    Sólo lectura: ningún préstamo/libro se modifica desde el canal."""
    from database import SessionLocal
    from services.ia import asistente
    db = SessionLocal()
    try:
        return asistente.atender(db, mensaje, user_id=user_id, canal="telegram")
    finally:
        db.close()

logging.basicConfig(level=os.environ.get('LOG_BOT_LEVEL', 'INFO'),
                    format='%(asctime)s %(levelname)s %(name)s: %(message)s')
# Los loggers httpx/telegram imprimen URLs COMPLETAS con el token -> silenciar
# (nivel WARNING evita el eco de rutas con secretos).
for _ruidoso in ('httpx', 'telegram'):
    logging.getLogger(_ruidoso).setLevel(logging.WARNING)
log = logging.getLogger('biblioteca_bot')

MENSAJE_BIENVENIDA = (
    '👋 Hola. Soy el Asistente Documental de la Biblioteca IUB.\n\n'
    'Puedes preguntarme sobre los manuales institucionales disponibles '
    '(pregrado, posgrado, prácticas, Acuerdo 29 de 2021 y documentación académica).\n\n'
    'Reglas:\n'
    '• Respondo solo con información verificable de los documentos (citando fuentes).\n'
    '• Si la información no aparece en los documentos, te lo diré con exactitud.\n'
    '• No doy datos personales ni de contacto que no estén en los documentos.\n\n'
    'Usa /help si necesitas ayuda.'
)

MENSAJE_AYUDA = (
    'ℹ️ Uso del Asistente Documental:\n\n'
    '1) Escribe tu pregunta en un solo mensaje (ej. "¿Cuáles son los requisitos '
    'de ingreso a pregrado?").\n'
    '2) Recibirás la respuesta con las fuentes de los documentos.\n'
    '3) Si no hay evidencia suficiente, responderé: "La información solicitada '
    'no aparece en los documentos cargados."\n\n'
    'Comandos: /start · /help'
)

MENSAJE_NO_AUTORIZADO = '⛔ No estás autorizado a usar este bot. Contacta al administrador de la Biblioteca IUB.'

ESTAMPA_PROCESANDO = '⏳ Consultando los manuales institucionales...'


def _env_max_concurrencia() -> int:
    raw = (os.environ.get('TELEGRAM_MAX_CONCURRENCIA', '') or '').strip()
    try:
        v = int(raw)
    except ValueError:
        v = 3
    return max(1, min(8, v))


class EstadoBot:
    """Estado en memoria: consultas en vuelo por usuario (no persiste nada)."""

    def __init__(self):
        self.en_vuelo: set = set()
        self.semaphore = asyncio.Semaphore(_env_max_concurrencia())


ESTADO = EstadoBot()


def token_desde_entorno() -> str:
    return (os.environ.get('TELEGRAM_BOT_TOKEN', '') or '').strip()


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.effective_message.reply_text(MENSAJE_BIENVENIDA)


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.effective_message.reply_text(MENSAJE_AYUDA)


async def responde_denegado(update: Update):
    try:
        await update.effective_message.reply_text(MENSAJE_NO_AUTORIZADO)
    except Exception:  # noqa: BLE001 — sin detalle para no autorizados
        log.info('consulta de usuario no autorizado rechazada (sin registro de identidad)')


async def recibir_mensaje(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_message is None or not (update.effective_message.text or '').strip():
        return
    user = update.effective_user
    texto = update.effective_message.text.strip()

    if not esta_autorizado(user_id=getattr(user, 'id', None), username=getattr(user, 'username', None)):
        await responde_denegado(update)
        _id4 = str(user.id)[-4:] if user else '----'
        log.info('intento de acceso NO autorizado (id****%s)', _id4)
        return

    if user.id in ESTADO.en_vuelo:
        await update.effective_message.reply_text('⏳ Ya tengo una consulta tuya en proceso. Termina esa antes de la siguiente.')
        return
    ESTADO.en_vuelo.add(user.id)
    nota = None
    import time as _time
    _t0 = _time.perf_counter()
    try:
        nota = await update.effective_message.reply_text(ESTAMPA_PROCESANDO)
        async with ESTADO.semaphore:
            ident_bd = mapear_usuario(user.id, getattr(user, 'username', None))
            resultado = await asyncio.to_thread(_atender_db, texto, ident_bd)
        if isinstance(resultado, dict):
            texto_resp = resultado.get('respuesta') or ''
            fuentes = resultado.get('fuentes') or []
        else:
            texto_resp = str(resultado or '')
            fuentes = []
        if not texto_resp.strip():
            await update.effective_message.reply_text(
                '⚠️ El servicio del asistente no está disponible ahora. Intenta más tarde.')
            return
        fuente_extra = None
        if fuentes and 'Fuentes recuperadas' not in texto_resp and resultado.get('intencion') == 'institucional':
            fuente_extra = '**Fuentes documentales:**\n' + '\n'.join(f'- {f}' for f in fuentes[:6])
        salida = formatear_respuesta(texto_resp, fuente_extra)
        for bloque in dividir_texto(salida, longitud_maxima_mensaje()):
            await update.effective_message.reply_text(bloque)
        if nota:
            try:
                await nota.delete()
            except Exception:  # noqa: BLE001
                pass
        # Evidencia local: solo métricas (sin contenido del mensaje ni secretos)
        _id4 = str(user.id)[-4:] if user else '----'
        intent = resultado.get('intencion') if isinstance(resultado, dict) else '?'
        log.info(
            'consulta manejada (canal=telegram, id%s, %d ms, intencion=%s, bloqueada=%s)',
            _id4, round((_time.perf_counter() - _t0) * 1000), intent,
            texto_resp.startswith('La información solicitada') if texto_resp else False,
        )
    except Exception as exc:  # noqa: BLE001
        log.exception('error procesando consulta: %s', str(exc)[:200])
        try:
            await update.effective_message.reply_text(
                '⚠️ Se presentó un error al procesar tu consulta. Intenta más tarde.')
        except Exception:  # noqa: BLE001
            pass
    finally:
        ESTADO.en_vuelo.discard(user.id)


async def callback_error(update, context):
    log.error('telegram: %s', str(context.error)[:200])


def construir_app(token: str) -> Application:
    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler('start', cmd_start))
    app.add_handler(CommandHandler('help', cmd_help))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, recibir_mensaje))
    app.add_error_handler(callback_error)
    return app


def iniciar():
    token = token_desde_entorno()
    if not token:
        log.error(
            'TELEGRAM_BOT_TOKEN no está definido.\n'
            'Configúralo localmente sin escribirlo en archivos ni logs:\n'
            "  $env:TELEGRAM_BOT_TOKEN = '<tu token de BotFather>'\n"
            '  $env:TELEGRAM_AUTHORIZED_USERS = "<tu id o @usuario>"\n'
            'y vuelve a ejecutar este script.')
        raise SystemExit(2)
    app = construir_app(token)
    log.info('Bot iniciado (long polling, sin puertos). Esperando mensajes...')
    app.run_polling(allowed_updates=['message', 'edited_message'])


if __name__ == '__main__':
    iniciar()
