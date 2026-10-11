"""Endpoints generales: GET /, /api/iniciar-lector, rate limit del login y
sembrar_rbac idempotente."""

import app as appmod
from app import limitador_login
from models.models import Modulo, ModuloRol, Rol

from .conftest import crear_usuario, headers, login, token_de


def test_get_root(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "API Biblioteca IUB" in r.json()["message"]


def test_iniciar_lector_sin_token_401(client):
    assert client.post("/api/iniciar-lector").status_code == 401


def test_iniciar_lector_estudiante_403(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    t = token_de(client, est)
    assert client.post("/api/iniciar-lector", headers=headers(t)).status_code == 403


def test_iniciar_lector_admin_sin_lector_503(client, db, monkeypatch):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    t = token_de(client, admin)
    # Rama 503: lector QR no disponible (sin _cargar_lector_qr).
    monkeypatch.setattr(appmod, "_hilo_lector", None)
    monkeypatch.setattr(appmod, "_cargar_lector_qr", lambda: None)
    r = client.post("/api/iniciar-lector", headers=headers(t))
    assert r.status_code == 503


def test_iniciar_lector_admin_ok_con_lector_mock(client, db, monkeypatch):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    t = token_de(client, admin)

    from types import SimpleNamespace
    monkeypatch.setattr(appmod, "_hilo_lector", None)
    monkeypatch.setattr(appmod, "_cargar_lector_qr", lambda: SimpleNamespace(leer_qr_con_delay=lambda: None))

    r = client.post("/api/iniciar-lector", headers=headers(t))
    assert r.status_code == 200
    assert "mensaje" in r.json()


def test_login_rate_limit_429(client, db):
    """El login devuelve 429 tras superar el límite por IP configurado."""
    limitador_login.reiniciar()
    for _ in range(20):
        r = login(client, "999999999", "clave-incorrecta")
        assert r.status_code == 401
    r = login(client, "999999999", "clave-incorrecta")
    assert r.status_code == 429


def test_sembrar_rbac_idempotente(db):
    from services.rbac import MATRIZ, MODULOS, ROLES, sembrar_rbac

    sembrar_rbac(db)
    r_roles = db.query(Rol).count()
    r_modulos = db.query(Modulo).count()
    r_permisos = db.query(ModuloRol).count()

    sembrar_rbac(db)  # repetir no debe duplicar
    assert db.query(Rol).count() == r_roles
    assert db.query(Modulo).count() == r_modulos
    assert db.query(ModuloRol).count() == r_permisos

    assert r_roles == len(ROLES)
    assert r_modulos == len(MODULOS)
    assert r_permisos == sum(len(v) for v in MATRIZ.values())