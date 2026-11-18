"""notificaciones_service.py — Registro y envío best-effort de notificaciones.

Toda notificación (de reporte o automática por evento) se registra en la tabla
notificaciones_email ANTES de intentar el envío, y su estado se actualiza con
el resultado: pendiente → enviado | fallido | no_configurado. Ningún fallo de
correo rompe el flujo principal que la origina.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from services.email_service import (
    AdjuntoCorreo,
    ErrorEnvioCorreo,
    PLANTILLA_HTML,
    enviar_correo,
    smtp_configurado,
)
from models.models import NotificacionEmail, UserTable

TIPO_REPORTE = "reporte_generado"
TIPO_REGISTRO = "registro_usuario"


def registrar_notificacion(
    db: Session,
    *,
    destinatario_id: int | None,
    destinatario_email: str,
    tipo: str,
    asunto: str,
    texto: str,
    html: str | None = None,
    adjunto: AdjuntoCorreo | None = None,
) -> NotificacionEmail:
    """Crea el registro y trata de enviarlo. Nunca lanza hacia el llamador."""
    registro = NotificacionEmail(
        destinatario_id=destinatario_id,
        destinatario_email=(destinatario_email or "")[:100],
        tipo=tipo[:50],
        asunto=asunto[:200],
        estado="pendiente",
    )
    db.add(registro)
    db.flush()

    if not smtp_configurado():
        registro.estado = "no_configurado"
        registro.detalle = (
            "SMTP no configurado en el servidor (MM_SMTP_*). El envío queda "
            "pendiente de configuración."
        )[:500]
    else:
        try:
            enviar_correo(
                registro.destinatario_email,
                registro.asunto,
                texto,
                html=html,
                adjunto=adjunto,
            )
            registro.estado = "enviado"
            registro.enviado_en = datetime.now(timezone.utc)
            registro.detalle = "Entregado al servidor SMTP."
        except ErrorEnvioCorreo as exc:
            registro.estado = "fallido"
            registro.detalle = str(exc)[:500]
    db.commit()
    db.refresh(registro)
    return registro


def notificar_registro_usuario(db: Session, usuario: UserTable) -> NotificacionEmail | None:
    """Aviso automático al correo registrado de un usuario recién creado.

    Evento configurado del parcial 2 (notificaciones por registro de usuarios).
    Devuelve el registro de seguimiento o None si el usuario no tiene correo.
    """
    if not usuario.email:
        return None
    nombre = usuario.nombre or "usuario"
    texto = (
        f"Hola {nombre},\n\n"
        "Tu cuenta fue creada en el Sistema de Gestión Biblioteca de la "
        "Institución Universitaria de Barranquilla (IUB).\n\n"
        f"Rol asignado: {usuario.rol}\n"
        f"Sede: {usuario.sede or 'No asignada'}\n\n"
        "Ingresa con tu número de identificación y la contraseña que te "
        "entregó el administrador. ¡Bienvenido(a)!"
    )
    html = PLANTILLA_HTML.format(
        cuerpo=(
            f"<h2 style='margin-top:0'>¡Bienvenido(a), {nombre}!</h2>"
            "<p>Tu cuenta fue creada en el <strong>Sistema de Gestión "
            "Biblioteca</strong> de la IUB.</p>"
            f"<p><strong>Rol:</strong> {usuario.rol}<br>"
            f"<strong>Sede:</strong> {usuario.sede or 'No asignada'}</p>"
            "<p>Ingresa con tu número de identificación y la contraseña "
            "entregada por el administrador.</p>"
        )
    )
    try:
        return registrar_notificacion(
            db,
            destinatario_id=usuario.id,
            destinatario_email=usuario.email,
            tipo=TIPO_REGISTRO,
            asunto="Bienvenido(a) a la Biblioteca IUB",
            texto=texto,
            html=html,
        )
    except Exception:
        # Defensa total: el registro de usuarios JAMÁS falla por el correo.
        db.rollback()
        return None


def notificar_reporte_generado(
    db: Session,
    *,
    usuario: UserTable,
    titulo: str,
    adjunto: AdjuntoCorreo,
) -> NotificacionEmail:
    """Envía el reporte solicitado al correo registrado del usuario."""
    texto = (
        f"Hola {usuario.nombre or 'usuario'},\n\n"
        f"Adjuntamos el reporte «{titulo}» generado el "
        f"{datetime.now().strftime('%d/%m/%Y a las %H:%M')}.\n\n"
        "Este correo confirma la generación y entrega del archivo solicitado "
        "desde la plataforma Biblioteca IUB."
    )
    html = PLANTILLA_HTML.format(
        cuerpo=(
            f"<h2 style='margin-top:0'>Reporte generado</h2>"
            f"<p>Adjuntamos el reporte <strong>«{titulo}»</strong> generado el "
            f"{datetime.now().strftime('%d/%m/%Y a las %H:%M')}.</p>"
            "<p>Este correo confirma la generación y entrega del archivo "
            "solicitado desde la plataforma.</p>"
        )
    )
    return registrar_notificacion(
        db,
        destinatario_id=usuario.id,
        destinatario_email=usuario.email,
        tipo=TIPO_REPORTE,
        asunto=f"Biblioteca IUB — Reporte: {titulo}",
        texto=texto,
        html=html,
        adjunto=adjunto,
    )
