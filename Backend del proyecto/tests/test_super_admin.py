"""Pruebas del rol super_administrador: jerarquía, escaladas y revalidación."""

from .conftest import crear_usuario, headers, token_de


def _usuario_payload(rol, identificacion="20020", nombre="Nuevo"):
    return {
        "nombre": nombre,
        "identificacion": identificacion,
        "password": "Clave1234!",
        "rol": rol,
        "phone": "3000000000",
        "address": "Calle 9",
        "username": "u" + identificacion,
        "email": "u" + identificacion + "@iub.edu.co",
    }


def test_login_super_administrador(client, db):
    super_u = crear_usuario(db, rol="super_administrador", identificacion="1000")
    t = token_de(client, super_u)
    r = client.get("/usuarios/", headers=headers(t))
    assert r.status_code == 200


def test_super_tiene_permisos_admin(client, db):
    """El super puede hacer todo lo que un administrador: listar y gestionar."""
    super_u = crear_usuario(db, rol="super_administrador", identificacion="1000")
    t = token_de(client, super_u)
    assert client.get("/usuarios/", headers=headers(t)).status_code == 200
    assert client.get("/libros/", headers=headers(t)).status_code == 200
    assert client.get("/loan/", headers=headers(t)).status_code == 200
    assert client.get("/dispositivos/", headers=headers(t)).status_code == 200
    assert client.get("/api/ia/dashboard", headers=headers(t)).status_code == 200
    assert client.get("/api/library-access/", headers=headers(t)).status_code == 200


def test_super_crea_usuario(client, db):
    super_u = crear_usuario(db, rol="super_administrador", identificacion="1000")
    t = token_de(client, super_u)
    r = client.post("/usuarios/", json=_usuario_payload("Estudiante"), headers=headers(t))
    assert r.status_code == 201


def test_super_crea_administrador(client, db):
    super_u = crear_usuario(db, rol="super_administrador", identificacion="1000")
    t = token_de(client, super_u)
    r = client.post("/usuarios/", json=_usuario_payload("Administrador"), headers=headers(t))
    assert r.status_code == 201
    assert r.json()["rol"] == "Administrador"


def test_super_no_crea_segundo_super_por_api(client, db):
    super_u = crear_usuario(db, rol="super_administrador", identificacion="1000")
    t = token_de(client, super_u)
    r = client.post("/usuarios/", json=_usuario_payload("super_administrador"), headers=headers(t))
    assert r.status_code == 403


def test_admin_no_crea_administrador(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    t = token_de(client, admin)
    r = client.post("/usuarios/", json=_usuario_payload("Administrador"), headers=headers(t))
    assert r.status_code == 403


def test_admin_no_crea_super(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    t = token_de(client, admin)
    r = client.post("/usuarios/", json=_usuario_payload("super_administrador"), headers=headers(t))
    assert r.status_code == 403


def test_usuario_no_crea_nadie(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    t = token_de(client, est)
    r = client.post("/usuarios/", json=_usuario_payload("Estudiante"), headers=headers(t))
    assert r.status_code == 403


def test_usuario_no_eleva_su_rol(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    t = token_de(client, est)
    r = client.put(f"/usuarios/{est.id}", json={"rol": "Administrador"}, headers=headers(t))
    assert r.status_code == 403


def test_admin_no_modifica_super(client, db):
    super_u = crear_usuario(db, rol="super_administrador", identificacion="1000")
    admin = crear_usuario(db, rol="Administrador", identificacion="1001")
    t = token_de(client, admin)
    r = client.put(f"/usuarios/{super_u.id}", json={"nombre": "hack"}, headers=headers(t))
    assert r.status_code == 403
    r = client.put(f"/usuarios/{super_u.id}", json={"rol": "Estudiante"}, headers=headers(t))
    assert r.status_code == 403


def test_admin_no_elimina_super(client, db):
    super_u = crear_usuario(db, rol="super_administrador", identificacion="1000")
    admin = crear_usuario(db, rol="Administrador", identificacion="1001")
    t = token_de(client, admin)
    r = client.delete(f"/usuarios/{super_u.id}", headers=headers(t))
    assert r.status_code == 403


def test_admin_no_modifica_otro_admin(client, db):
    admin_a = crear_usuario(db, rol="Administrador", identificacion="1000", nombre="A")
    admin_b = crear_usuario(db, rol="Administrador", identificacion="1001", nombre="B")
    t = token_de(client, admin_a)
    r = client.put(f"/usuarios/{admin_b.id}", json={"nombre": "cambio"}, headers=headers(t))
    assert r.status_code == 403


def test_super_no_degrada_al_unico_super(client, db):
    super_u = crear_usuario(db, rol="super_administrador", identificacion="1000")
    t = token_de(client, super_u)
    r = client.put(f"/usuarios/{super_u.id}", json={"rol": "Administrador"}, headers=headers(t))
    assert r.status_code == 403


def test_super_gestiona_roles(client, db):
    super_u = crear_usuario(db, rol="super_administrador", identificacion="1000")
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    t = token_de(client, super_u)
    r = client.put(f"/usuarios/{est.id}", json={"rol": "Docente"}, headers=headers(t))
    assert r.status_code == 200
    assert r.json()["rol"] == "Docente"


def test_token_degradado_no_sigue_siendo_admin(client, db):
    """Revalidación: si el super degrada a un admin, su token viejo deja de ser admin."""
    super_u = crear_usuario(db, rol="super_administrador", identificacion="1000")
    admin = crear_usuario(db, rol="Administrador", identificacion="1001")
    t_admin = token_de(client, admin)  # token generado mientras era admin
    t_super = token_de(client, super_u)

    # El super degrada al admin a Estudiante
    r = client.put(f"/usuarios/{admin.id}", json={"rol": "Estudiante"}, headers=headers(t_super))
    assert r.status_code == 200

    # Con el token VIEJO ya no puede listar usuarios (rol revalidado desde BD)
    r = client.get("/usuarios/", headers=headers(t_admin))
    assert r.status_code == 403