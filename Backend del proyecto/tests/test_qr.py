"""Pruebas del endpoint público QR: validación, rate-limit y log protegido."""

from services.rate_limit import limitador_qr

from .conftest import crear_usuario, headers, token_de


def test_post_qr_valido(client, db):
    crear_usuario(db, rol="Estudiante", identificacion="123456789", nombre="Ana")
    r = client.post("/api/library-access/", json={"dni": "123456789", "message": "Acceso"})
    assert r.status_code == 201
    assert r.json()["status"] is True
    assert r.json()["user_name"] == "Ana"


def test_post_qr_dni_invalido(client, db):
    for dni in ["", "abc", "123", "12345678901234567890", "12 34 56"]:
        r = client.post("/api/library-access/", json={"dni": dni})
        assert r.status_code == 400, f"DNI '{dni}' debería rechazarse"


def test_post_qr_dni_inexistente(client, db):
    r = client.post("/api/library-access/", json={"dni": "999999999"})
    assert r.status_code == 404


def test_rate_limit_bloquea_abuso(client, db):
    crear_usuario(db, rol="Estudiante", identificacion="123456789")
    # Reducir el límite para la prueba y restaurarlo al final
    original = limitador_qr.max_requests
    limitador_qr.max_requests = 3
    try:
        r1 = client.post("/api/library-access/", json={"dni": "123456789"})
        r2 = client.post("/api/library-access/", json={"dni": "123456789"})
        r3 = client.post("/api/library-access/", json={"dni": "123456789"})
        r4 = client.post("/api/library-access/", json={"dni": "123456789"})
        assert r1.status_code == 201
        assert r2.status_code == 201
        assert r3.status_code == 201
        assert r4.status_code == 429
    finally:
        limitador_qr.max_requests = original


def test_log_sin_token_401(client, db):
    r = client.get("/api/library-access/")
    assert r.status_code == 401


def test_log_usuario_403(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    t = token_de(client, est)
    r = client.get("/api/library-access/", headers=headers(t))
    assert r.status_code == 403


def test_log_administrador_200(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    t = token_de(client, admin)
    r = client.get("/api/library-access/", headers=headers(t))
    assert r.status_code == 200


def test_log_super_200(client, db):
    super_u = crear_usuario(db, rol="super_administrador", identificacion="1000")
    t = token_de(client, super_u)
    r = client.get("/api/library-access/", headers=headers(t))
    assert r.status_code == 200