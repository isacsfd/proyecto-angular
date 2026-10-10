"""
test_login_esquema_neon.py — Regresión del error 500 de /login en producción.

Reproduce en una BD aislada el ESQUEMA BASE documentado de Neón
(Base de datos del proyecto/biblioteca_iub_postgres.sql): las tablas
`rol` y `usuario` SIN las columnas estado/created_at/updated_at que el
modelo ORM solía exigir. Antes del fix, el SELECT del login emitía
usuario.estado/created_at/updated_at y rol_1.estado/... y fallaba
(500 / "no such column"). Con los modelos alineados al esquema base,
el flujo debe funcionar.
"""

import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app import app, get_db, hash_password
from models.models import UserTable

# DDL equivalente al esquema base documentado (sin estado/created_at/updated_at).
DDL = """
CREATE TABLE rol (
    id INTEGER PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion VARCHAR(255)
);
CREATE TABLE usuario (
    id INTEGER PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(50) NOT NULL,
    address VARCHAR(255) NOT NULL,
    rol_id INTEGER NOT NULL,
    password VARCHAR(255) NOT NULL,
    identificacion VARCHAR(50) UNIQUE,
    nivel_academico VARCHAR(50),
    carrera VARCHAR(100),
    sede VARCHAR(20)
);
"""


@pytest.fixture
def cliente_esquema_neon():
    """Levanta la app contra una BD SQLite con el esquema base de Neón."""
    ruta = os.path.join(tempfile.mkdtemp(prefix="neon_schema_"), "neon.db")
    eng = create_engine("sqlite:///" + ruta)
    with eng.begin() as c:
        for sentencia in (s.strip() for s in DDL.split(";") if s.strip()):
            c.execute(text(sentencia))
        c.execute(text(
            "INSERT INTO rol (id, nombre, descripcion) VALUES (1, 'Estudiante', 'x')"
        ))
        c.execute(text(
            "INSERT INTO usuario (nombre, username, email, phone, address, rol_id,"
            " password, identificacion, sede)"
            " VALUES (:n, :u, :e, :ph, :a, 1, :pw, :i, 'Soledad')"
        ), {
            "n": "Ana Pérez", "u": "u1001", "e": "u1001@iub.edu.co",
            "ph": "3000000000", "a": "Calle 1", "pw": hash_password("Clave1234!"),
            "i": "1001",
        })

    SessionRed = sessionmaker(bind=eng)

    def _get_db():
        db = SessionRed()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_login_ok_en_esquema_base(cliente_esquema_neon):
    r = cliente_esquema_neon.post(
        "/login", json={"identificacion": "1001", "password": "Clave1234!"}
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["message"]
    assert data["access_token"]
    assert data["token_type"] == "bearer"
    assert data["user"]["identificacion"] == "1001"
    assert data["user"]["rol"] == "Estudiante"


def test_login_estructura_respuesta_en_esquema_base(cliente_esquema_neon):
    r = cliente_esquema_neon.post(
        "/login", json={"identificacion": "1001", "password": "Clave1234!"}
    )
    assert set(r.json().keys()) == {"message", "access_token", "token_type", "user"}
    assert set(r.json()["user"].keys()) == {
        "id", "nombre", "username", "email", "rol", "identificacion",
        "nivel_academico", "carrera", "sede",
    }


def test_login_contrasena_incorrecta_en_esquema_base(cliente_esquema_neon):
    r = cliente_esquema_neon.post(
        "/login", json={"identificacion": "1001", "password": "mal-clave"}
    )
    assert r.status_code == 401


def test_login_usuario_inexistente_en_esquema_base(cliente_esquema_neon):
    r = cliente_esquema_neon.post(
        "/login", json={"identificacion": "999999999", "password": "Clave1234!"}
    )
    assert r.status_code == 401


def test_modelo_consulta_esquema_base(cliente_esquema_neon, monkeypatch):
    """El modelo UserTable es capaz de consultar el esquema base (sin columnas extra)."""
    r = cliente_esquema_neon.post(
        "/login", json={"identificacion": "1001", "password": "Clave1234!"}
    )
    assert r.status_code == 200
    payload = r.json()["access_token"]
    assert payload and payload.split(".")[0]  # JWT con header+carga