import re

from fastapi import APIRouter, Depends, status, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from database import get_db
from requests.access_requests import AccessRequest
from responses.access_response import AccessResponse
from services.acces_service import create_access
from services.user_service import get_user_by_dni
from services.rate_limit import limitador_qr, clave_por_ip
from models.models import LibraryAccess, UserTable
from auth import verificar_token, solo_administrador
from typing import List
from datetime import datetime

access_router = APIRouter(
    prefix="/api/library-access",
    tags=["library-access"]
)

# Regla de identificación de Biblioteca IUB: cédula de ciudadanía,
# solo dígitos, entre 6 y 10 caracteres (según datos reales del sistema).
DNI_RE = re.compile(r"^\d{6,10}$")


# ──────────────────────────────────────────────
# POST /api/library-access/  → registrar acceso (público: kiosco QR)
# ──────────────────────────────────────────────
@access_router.post("/", response_model=AccessResponse, status_code=status.HTTP_201_CREATED)
def create_library_access(access_req: AccessRequest, request: Request, db: Session = Depends(get_db)):
    """
    Registra un nuevo intento de acceso a la biblioteca basado en el DNI.
    Es el único endpoint público del módulo (lo usa el lector QR del kiosco).
    Incluye validación estricta del DNI y rate-limit por IP.
    Los mensajes de error nunca exponen datos técnicos (IPs, trazas, etc.).
    """
    # Rate-limit por IP para evitar spam y enumeración de DNIs
    if not limitador_qr.permitir(clave_por_ip(request)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espere un momento e intente nuevamente."
        )

    # Validación estricta del DNI
    dni = (access_req.dni or "").strip()
    if not DNI_RE.fullmatch(dni):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="DNI inválido. Debe contener únicamente dígitos (6 a 10)."
        )

    # 1. Buscar usuario por DNI
    try:
        user = get_user_by_dni(db, dni)
    except HTTPException:
        # Re-lanzar con mensaje genérico y seguro (sin IP ni detalles técnicos)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado. Verifique el código QR e intente nuevamente."
        )
    except Exception:
        # Error interno: NO exponer la excepción original (puede contener IP u otros datos)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al procesar el acceso. Contacte al administrador."
        )

    # 2. Crear el registro de acceso
    try:
        new_access = create_access(db, access_req, user.id, user.nombre)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al registrar el acceso. Intente nuevamente."
        )

    # 3. Respuesta con nombre del usuario correcto (sin exponer datos internos)
    return AccessResponse(
        id=new_access.id,
        user_id=new_access.user_id,
        user_name=user.nombre,      # nombre del usuario ACTUAL, no el último en BD
        message=new_access.message,
        status=new_access.status,
        created_at=new_access.created_at,
    )


# ──────────────────────────────────────────────
# GET /api/library-access/  → listar accesos (SOLO admin/super)
# ──────────────────────────────────────────────
class AccessLogResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_identificacion: str
    message: str
    status: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


@access_router.get("/", response_model=List[AccessLogResponse])
def get_all_library_access(
    db: Session = Depends(get_db),
    _: dict = Depends(solo_administrador),
    skip: int = 0,
    limit: int = 100,
):
    """
    Devuelve los registros de acceso ordenados del más reciente al más antiguo.
    Solo administradores y super administradores. El nombre se obtiene del JOIN
    con la tabla de usuarios (nunca del caché de sesión).
    """
    limit = min(max(limit, 1), 500)  # acotar para evitar cargas excesivas
    try:
        access_logs = (
            db.query(
                LibraryAccess.id,
                LibraryAccess.user_id,
                UserTable.nombre.label("user_name"),
                UserTable.identificacion.label("user_identificacion"),
                LibraryAccess.message,
                LibraryAccess.status,
                LibraryAccess.created_at,
            )
            .join(UserTable, LibraryAccess.user_id == UserTable.id)
            .order_by(LibraryAccess.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return access_logs

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener los registros de acceso."
        )