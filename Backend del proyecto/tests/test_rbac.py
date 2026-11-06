"""RBAC: matriz por rol, aplicación en endpoints y revocación de permisos."""

from models.models import Modulo, ModuloRol, Rol
from services.rbac import MODULOS, sembrar_rbac, tiene_modulo

from .conftest import crear_libro, crear_usuario, headers, token_de

PAYLOAD_LIBRO = {
    "Autor": "Autor RBAC",
    "Titulo": "Libro RBAC",
    "Programa": "Ingeniería Industrial",
    "Item": 1,
    "Signatura": "SIG-RBAC-001",
    "Areas": 1,
    "Ejemplar": 3,
    "Editorial": "Editorial IUB",
    "Año": 2026,
    "Idioma": "Español",
    "sede": "Soledad",
}

PAYLOAD_DISPOSITIVO = {
    "tipo": "Computador",
    "marca": "Lenovo",
    "modelo": "ThinkPad",
    "sede": "Soledad",
}


def _rol(db, nombre):
    return db.query(Rol).filter(Rol.nombre == nombre).first()


def _modulo(db, nombre):
    return db.query(Modulo).filter(Modulo.nombre == nombre).first()


def _enlace(db, rol_nombre, modulo_nombre):
    return (
        db.query(ModuloRol)
        .filter(
            ModuloRol.rol_id == _rol(db, rol_nombre).id,
            ModuloRol.modulo_id == _modulo(db, modulo_nombre).id,
        )
        .first()
    )


def _prestamo_libro(client, db, admin_token, user_id, book_id):
    r = client.post(
        "/loan/",
        json={
            "user_id": user_id,
            "book_id": book_id,
            "loan_date": "2026-01-05T10:00:00",
            "delivery_date": "2026-01-09T10:00:00",
            "prestamo_state": "Aprobado",
        },
        headers=headers(admin_token),
    )
    assert r.status_code == 201, r.text
    return r.json()


# ─── 401 sin sesión ─────────────────────────────────────────────────────────
def test_sin_sesion_401(client):
    assert client.get("/usuarios/").status_code == 401
    assert client.get("/loan/").status_code == 401
    assert client.post("/libros/", json=PAYLOAD_LIBRO).status_code == 401
    assert client.patch("/loan/1", json={"state": "Devuelto"}).status_code == 401
    assert client.delete("/dispositivos/1").status_code == 401


# ─── Matriz declarada ───────────────────────────────────────────────────────
def test_funcionario_ya_no_tiene_modulos_administrativos(db):
    for modulo in (
        "gestion_usuarios",
        "gestion_libros",
        "gestion_dispositivos",
        "estadisticas",
    ):
        assert not tiene_modulo(db, _rol(db, "Funcionario").id, modulo)
    for modulo in ("gestion_prestamos", "ingresos", "dashboard", "catalogo"):
        assert tiene_modulo(db, _rol(db, "Funcionario").id, modulo)


def test_super_tiene_todos_los_modulos(db):
    rol_id = _rol(db, "super_administrador").id
    assert all(tiene_modulo(db, rol_id, m) for m in MODULOS)


def test_rol_sin_id_es_denegado_por_defecto(db):
    assert not tiene_modulo(db, None, "gestion_usuarios")
    assert not tiene_modulo(db, 99999, "gestion_usuarios")


# ─── Funcionario: operativo sí, administración no ──────────────────────────
def test_funcionario_operativo(client, db):
    func = crear_usuario(db, rol="Funcionario", identificacion="3001")
    t = token_de(client, func)

    assert client.get("/loan/", headers=headers(t)).status_code == 200
    assert client.get("/prestamos-dispositivos/", headers=headers(t)).status_code == 200
    assert client.get("/libros/", headers=headers(t)).status_code == 200
    assert client.get("/dispositivos/", headers=headers(t)).status_code == 200
    # El módulo pasa y el recurso inexistente produce 404, no 403.
    assert client.patch("/loan/999999", json={"state": "Devuelto"}, headers=headers(t)).status_code == 404


def test_funcionario_no_administra(client, db):
    func = crear_usuario(db, rol="Funcionario", identificacion="3001")
    libro = crear_libro(db)
    t = token_de(client, func)

    assert client.get("/usuarios/", headers=headers(t)).status_code == 403
    assert client.post("/libros/", json=PAYLOAD_LIBRO, headers=headers(t)).status_code == 403
    assert client.put(f"/libros/{libro.ID}", json={"Titulo": "X"}, headers=headers(t)).status_code == 403
    assert client.delete(f"/libros/{libro.ID}", headers=headers(t)).status_code == 403
    assert client.post("/dispositivos/", json=PAYLOAD_DISPOSITIVO, headers=headers(t)).status_code == 403
    # Puede gestionar préstamos de dispositivos (módulo gestion_prestamos),
    # pero eso no le concede administrar el inventario.
    assert client.patch(
        "/prestamos-dispositivos/999999", json={"estado": "Activo"}, headers=headers(t)
    ).status_code == 404


def test_funcionario_solicita_prestamo_propio(client, db):
    func = crear_usuario(db, rol="Funcionario", identificacion="3001")
    libro = crear_libro(db)
    t = token_de(client, func)
    r = client.post(
        "/loan/",
        json={
            "user_id": func.id,
            "book_id": libro.ID,
            "loan_date": "2026-01-05T10:00:00",
            "delivery_date": "2026-01-09T10:00:00",
            "prestamo_state": "No Aprobado",
        },
        headers=headers(t),
    )
    assert r.status_code == 201, r.text


# ─── Lecturas coherentes con el módulo (F1-02) ─────────────────────────────
def test_funcionario_ve_todos_los_prestamos_que_gestiona(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    t_admin = token_de(client, admin)
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    libro = crear_libro(db)
    prestamo = _prestamo_libro(client, db, t_admin, est.id, libro.ID)

    func = crear_usuario(db, rol="Funcionario", identificacion="3001")
    t_func = token_de(client, func)

    lista = client.get("/loan/", headers=headers(t_func))
    assert lista.status_code == 200
    assert prestamo["id"] in [p["id"] for p in lista.json()]
    assert client.get(f"/loan/{prestamo['id']}", headers=headers(t_func)).status_code == 200


def test_estudiante_sigue_viendo_solo_lo_propio(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    t_admin = token_de(client, admin)
    est_a = crear_usuario(db, rol="Estudiante", identificacion="1001")
    est_b = crear_usuario(db, rol="Estudiante", identificacion="1002")
    libro = crear_libro(db)
    prestamo = _prestamo_libro(client, db, t_admin, est_a.id, libro.ID)

    t_b = token_de(client, est_b)
    lista = client.get("/loan/", headers=headers(t_b))
    assert lista.status_code == 200
    assert prestamo["id"] not in [p["id"] for p in lista.json()]
    assert client.get(f"/loan/{prestamo['id']}", headers=headers(t_b)).status_code == 403


# ─── Administrador y super ─────────────────────────────────────────────────
def test_administrador_segun_matriz(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    t = token_de(client, admin)

    assert client.get("/usuarios/", headers=headers(t)).status_code == 200
    assert client.post("/libros/", json=PAYLOAD_LIBRO, headers=headers(t)).status_code == 201
    assert client.post("/dispositivos/", json=PAYLOAD_DISPOSITIVO, headers=headers(t)).status_code == 201
    # No puede ascender a super_administrador ni asignar roles fuera de la matriz.
    assert client.put(
        f"/usuarios/{est.id}", json={"rol": "super_administrador"}, headers=headers(t)
    ).status_code == 403
    r = client.put(f"/usuarios/{est.id}", json={"rol": "Auditor"}, headers=headers(t))
    assert r.status_code == 400


def test_super_privilegios(client, db):
    superadmin = crear_usuario(db, rol="super_administrador", identificacion="9000")
    t = token_de(client, superadmin)
    assert client.get("/usuarios/", headers=headers(t)).status_code == 200
    nuevo_admin = client.post(
        "/usuarios/",
        json={
            "nombre": "Admin Dos",
            "identificacion": "20020",
            "password": "Clave1234!",
            "rol": "Administrador",
            "phone": "3000000000",
            "address": "Calle 9 #1-2",
            "username": "admin2",
            "email": "admin2@iub.edu.co",
        },
        headers=headers(t),
    )
    assert nuevo_admin.status_code == 201, nuevo_admin.text
    # La API nunca crea un segundo super administrador.
    assert client.post(
        "/usuarios/",
        json={
            "nombre": "Super Dos",
            "identificacion": "20021",
            "password": "Clave1234!",
            "rol": "super_administrador",
            "phone": "3000000000",
            "address": "Calle 9 #1-3",
            "username": "super2",
            "email": "super2@iub.edu.co",
        },
        headers=headers(t),
    ).status_code == 403


# ─── Roles desconocidos y revocación ───────────────────────────────────────
def test_rol_desconocido_denegado(client, db):
    db.add(Rol(nombre="Auditor", descripcion="Rol personalizado sin módulos"))
    db.commit()
    auditor = crear_usuario(db, rol="Auditor", identificacion="4001")
    t = token_de(client, auditor)

    assert client.get("/usuarios/", headers=headers(t)).status_code == 403
    assert client.patch("/loan/1", json={"state": "Devuelto"}, headers=headers(t)).status_code == 403
    assert client.get("/libros/", headers=headers(t)).status_code == 200


def test_permiso_revocado_deja_de_habilitar(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    t = token_de(client, admin)
    assert client.get("/usuarios/", headers=headers(t)).status_code == 200

    db.query(ModuloRol).filter(
        ModuloRol.rol_id == _rol(db, "Administrador").id,
        ModuloRol.modulo_id == _modulo(db, "gestion_usuarios").id,
    ).delete()
    db.commit()

    assert client.get("/usuarios/", headers=headers(t)).status_code == 403


def test_sembrar_rbac_revoca_permisos_obsoletos(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    assert _enlace(db, "Estudiante", "gestion_usuarios") is None

    db.add(
        ModuloRol(
            rol_id=_rol(db, "Estudiante").id,
            modulo_id=_modulo(db, "gestion_usuarios").id,
        )
    )
    db.commit()
    t = token_de(client, est)
    assert client.get("/usuarios/", headers=headers(t)).status_code == 200

    sembrar_rbac(db)
    assert _enlace(db, "Estudiante", "gestion_usuarios") is None
    assert client.get("/usuarios/", headers=headers(t)).status_code == 403


def test_sembrar_rbac_no_otorga_permisos_extra(db):
    sembrar_rbac(db)
    sembrar_rbac(db)
    for rol_nombre, modulos in {
        "Funcionario": [
            "login", "inicio", "catalogo", "mis_prestamos", "dispositivos",
            "chatbot", "dashboard", "gestion_prestamos", "ingresos",
        ],
        "Docente": ["login", "inicio", "catalogo", "mis_prestamos", "dispositivos", "chatbot"],
    }.items():
        assert all(tiene_modulo(db, _rol(db, rol_nombre).id, m) for m in modulos)
        assert not tiene_modulo(db, _rol(db, rol_nombre).id, "gestion_usuarios")
