from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
import re


class UserCreateRequest(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    phone: str = Field(..., min_length=5, max_length=50)
    address: str = Field(..., min_length=5, max_length=255)
    rol: str = Field(..., description="Rol: Administrador, Funcionario, Docente o Estudiante")
    password: str = Field(..., min_length=8, description="Mínimo 8 caracteres, una mayúscula, un número y un símbolo")
    identificacion: str = Field(..., min_length=5, max_length=50)
    nivel_academico: Optional[str] = Field(None, max_length=50)
    carrera: Optional[str] = Field(None, max_length=100)
    sede: str = Field("Soledad", description="Sede del usuario: Soledad, Barranquilla o Colsamiro")

    @field_validator("password")
    @classmethod
    def password_segura(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe tener al menos una letra mayúscula")
        if not re.search(r"[0-9]", v):
            raise ValueError("La contraseña debe tener al menos un número")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("La contraseña debe tener al menos un símbolo (!@#$%...)")
        return v

    @field_validator("rol")
    @classmethod
    def rol_valido(cls, v: str) -> str:
        roles_permitidos = {"super_administrador", "Administrador", "Funcionario", "Docente", "Estudiante"}
        if v not in roles_permitidos:
            raise ValueError(f"Rol no válido. Opciones: {', '.join(roles_permitidos)}")
        return v

    @field_validator("sede")
    @classmethod
    def sede_valida(cls, v: str) -> str:
        sedes = {"Soledad", "Barranquilla", "Colsamiro"}
        if v not in sedes:
            raise ValueError(f"Sede no válida. Opciones: {', '.join(sedes)}")
        return v