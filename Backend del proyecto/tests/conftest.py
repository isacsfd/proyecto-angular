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
from database import Libro, Prestamos, Dispositivo, PrestamoDispositivo, Configuracion  # noqa: E402
from models.models import UserTable, LibraryAccess, Rol, Modulo, ModuloRol  # noqa: E402
from services.ia import busqueda_semantica  # noqa: E402
from services.rate_limit import limitador_qr  # noqa: E402

TABLAS = [ModuloRol, PrestamoDispositivo, Prestamos, LibraryAccess, Dispositivo, Libro, UserTable, Modulo, Rol, Configuracion]

ROLES = ["super_administrador", "Administrador", "Funcionario", "Docente", "Estudiante"]

MODULOS = [
    "login", "inicio", "catalogo", "mis_prestamos", "dispositivos", "chatbot",
    "dashboard", "gestion_usuarios", "gestion_libros", "gestion_dispositivos",
    "gestion_prestamos", "estadisticas", "ingresos",
]

# Matriz de permisos (rol -> módulos). El super y el admin acceden a todo.
MATRIZ = {
    "super_administrador": MODULOS,
    "Administrador": MODULOS,
    "Funcionario": MODULOS,
    "Docente": ["login", "inicio", "catalogo", "mis_prestamos", "dispositivos", "chatbot"],
    "Estudiante": ["login", "inicio", "catalogo", "mis_prestamos", "dispositivos", "chatbot"],
}


def _sembrar_rbac(db):
    """Crea roles, módulos y la matriz modulos_X_rol (idempotente)."""
    roles = {}
    for nombre in ROLES:
        r = db.query(Rol).filter(Rol.nombre == nombre).first()
        if not r:
            r = Rol(nombre=nombre, descripcion=nombre)
            db.add(r)
            db.flush()
        roles[nombre] = r.id
    mods = {}
    for nombre in MODULOS:
        m = db.query(Modulo).filter(Modulo.nombre == nombre).first()
        if not m:
            m = Modulo(nombre=nombre, ruta="/" + nombre, descripcion=nombre, orden=0)
            db.add(m)
            db.flush()
        mods[nombre] = m.id
    for rol_nombre, lista in MATRIZ.items():
        for mod_nombre in lista:
            existe = db.query(ModuloRol).filter(
                ModuloRol.rol_id == roles[rol_nombre], ModuloRol.modulo_id == mods[mod_nombre]
            ).first()
            if not existe:
                db.add(ModuloRol(rol_id=roles[rol_nombre], modulo_id=mods[mod_nombre]))
    db.commit()


def _rol_id(db, rol):
    r = db.query(Rol).filter(Rol.nombre == rol).first()
    if r is None:
        raise AssertionError(f"Rol '{rol}' no sembrado en la BD de pruebas")
    return r.id


@pytest.fixture(autouse=True)
def _db_limpio():
    """Limpia las tablas y las cachés (IA y rate-limit) antes de cada test."""
    db = SessionLocal()
    try:
        for tabla in TABLAS:
            db.query(tabla).delete()
        db.commit()
        _sembrar_rbac(db)
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
        rol_id=_rol_id(db, rol),
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