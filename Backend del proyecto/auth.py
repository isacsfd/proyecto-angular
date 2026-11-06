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
import uuid
from datetime import datetime, timedelta, timezone
from typing import Mapping, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models.models import UserTable, Rol, Modulo, ModuloRol

# ─── Configuración ────────────────────────────────────────────────────────────
# En producción (RENDER) MM_JWT_SECRET es OBLIGATORIA: nunca se usa un valor por
# defecto. En desarrollo local se exige MM_JWT_PERMITIR_CLAVE_DESARROLLO=1;
# esa clave nunca debe emplearse en producción.
_CLAVE_DESARROLLO = "clave_desarrollo_no_usar_en_produccion"
_SECRETO_MIN_LEN = 32
_TOKEN_MAX_LEN = 8192


def _entorno(env: Optional[Mapping[str, str]] = None) -> Mapping[str, str]:
    return os.environ if env is None else env


def _es_produccion(env: Mapping[str, str]) -> bool:
    return bool(env.get("RENDER")) or (
        (env.get("MM_ENTORNO") or "").strip().lower() in {"produccion", "production"}
    )


def _secreto_jwt(env: Optional[Mapping[str, str]] = None) -> str:
    """Obtiene y valida el secreto JWT. Sin valor por defecto inseguro."""
    entorno = _entorno(env)
    clave = (entorno.get("MM_JWT_SECRET") or "").strip()
    if clave:
        if len(clave) < _SECRETO_MIN_LEN or len(set(clave)) < 8:
            raise RuntimeError(
                "MM_JWT_SECRET es demasiado debil: use al menos 32 caracteres "
                "aleatorios y variados."
            )
        if clave == _CLAVE_DESARROLLO:
            raise RuntimeError("MM_JWT_SECRET no puede ser la clave de desarrollo.")
        return clave

    permitir_dev = (entorno.get("MM_JWT_PERMITIR_CLAVE_DESARROLLO") or "").strip() == "1"
    if permitir_dev and not _es_produccion(entorno):
        return _CLAVE_DESARROLLO
    raise RuntimeError(
        "MM_JWT_SECRET no esta definida. Configure un secreto aleatorio de al "
        "menos 32 caracteres. Solo en desarrollo local puede usar "
        "MM_JWT_PERMITIR_CLAVE_DESARROLLO=1."
    )


def _horas_token(env: Optional[Mapping[str, str]] = None) -> int:
    valor = (_entorno(env).get("MM_TOKEN_HORAS") or "8").strip()
    try:
        horas = int(valor)
    except ValueError:
        raise RuntimeError("MM_TOKEN_HORAS debe ser un entero entre 1 y 24.")
    if not 1 <= horas <= 24:
        raise RuntimeError("MM_TOKEN_HORAS debe estar entre 1 y 24 horas.")
    return horas


def _revocar_antes(env: Optional[Mapping[str, str]] = None) -> Optional[int]:
    """Timestamp de revocacion global de tokens (opcional)."""
    valor = (_entorno(env).get("MM_JWT_REVOCAR_ANTES") or "").strip()
    if not valor:
        return None
    try:
        if valor.isdigit():
            return int(valor)
        fecha = datetime.fromisoformat(valor.replace("Z", "+00:00"))
        if fecha.tzinfo is None:
            fecha = fecha.replace(tzinfo=timezone.utc)
        return int(fecha.timestamp())
    except ValueError:
        raise RuntimeError(
            "MM_JWT_REVOCAR_ANTES debe ser una fecha ISO-8601 o un timestamp Unix."
        )


SECRET_KEY = _secreto_jwt()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = _horas_token()
JWT_ISSUER = (os.getenv("MM_JWT_ISSUER") or "").strip() or None
JWT_AUDIENCE = (os.getenv("MM_JWT_AUDIENCE") or "").strip() or None
REVOCAR_ANTES = _revocar_antes()

# Roles del sistema
SUPER_ADMIN = "super_administrador"
ROLES_ADMIN = ("super_administrador", "Administrador")

# ─── Esquema de seguridad (lee el header Authorization: Bearer <token>) ───────
# auto_error=False: si no hay header, manejamos el 401 manualmente (HTTPBearer
# por defecto devuelve 403, lo que confunde a los clientes).
bearer_scheme = HTTPBearer(auto_error=False)


# ─── Crear token ──────────────────────────────────────────────────────────────
def _error_401(detalle: str = "Token invalido o expirado. Inicie sesion nuevamente.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detalle,
        headers={"WWW-Authenticate": "Bearer"},
    )


def crear_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un JWT firmado con claims de vigencia, identificador y sujeto."""
    payload = data.copy()
    ahora = datetime.now(timezone.utc)
    expiracion = ahora + (
        expires_delta if expires_delta else timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    payload.update({
        "exp": expiracion,
        "iat": ahora,
        "nbf": ahora,
        "jti": uuid.uuid4().hex,
    })
    if payload.get("id") is not None:
        payload["sub"] = str(payload["id"])
    if JWT_ISSUER:
        payload["iss"] = JWT_ISSUER
    if JWT_AUDIENCE:
        payload["aud"] = JWT_AUDIENCE
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _decodificar_token(token: str) -> dict:
    """Valida firma, algoritmo, vigencia y estructura de claims."""
    if not token or len(token) > _TOKEN_MAX_LEN:
        raise _error_401()
    opciones = {
        "verify_signature": True,
        "verify_exp": True,
        "verify_iat": True,
        "verify_nbf": True,
        "verify_aud": bool(JWT_AUDIENCE),
        "verify_iss": bool(JWT_ISSUER),
        "require_exp": True,
        "require_iat": True,
        "require_aud": bool(JWT_AUDIENCE),
        "require_iss": bool(JWT_ISSUER),
    }
    kwargs = {}
    if JWT_AUDIENCE:
        kwargs["audience"] = JWT_AUDIENCE
    if JWT_ISSUER:
        kwargs["issuer"] = JWT_ISSUER
    try:
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM], options=opciones, **kwargs
        )
    except JWTError:
        raise _error_401()

    user_id = payload.get("id")
    if isinstance(user_id, bool) or not isinstance(user_id, int) or user_id <= 0:
        raise _error_401("Token invalido. Inicie sesion nuevamente.")
    rol = payload.get("rol")
    if not isinstance(rol, str) or not rol.strip():
        raise _error_401("Token invalido. Inicie sesion nuevamente.")
    sub = payload.get("sub")
    if sub is not None and sub != str(user_id):
        raise _error_401("Token invalido. Inicie sesion nuevamente.")
    jti = payload.get("jti")
    if jti is not None and not isinstance(jti, str):
        raise _error_401("Token invalido. Inicie sesion nuevamente.")
    try:
        iat = int(payload["iat"])
        exp = int(payload["exp"])
    except (KeyError, TypeError, ValueError):
        raise _error_401("Token invalido. Inicie sesion nuevamente.")

    ahora = int(datetime.now(timezone.utc).timestamp())
    if iat > ahora + 60 or exp <= iat:
        raise _error_401("Token invalido. Inicie sesion nuevamente.")
    if REVOCAR_ANTES is not None and iat < REVOCAR_ANTES:
        raise _error_401("La sesion fue revocada. Inicie sesion nuevamente.")
    return payload


def verificar_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> dict:
    """Valida el JWT y devuelve la identidad vigente leida de la base de datos.

    El rol, el rol_id y la sede SIEMPRE se toman de la BD, nunca del token, de
    modo que una degradacion o un traslado de sede surten efecto de inmediato.
    """
    if credentials is None:
        raise _error_401("No autenticado. Incluya un token en el header Authorization.")
    payload = _decodificar_token(credentials.credentials)

    user = db.query(UserTable).filter(UserTable.id == payload["id"]).first()
    if user is None:
        raise _error_401("Usuario no encontrado. Inicie sesion nuevamente.")
    if not user.rol_id or not user.rol:
        raise _error_401("Cuenta sin rol valido. Contacte al administrador.")

    payload["rol"] = user.rol
    payload["rol_id"] = user.rol_id
    payload["id"] = user.id
    payload["sub"] = str(user.id)
    payload["sede"] = user.sede
    return payload


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