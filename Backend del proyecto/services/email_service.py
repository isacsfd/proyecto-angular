"""email_service.py — Envío de correo con SMTP (estándar, sin dependencias nuevas).

Toda la configuración se lee de variables de entorno (nunca secretos en el
código, nunca valores por defecto con credenciales):

    MM_SMTP_HOST      servidor SMTP (p. ej. smtp.gmail.com)
    MM_SMTP_PORT      puerto (587 por defecto; 465 implica SSL)
    MM_SMTP_USER      usuario SMTP (obligatorio)
    MM_SMTP_PASSWORD  contraseña / contraseña de aplicación (obligatorio)
    MM_SMTP_FROM      remitente visible (por defecto, MM_SMTP_USER)
    MM_SMTP_MODO      starttls (defecto) | ssl | ninguno

Sin esas variables el servicio queda "no configurado": los flujos principales
(registro de usuarios, generación de reportes) NUNCA fallan por el correo; el
intento queda registrado en notificaciones_email con estado no_configurado.
"""
import os
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Mapping, Optional


class ErrorEnvioCorreo(Exception):
    """Fallo al entregar el correo (SMTP no configurado o rechazó el envío)."""


@dataclass(frozen=True)
class ConfigSMTP:
    host: str
    puerto: int
    usuario: str
    password: str
    remitente: str
    modo: str  # starttls | ssl | ninguno


@dataclass(frozen=True)
class AdjuntoCorreo:
    nombre: str
    contenido: bytes
    mime: str


def leer_config_smtp(env: Optional[Mapping[str, str]] = None) -> Optional[ConfigSMTP]:
    """Configura el SMTP desde el entorno; None si falta algo obligatorio."""
    entorno = os.environ if env is None else env
    host = (entorno.get("MM_SMTP_HOST") or "").strip()
    usuario = (entorno.get("MM_SMTP_USER") or "").strip()
    password = (entorno.get("MM_SMTP_PASSWORD") or "").strip()
    if not host or not usuario or not password:
        return None
    try:
        puerto = int((entorno.get("MM_SMTP_PORT") or "587").strip())
    except ValueError:
        puerto = 587
    if not 1 <= puerto <= 65535:
        puerto = 587
    remitente = (entorno.get("MM_SMTP_FROM") or "").strip() or usuario
    modo = (entorno.get("MM_SMTP_MODO") or "").strip().lower()
    if modo not in {"starttls", "ssl", "ninguno"}:
        modo = "ssl" if puerto == 465 else "starttls"
    return ConfigSMTP(
        host=host, puerto=puerto, usuario=usuario, password=password,
        remitente=remitente, modo=modo,
    )


def smtp_configurado(env: Optional[Mapping[str, str]] = None) -> bool:
    return leer_config_smtp(env) is not None


def enviar_correo(
    destinatario: str,
    asunto: str,
    texto: str,
    html: Optional[str] = None,
    adjunto: Optional[AdjuntoCorreo] = None,
) -> None:
    """Envía el correo o lanza ErrorEnvioCorreo con el motivo legible.

    Sincrónico (smtplib): se llama desde endpoints `def`, que FastAPI ejecuta
    en su pool de hilos, o desde el proceso de notificación best-effort.
    """
    cfg = leer_config_smtp()
    if cfg is None:
        raise ErrorEnvioCorreo(
            "SMTP no configurado: defina MM_SMTP_HOST, MM_SMTP_USER y "
            "MM_SMTP_PASSWORD en el entorno del servidor."
        )
    if not destinatario or "@" not in destinatario:
        raise ErrorEnvioCorreo("Destinatario sin correo válido.")

    mensaje = EmailMessage()
    mensaje["From"] = cfg.remitente
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto[:200]
    mensaje.set_content(texto)
    if html:
        mensaje.add_alternative(html, subtype="html")
    if adjunto:
        tipo_principal, _, subtipo = adjunto.mime.partition("/")
        if not subtipo:
            tipo_principal, subtipo = "application", "octet-stream"
        mensaje.add_attachment(
            adjunto.contenido,
            maintype=tipo_principal,
            subtype=subtipo,
            filename=adjunto.nombre,
        )

    contexto = ssl.create_default_context()
    try:
        if cfg.modo == "ssl":
            with smtplib.SMTP_SSL(cfg.host, cfg.puerto, context=contexto, timeout=15) as smtp:
                smtp.login(cfg.usuario, cfg.password)
                smtp.send_message(mensaje)
        else:
            with smtplib.SMTP(cfg.host, cfg.puerto, timeout=15) as smtp:
                if cfg.modo == "starttls":
                    smtp.starttls(context=contexto)
                smtp.login(cfg.usuario, cfg.password)
                smtp.send_message(mensaje)
    except ErrorEnvioCorreo:
        raise
    except Exception as exc:  # SMTPResponseException, timeouts, DNS, TLS...
        raise ErrorEnvioCorreo(f"{type(exc).__name__}: {exc}") from exc


PLANTILLA_HTML = """\
<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto">
  <div style="background:#0d6efd;color:#fff;padding:18px 22px;border-radius:8px 8px 0 0">
    <strong style="font-size:16px">Institución Universitaria de Barranquilla — IUB</strong><br>
    <span style="font-size:13px;opacity:.9">Sistema de Gestión Biblioteca</span>
  </div>
  <div style="border:1px solid #dee2e6;border-top:0;border-radius:0 0 8px 8px;padding:22px;color:#212529">
    {cuerpo}
    <p style="margin-top:26px;font-size:12px;color:#6c757d">
      Correo automático de la plataforma Biblioteca IUB. No responda a esta dirección.
    </p>
  </div>
</div>
"""
