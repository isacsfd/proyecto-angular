"""Regresión de autorización: el rol real lo define la BD/backend, no el cliente.

Cubre la garantía de fondo para la corrección del frontend: si el selector de
rol del login no coincide con el rol real del usuario, el backend nunca otorga
un rol distinto; las operaciones protegidas siguen restringidas por rol.
"""

from models.models import Rol, UserTable

from .conftest import crear_usuario, headers, login, token_de


def test_login_devuelve_rol_real_de_bd(client, db):
    crear_usuario(db, rol="Estudiante", identificacion="1001")
    r = login(client, "1001", "Clave1234!")
    assert r.status_code == 200
    assert r.json()["user"]["rol"] == "Estudiante"


def test_login_ignora_campo_rol_que_envie_el_cliente(client, db):
    """El backend ignora un 'rol' extra en el body: solo vale la BD."""
    crear_usuario(db, rol="Estudiante", identificacion="1001")
    r = client.post(
        "/login",
        json={"identificacion": "1001", "password": "Clave1234!", "rol": "super_administrador"},
    )
    assert r.status_code == 200
    assert r.json()["user"]["rol"] == "Estudiante"


def test_credenciales_incorrectas_rechazadas(client, db):
    crear_usuario(db, rol="Estudiante", identificacion="1001")
    r = login(client, "1001", "clave-incorrecta")
    assert r.status_code == 401


def test_estudiante_no_autorizado_en_nivel_admin(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    t = token_de(client, est)

    r_usuarios = client.get("/usuarios/", headers=headers(t))
    assert r_usuarios.status_code == 403

    r_loan = client.patch("/loan/999999", json={}, headers=headers(t))
    assert r_loan.status_code == 403


def test_rol_del_token_se_revalida_desde_bd(client, db):
    """Un token de admin deja de ser admin si se degrada su rol en la BD."""
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    t = token_de(client, admin)
    assert client.get("/usuarios/", headers=headers(t)).status_code == 200

    rol_est = db.query(Rol).filter(Rol.nombre == "Estudiante").first()
    u = db.query(UserTable).filter(UserTable.id == admin.id).first()
    u.rol_id = rol_est.id
    db.commit()

    assert client.get("/usuarios/", headers=headers(t)).status_code == 403