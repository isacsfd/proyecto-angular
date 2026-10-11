"""Pruebas de seguridad (JWT y contraseñas) añadidas tras la auditoría.

Cubren:
- MM_JWT_SECRET obligatorio en producción (RENDER), sin fallback inseguro.
- verify_password acepta solo bcrypt (sin alternativa en texto plano).
- Login con hash plano: rechazado por defecto; migración explícita a bcrypt
  cuando MM_HASH_PLANO_PERMITIDO=1 y la contraseña coincide.
"""

import pytest

from app import hash_password, verify_password
from auth import _secreto_jwt
from models.models import UserTable

from .conftest import crear_usuario, login


def test_secreto_jwt_usa_el_valor_definido(monkeypatch):
    monkeypatch.setenv("MM_JWT_SECRET", "clave-de-prueba")
    assert _secreto_jwt() == "clave-de-prueba"


def test_secreto_jwt_obligatorio_en_produccion(monkeypatch):
    monkeypatch.delenv("MM_JWT_SECRET", raising=False)
    monkeypatch.setenv("RENDER", "1")
    with pytest.raises(RuntimeError):
        _secreto_jwt()


def test_secreto_jwt_local_no_usa_valor_de_produccion(monkeypatch):
    monkeypatch.delenv("MM_JWT_SECRET", raising=False)
    monkeypatch.delenv("RENDER", raising=False)
    clave = _secreto_jwt()
    assert clave and "_no_usar_en_produccion" in clave


def test_verify_password_solo_acepta_bcrypt():
    h = hash_password("Clave1234!")
    assert verify_password("Clave1234!", h)
    assert not verify_password("incorrecta", h)
    # El texto plano ya NO se acepta como alternativa silenciosa.
    assert not verify_password("clave", "clave")


def test_login_rechaza_hash_plano_por_defecto(client, db, monkeypatch):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001")
    u.password = "Clave1234!"
    db.commit()
    monkeypatch.delenv("MM_HASH_PLANO_PERMITIDO", raising=False)
    r = login(client, "1001", "Clave1234!")
    assert r.status_code == 401


def test_login_migra_hash_plano_con_flag(client, db, monkeypatch):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001")
    u.password = "Clave1234!"
    db.commit()
    monkeypatch.setenv("MM_HASH_PLANO_PERMITIDO", "1")

    r = login(client, "1001", "Clave1234!")
    assert r.status_code == 200

    # El hash ya migró a bcrypt en la BD de pruebas.
    u2 = db.query(UserTable).filter(UserTable.identificacion == "1001").first()
    assert u2.password.startswith(("$2a$", "$2b$", "$2y$"))

    # Sin el flag, el acceso sigue funcionando con el nuevo hash bcrypt.
    monkeypatch.delenv("MM_HASH_PLANO_PERMITIDO", raising=False)
    r2 = login(client, "1001", "Clave1234!")
    assert r2.status_code == 200


def test_login_hash_plano_con_password_diferente(client, db, monkeypatch):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001")
    u.password = "Clave1234!"
    db.commit()
    monkeypatch.setenv("MM_HASH_PLANO_PERMITIDO", "1")
    r = login(client, "1001", "otra-clave")
    assert r.status_code == 401