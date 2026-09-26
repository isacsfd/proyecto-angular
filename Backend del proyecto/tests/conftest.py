"""
conftest.py — Configuración de tests de Biblioteca IUB
=======================================================
Usa SQLite en un directorio temporal (no toca MySQL).
Define variables de entorno ANTES de importar la app.
"""

import os
import sys
import tempfile

_TMP = tempfile.mkdtemp(prefix="iub_tests_")
os.environ["MM_DATABASE_URL"] = "sqlite:///" + os.path.join(_TMP, "test.db")
os.environ["MM_JWT_SECRET"] = "clave-de-prueba-iub"
os.environ["MM_CORS_ORIGINS"] = "http://localhost:4200"

# Raíz del backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Raíz del proyecto (para el import de qr en app.py)
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import app, hash_password, limitador_login  # noqa: E402
from database import SessionLocal  # noqa: E402
from database import Libro, Prestamos, Dispositivo, PrestamoDispositivo  # noqa: E402
from models.models import UserTable, LibraryAccess  # noqa: E402
from services.ia import busqueda_semantica  # noqa: E402
from services.rate_limit import limitador_qr  # noqa: E402

TABLAS = [LibraryAccess, PrestamoDispositivo, Prestamos, Dispositivo, Libro, UserTable]


@pytest.fixture(autouse=True)
def _db_limpio():
    """Limpia las tablas y las cachés (IA y rate-limit) antes de cada test."""
    db = SessionLocal()
    try:
        for tabla in TABLAS:
            db.query(tabla).delete()
        db.commit()
    finally:
        db.close()
    busqueda_semantica.reiniciar_cache()
    limitador_qr.reiniciar()
    limitador_login.reiniciar()
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    sesion = SessionLocal()
    yield sesion
    sesion.close()


# ─── Helpers ────────────────────────────────────────────────────────────────
def crear_usuario(db, rol="Estudiante", identificacion="1001", nombre="Ana Pérez", password="Clave1234!", carrera="Ingeniería Industrial", sede="Soledad"):
    u = UserTable(
        nombre=nombre,
        identificacion=identificacion,
        password=hash_password(password),
        rol=rol,
        phone="3000000000",
        address="Calle 1 #2-3",
        username="u" + identificacion,
        email="u" + identificacion + "@iub.edu.co",
        carrera=carrera,
        sede=sede,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def crear_libro(db, titulo="Principios de Administración", autor="Autor Test", ejemplares=3, programa="Ingeniería Industrial", sede="Soledad"):
    l = Libro(
        Titulo=titulo,
        Autor=autor,
        Programa=programa,
        Item=1,
        Signatura="SIG-001",
        Areas=1,
        Ejemplar=ejemplares,
        Editorial="Editorial IUB",
        Año=2021,
        Idioma="Español",
        sede=sede,
    )
    db.add(l)
    db.commit()
    db.refresh(l)
    return l


def login(client, identificacion, password):
    return client.post("/login", json={"identificacion": identificacion, "password": password})


def token_de(client, usuario, password="Clave1234!"):
    r = login(client, usuario.identificacion, password)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def headers(token):
    return {"Authorization": f"Bearer {token}"}