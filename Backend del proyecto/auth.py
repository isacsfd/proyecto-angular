"""
auth.py — Módulo de autenticación con JWT
==========================================
Genera y verifica tokens JWT para cada sesión de usuario.
Los tokens expiran en 8 horas (jornada laboral completa).

Seguridad:
  - La clave secreta se lee de la variable de entorno MM_JWT_SECRET.
  - El rol se REVALIDA contra la base de datos en cada petición: si un
    administrador es degradado, su token antiguo deja de actuar como
    administrador inmediatamente.

Jerarquía de privilegios:
    super_administrador  >=  Administrador  >=  Funcionario/Docente/Estudiante

Reglas especiales:
    - Solo super_administrador puede crear/gestionar administradores.
    - Solo super_administrador puede gestionar al super_administrador.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models.models import UserTable, Rol, Modulo, ModuloRol

# ─── Configuración ────────────────────────────────────────────────────────────
# En producción define MM_JWT_SECRET con una cadena aleatoria larga.
SECRET_KEY = os.getenv("MM_JWT_SECRET", "dev_insegura_cambiar_en_produccion")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("MM_TOKEN_HORAS", "8"))

# Roles del sistema
SUPER_ADMIN = "super_administrador"
ROLES_ADMIN = ("super_administrador", "Administrador")

# ─── Esquema de seguridad (lee el header Authorization: Bearer <token>) ───────
# auto_error=False: si no hay header, manejamos el 401 manualmente (HTTPBearer
# por defecto devuelve 403, lo que confunde a los clientes).
bearer_scheme = HTTPBearer(auto_error=False)


# ─── Crear token ──────────────────────────────────────────────────────────────
def crear_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un JWT firmado con los datos del usuario.
    'data' debe incluir al menos: id, nombre, rol, identificacion.
    """
    payload = data.copy()
    ahora = datetime.now(timezone.utc)
    expiracion = ahora + (
        expires_delta if expires_delta else timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    payload.update({"exp": expiracion, "iat": ahora})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ─── Verificar token (identidad + rol ACTUAL desde BD) ───────────────────────
def verificar_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> dict:
    """
    Dependencia de FastAPI: valida el JWT, localiza al usuario en la BD y
    devuelve sus datos con el rol ACTUAL (no el que viajaba en el token).
    Lanza 401 si no hay token, es inválido/expirado o el usuario ya no existe.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado. Incluya un token en el header Authorization.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado. Inicie sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido. Inicie sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(UserTable).filter(UserTable.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado. Inicie sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Rol vigente tomado de la BD (revalidación), nunca del token.
    payload["rol"] = user.rol  # nombre del rol (resuelto por rol_id -> rol.nombre)
    payload["rol_id"] = user.rol_id
    payload["id"] = user.id
    return payload


# ─── Helpers de privilegios ───────────────────────────────────────────────────
def es_admin(token_data: dict) -> bool:
    """¿Puede realizar operaciones administrativas? (super o administrador)"""
    return token_data.get("rol") in ROLES_ADMIN


def es_super(token_data: dict) -> bool:
    """¿Es el super administrador?"""
    return token_data.get("rol") == SUPER_ADMIN


def contar_super(db: Session) -> int:
    """Cantidad de usuarios con rol super_administrador."""
    return (
        db.query(UserTable)
        .join(Rol, UserTable.rol_id == Rol.id)
        .filter(Rol.nombre == SUPER_ADMIN)
        .count()
    )


# ─── Dependencias de rol ──────────────────────────────────────────────────────
def solo_administrador(token_data: dict = Depends(verificar_token)) -> dict:
    """
    Restringe el endpoint a administradores y super administradores.
    """
    if not es_admin(token_data):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere rol de Administrador.",
        )
    return token_data


def solo_super_administrador(token_data: dict = Depends(verificar_token)) -> dict:
    """
    Restringe el endpoint únicamente al super administrador.
    """
    if not es_super(token_data):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere rol de Super Administrador.",
        )
    return token_data


# ─── Autorización por módulo (RBAC: modulos_X_rol) ───────────────────────────
def requiere_modulo(nombre_modulo: str):
    """
    Fabrica una dependencia que verifica si el rol del usuario autenticado
    tiene asignado el módulo en la tabla modulos_X_rol. El super administrador
    accede siempre a todos los módulos.
    """
    def dep(
        token_data: dict = Depends(verificar_token),
        db: Session = Depends(get_db),
    ) -> dict:
        if token_data.get("rol") == SUPER_ADMIN:
            return token_data
        rol_id = token_data.get("rol_id")
        if not rol_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. No tienes un rol válido.",
            )
        tiene = (
            db.query(ModuloRol)
            .join(Modulo, ModuloRol.modulo_id == Modulo.id)
            .filter(ModuloRol.rol_id == rol_id, Modulo.nombre == nombre_modulo)
            .first()
        )
        if not tiene:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tienes permiso para el módulo '{nombre_modulo}'.",
            )
        return token_data
    return dep