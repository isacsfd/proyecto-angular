from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

from database import Base

# ─── RBAC: roles, módulos y asignación módulo-rol ────────────────────────────
class Rol(Base):
    __tablename__ = "rol"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)
    descripcion = Column(String(255), nullable=True)


class Modulo(Base):
    __tablename__ = "modulos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)
    ruta = Column(String(100), nullable=True)
    descripcion = Column(String(255), nullable=True)
    orden = Column(Integer, nullable=False, default=0)


class ModuloRol(Base):
    __tablename__ = "modulos_X_rol"

    rol_id = Column(Integer, ForeignKey("rol.id"), primary_key=True)
    modulo_id = Column(Integer, ForeignKey("modulos.id"), primary_key=True)


# ─── Usuario (tabla `usuario`, rol por clave foránea a `rol`) ────────────────
class UserTable(Base):
    __tablename__ = "usuario"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    phone = Column(String(50), nullable=False)
    address = Column(String(255), nullable=False)
    rol_id = Column(Integer, ForeignKey("rol.id"), nullable=False)
    rol_rel = relationship("Rol", lazy="joined")
    password = Column(String(255), nullable=False)
    identificacion = Column(String(50), unique=True, index=True)
    nivel_academico = Column(String(50), nullable=True)
    carrera = Column(String(100), nullable=True)
    sede = Column(Enum("Soledad", "Barranquilla", "Colsamiro", name="tipo_sede"), nullable=True, default="Soledad")

    @property
    def rol(self) -> str:
        """Nombre del rol (compatibilidad con el contrato de la API)."""
        return self.rol_rel.nombre if self.rol_rel else ""


class LibraryAccess(Base):
    __tablename__ = "library_access"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    message = Column(String(255), nullable=False)
    status = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())


# ─── Notificaciones por correo (parcial 2: reportes y avisos) ────────────────
class NotificacionEmail(Base):
    """Seguimiento administrativo de cada correo enviado o intentado.

    Estados: pendiente | enviado | fallido | no_configurado.
    Cada envío (reporte solicitado, aviso automático de registro de usuario)
    queda registrado aquí para que los administradores auditen su estado.
    """

    __tablename__ = "notificaciones_email"

    id = Column(Integer, primary_key=True, index=True)
    destinatario_id = Column(Integer, nullable=True, index=True)
    destinatario_email = Column(String(100), nullable=False, index=True)
    # tipo: reporte_generado | registro_usuario
    tipo = Column(String(50), nullable=False, index=True)
    asunto = Column(String(200), nullable=False)
    estado = Column(String(20), nullable=False, default="pendiente", index=True)
    detalle = Column(String(500), nullable=True)
    creado_en = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())
    enviado_en = Column(DateTime, nullable=True)