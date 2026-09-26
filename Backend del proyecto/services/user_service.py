from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import HTTPException, status

from models.models import UserTable, LibraryAccess
from requests.access_requests import AccessRequest

def get_user_by_dni(db: Session, dni: str):
    """Busca un usuario por su DNI"""
    user = db.query(UserTable).filter(UserTable.identificacion == dni).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con DNI {dni} no encontrado"
        )
    return user