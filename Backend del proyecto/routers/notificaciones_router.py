"""notificaciones_router.py — Reportes por correo y seguimiento (parcial 2).

POST /api/notificaciones/reporte
    Envía el reporte (PDF/XLSX) al CORREO REGISTRADO del usuario autenticado.
    El archivo viaja como cuerpo binario de la petición (no multipart: evita
    la dependencia python-multipart); formato y título viajan como consulta.
    Cada intento queda registrado en notificaciones_email (seguimiento).

GET /api/notificaciones/
    Solo administradores: historial de envíos con filtros por tipo/estado.

GET /api/notificaciones/estado-smtp
    Indica si el servidor tiene SMTP configurado (sin exponer secretos), para
    que la interfaz muestre el estado real antes de intentar un envío.
"""
from typing import List, Optional

import anyio
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from auth import solo_administrador, verificar_token
from database import get_db
from services.email_service import AdjuntoCorreo, smtp_configurado
from models.models import NotificacionEmail, UserTable
from services.notificaciones_service import notificar_reporte_generado

router = APIRouter(prefix="/api/notificaciones", tags=["Notificaciones"])

TAMANO_MAX_ADJUNTO = 5 * 1024 * 1024  # 5 MB
FORMATOS_VALIDOS = {
    "pdf": "application/pdf",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


class NotificacionResponse(BaseModel):
    id: int
    destinatario_id: Optional[int] = None
    destinatario_email: str
    tipo: str
    asunto: str
    estado: str
    detalle: Optional[str] = None
    creado_en: Optional[object] = None
    enviado_en: Optional[object] = None
    model_config = ConfigDict(from_attributes=True)


class RespuestaEnvioReporte(BaseModel):
    id: int
    estado: str
    mensaje: str
    destinatario: str


class EstadoSMTPResponse(BaseModel):
    configurado: bool


MENSAJES_ESTADO = {
    "enviado": "Reporte enviado al correo registrado.",
    "fallido": "El correo no pudo enviarse; el intento quedó registrado con su motivo.",
    "no_configurado": (
        "El servidor no tiene SMTP configurado (MM_SMTP_*). El envío quedó "
        "registrado como 'no_configurado' para seguimiento administrativo."
    ),
}


@router.post(
    "/reporte",
    response_model=RespuestaEnvioReporte,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enviar un reporte al correo registrado",
    description=(
        "Recibe el archivo del reporte (PDF o XLSX) como cuerpo binario y lo "
        "envía al correo electrónico registrado del usuario autenticado. "
        "El estado del envío queda registrado para seguimiento administrativo. "
        "Si el SMTP no está configurado, el intento se registra con estado "
        "'no_configurado' (la plataforma nunca falla por el correo)."
    ),
)
async def enviar_reporte_correo(
    request: Request,
    formato: str = Query(..., description="Formato del archivo: pdf o xlsx"),
    titulo: str = Query("", max_length=150, description="Título del reporte"),
    db: Session = Depends(get_db),
    token_data: dict = Depends(verificar_token),
):
    if formato not in FORMATOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Formato no válido: use pdf o xlsx.")

    usuario = db.query(UserTable).filter(UserTable.id == token_data["id"]).first()
    if usuario is None or not usuario.email:
        raise HTTPException(
            status_code=400,
            detail="Su usuario no tiene un correo electrónico registrado.",
        )

    contenido = await request.body()
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo del reporte está vacío.")
    if len(contenido) > TAMANO_MAX_ADJUNTO:
        raise HTTPException(
            status_code=413,
            detail="El reporte supera el tamaño máximo de 5 MB.",
        )

    titulo_limpio = (titulo or "").strip() or "Reporte Biblioteca IUB"
    adjunto = AdjuntoCorreo(
        nombre=f"reporte_biblioteca.{formato}",
        contenido=contenido,
        mime=FORMATOS_VALIDOS[formato],
    )

    # El envío (SMTP bloqueante) corre en el pool de hilos para no frenar el
    # bucle de eventos; el registro del estado ocurre dentro del servicio.
    registro = await anyio.to_thread.run_sync(
        lambda: notificar_reporte_generado(
            db,
            usuario=usuario,
            titulo=titulo_limpio,
            adjunto=adjunto,
        )
    )
    return RespuestaEnvioReporte(
        id=registro.id,
        estado=registro.estado,
        mensaje=MENSAJES_ESTADO.get(registro.estado, "Envío registrado."),
        destinatario=registro.destinatario_email,
    )


@router.get(
    "/",
    response_model=List[NotificacionResponse],
    summary="Historial de notificaciones (seguimiento administrativo)",
    description=(
        "Lista los envíos de correos (reportes y avisos automáticos) con su "
        "estado, detalle y fechas. Solo administradores. Filtros opcionales "
        "por tipo (reporte_generado, registro_usuario) y estado "
        "(pendiente, enviado, fallido, no_configurado)."
    ),
)
def listar_notificaciones(
    tipo: Optional[str] = Query(None, max_length=50),
    estado: Optional[str] = Query(None, max_length=20),
    limite: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    _: dict = Depends(solo_administrador),
):
    consulta = db.query(NotificacionEmail)
    if tipo:
        consulta = consulta.filter(NotificacionEmail.tipo == tipo)
    if estado:
        consulta = consulta.filter(NotificacionEmail.estado == estado)
    return (
        consulta.order_by(NotificacionEmail.creado_en.desc(), NotificacionEmail.id.desc())
        .limit(limite)
        .all()
    )


@router.get(
    "/estado-smtp",
    response_model=EstadoSMTPResponse,
    summary="Estado del SMTP del servidor",
    description=(
        "Indica si el envío de correos está configurado (variables MM_SMTP_*). "
        "No expone credenciales: solo un booleano para la interfaz."
    ),
)
def estado_smtp(_: dict = Depends(verificar_token)):
    return EstadoSMTPResponse(configurado=smtp_configurado())
