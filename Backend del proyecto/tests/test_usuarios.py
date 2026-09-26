"""Pruebas de usuarios: CRUD, permisos e IDOR."""

from .conftest import crear_usuario, headers, token_de


def test_listar_usuarios_solo_admin(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000", nombre="Admin")
    crear_usuario(db, rol="Estudiante", identificacion="1001", nombre="Ana")
    t_admin = token_de(client, admin)

    r = client.get("/usuarios/", headers=headers(t_admin))
    assert r.status_code == 200
    assert len(r.json()) == 2


def test_listar_usuarios_estudiante_403(client, db):
    estudiante = crear_usuario(db, rol="Estudiante", identificacion="1001")
    t = token_de(client, estudiante)
    r = client.get("/usuarios/", headers=headers(t))
    assert r.status_code == 403


def test_crear_usuario_solo_admin(client, db):
    estudiante = crear_usuario(db, rol="Estudiante", identificacion="1001")
    t = token_de(client, estudiante)
    r = client.post(
        "/usuarios/",
        json={"nombre": "Nuevo", "identificacion": "20020", "password": "Clave1234!", "rol": "Estudiante",
              "phone": "3000000000", "address": "Calle 9", "username": "nuevo", "email": "nuevo@iub.edu.co"},
        headers=headers(t),
    )
    assert r.status_code == 403


def test_crear_usuario_password_debil(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    t = token_de(client, admin)
    r = client.post(
        "/usuarios/",
        json={"nombre": "DÃ©bil", "identificacion": "20020", "password": "corta", "rol": "Estudiante",
              "phone": "3000000000", "address": "Calle 9", "username": "debil", "email": "debil@iub.edu.co"},
        headers=headers(t),
    )
    assert r.status_code == 422  # validaciÃ³n de contraseÃ±a


def test_crear_usuario_admin_ok(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    t = token_de(client, admin)
    r = client.post(
        "/usuarios/",
        json={"nombre": "Carlos", "identificacion": "20020", "password": "Clave1234!", "rol": "Estudiante",
              "phone": "3000000000", "address": "Calle 9", "username": "carlos", "email": "carlos@iub.edu.co"},
        headers=headers(t),
    )
    assert r.status_code == 201


def test_usuario_puede_ver_su_perfil(client, db):
    estudiante = crear_usuario(db, rol="Estudiante", identificacion="1001")
    t = token_de(client, estudiante)
    r = client.get(f"/usuarios/{estudiante.id}", headers=headers(t))
    assert r.status_code == 200
    assert r.json()["identificacion"] == "1001"


def test_usuario_no_ve_perfil_ajeno_idor(client, db):
    """Un estudiante no debe poder leer el perfil de otro (IDOR)."""
    a = crear_usuario(db, rol="Estudiante", identificacion="1001", nombre="Ana")
    b = crear_usuario(db, rol="Estudiante", identificacion="1002", nombre="Beto")
    t_a = token_de(client, a)
    r = client.get(f"/usuarios/{b.id}", headers=headers(t_a))
    assert r.status_code == 403


def test_admin_ve_perfil_ajeno(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    b = crear_usuario(db, rol="Estudiante", identificacion="1002", nombre="Beto")
    t_admin = token_de(client, admin)
    r = client.get(f"/usuarios/{b.id}", headers=headers(t_admin))
    assert r.status_code == 200
    assert r.json()["id"] == b.id


def test_sin_token_401(client, db):
    r = client.get("/usuarios/")
    assert r.status_code == 401
