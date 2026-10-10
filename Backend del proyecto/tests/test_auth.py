"""Pruebas de autenticación: hashing, login, tokens y roles."""

import pytest
from fastapi import HTTPException
from jose import JWTError, jwt

from app import hash_password, verify_password
from auth import ALGORITHM, SECRET_KEY, crear_token, solo_administrador, verificar_token
from models.models import Rol

from .conftest import crear_usuario, login


class _Credenciales:
    def __init__(self, token):
        self.credentials = token


def test_hash_y_verificacion():
    h = hash_password("Clave1234!")
    assert h != "Clave1234!"
    assert verify_password("Clave1234!", h)
    assert not verify_password("incorrecta", h)


def test_login_exitoso(client, db):
    crear_usuario(db, rol="Estudiante", identificacion="1001")
    r = login(client, "1001", "Clave1234!")
    assert r.status_code == 200
    data = r.json()
    assert data["access_token"]
    assert data["token_type"] == "bearer"
    assert data["user"]["rol"] == "Estudiante"
    assert data["user"]["identificacion"] == "1001"


def test_login_contrasena_incorrecta(client, db):
    crear_usuario(db, rol="Estudiante", identificacion="1001")
    r = login(client, "1001", "mal-clave")
    assert r.status_code == 401


def test_login_usuario_inexistente(client, db):
    r = login(client, "0000000000", "Clave1234!")
    assert r.status_code == 401


def test_token_creacion_y_decodificacion():
    token = crear_token({"id": 1, "nombre": "Ana", "rol": "Estudiante"})
    decodificado = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert decodificado["id"] == 1
    assert decodificado["rol"] == "Estudiante"
    assert "exp" in decodificado
    assert "iat" in decodificado


def test_verificar_token_acepta_valido(db):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001")
    token = crear_token({"id": u.id, "rol": "Estudiante"})
    datos = verificar_token(_Credenciales(token), db)
    assert datos["id"] == u.id
    assert datos["rol"] == "Estudiante"


def test_verificar_token_rechaza_invalido(db):
    with pytest.raises(HTTPException) as exc:
        verificar_token(_Credenciales("token-invalido"), db)
    assert exc.value.status_code == 401


def test_verificar_token_rechaza_usuario_inexistente(db):
    token = crear_token({"id": 999999, "rol": "Administrador"})
    with pytest.raises(HTTPException) as exc:
        verificar_token(_Credenciales(token), db)
    assert exc.value.status_code == 401


def test_verificar_token_revalida_rol_de_bd(db):
    """El rol devuelto es el ACTUAL de la BD, no el del token."""
    u = crear_usuario(db, rol="Administrador", identificacion="1001")
    token = crear_token({"id": u.id, "rol": "Administrador"})
    # Degradar en BD mientras el token aún 'dice' Administrador
    rol_estudiante = db.query(Rol).filter(Rol.nombre == "Estudiante").first()
    u.rol_id = rol_estudiante.id
    db.commit()
    datos = verificar_token(_Credenciales(token), db)
    assert datos["rol"] == "Estudiante"


def test_solo_administrador_acepta_admin():
    assert solo_administrador({"rol": "Administrador", "id": 1})["id"] == 1


def test_solo_administrador_rechaza_estudiante():
    with pytest.raises(HTTPException) as exc:
        solo_administrador({"rol": "Estudiante", "id": 2})
    assert exc.value.status_code == 403