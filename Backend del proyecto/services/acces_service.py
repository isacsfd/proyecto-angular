from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import HTTPException, status

from models.models import UserTable, LibraryAccess
from requests.access_requests import AccessRequest


def create_access(db: Session, access_req: AccessRequest, user_id: int, user_name: str):
    """
    Crea un registro de acceso a la biblioteca.
    El mensaje usa el nombre del usuario, nunca datos técnicos ni IPs.
    """
    # Mensaje amigable que incluye el nombre del usuario
    mensaje_registro = access_req.message if access_req.message else f"Acceso registrado para {user_name}"

    new_access = LibraryAccess(
        user_id=user_id,
        message=mensaje_registro,
        status=True
    )

    db.add(new_access)
    db.commit()
    db.refresh(new_access)

    return new_access