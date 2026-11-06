"""Aislamiento por sede, revocaciones efectivas y plan RBAC seguro."""

from datetime import datetime, timedelta

from database import Dispositivo, Libro, Prestamos
from models.models import LibraryAccess, Modulo, ModuloRol, Rol, UserTable
from services.rbac import ROLES, planificar_rbac, sembrar_rbac, tiene_modulo

from .conftest import crear_libro, crear_usuario, headers, token_de

PAYLOAD_LIBRO = {
    "Autor": "Autor Sede",
    "Titulo": "Libro Sede",
    "Programa": "Ingeniería Industrial",
    "Item": 1,
    "Signatura": "SIG-SEDE-001",
    "Areas": 1,
    "Ejemplar": 3,
    "Editorial": "Editorial IUB",
    "Año": 2026,
    "Idioma": "Español",
    "sede": "Barranquilla",
}

PAYLOAD_DISPOSITIVO = {
    "tipo": "Computador", "marca": "Lenovo", "modelo": "ThinkPad", "sede": "Barranquilla",
}

PAYLOAD_USUARIO = {
    "nombre": "Nuevo Usuario",
    "identificacion": "80010",
    "password": "Clave1234!",
    "rol": "Estudiante",
    "phone": "3000000000",
    "address": "Calle 1 #2-3",
    "username": "nuevo80010",
    "email": "nuevo80010@iub.edu.co",
    "sede": "Barranquilla",
}


def _rol(db, nombre):
    return db.query(Rol).filter(Rol.nombre == nombre).first()


def _prestamo(db, user, libro):
    p = Prestamos(
        user_id=user.id,
        book_id=str(libro.ID),
        loan_date=datetime.now() - timedelta(days=10),
        delivery_date=datetime.now() - timedelta(days=3),
        state="Activo",
        prestamo_state="Aprobado",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _dispositivo(db, sede="Soledad"):
    d = Dispositivo(tipo="Computador", marca="HP", modelo="ProBook", sede=sede)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


def _prestamo_dispositivo(db, dispositivo, user):
    from database import PrestamoDispositivo

    p = PrestamoDispositivo(
        dispositivo_id=dispositivo.id,
        user_id=user.id,
        fecha_prestamo=datetime.now(),
        fecha_devolucion=datetime.now() + timedelta(hours=1),
        estado="Pendiente",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _escenario(db, cliente, rol_gestor="Funcionario", sede_gestor="Soledad"):
    gestor = crear_usuario(db, rol=rol_gestor, identificacion="1000", sede=sede_gestor)
    est_a = crear_usuario(db, rol="Estudiante", identificacion="1001", sede="Soledad")
    est_b = crear_usuario(db, rol="Estudiante", identificacion="1002", sede="Barranquilla")
    libro_a = crear_libro(db, titulo="Libro A", sede="Soledad")
    libro_b = crear_libro(db, titulo="Libro B", sede="Barranquilla")
    prestamo_b = _prestamo(db, est_b, libro_b)
    return {
        "gestor": gestor,
        "est_a": est_a,
        "est_b": est_b,
        "libro_a": libro_a,
        "libro_b": libro_b,
        "prestamo_b": prestamo_b,
        "t_gestor": token_de(cliente, gestor),
        "t_a": token_de(cliente, est_a),
        "t_b": token_de(cliente, est_b),
    }


# ─── Préstamos de libros ───────────────────────────────────────────────────
def test_funcionario_sede_a_no_ve_ni_modifica_sede_b(client, db):
    e = _escenario(db, client)
    r = client.get("/loan/", headers=headers(e["t_gestor"]))
    assert r.status_code == 200
    assert e["prestamo_b"].id not in [p["id"] for p in r.json()]
    assert client.get(f"/loan/{e['prestamo_b'].id}", headers=headers(e["t_gestor"])).status_code == 404
    patched = client.patch(
        f"/loan/{e['prestamo_b'].id}", json={"state": "Devuelto"}, headers=headers(e["t_gestor"])
    )
    assert patched.status_code == 404


def test_admin_sede_a_no_ve_ni_modifica_sede_b(client, db):
    e = _escenario(db, client, rol_gestor="Administrador")
    r = client.get("/loan/", headers=headers(e["t_gestor"]))
    assert e["prestamo_b"].id not in [p["id"] for p in r.json()]
    assert client.get(f"/loan/{e['prestamo_b'].id}", headers=headers(e["t_gestor"])).status_code == 404
    assert client.patch(
        f"/loan/{e['prestamo_b'].id}", json={"state": "Devuelto"}, headers=headers(e["t_gestor"])
    ).status_code == 404


def test_super_ve_todas_las_sedes(client, db):
    e = _escenario(db, client)
    sup = crear_usuario(db, rol="super_administrador", identificacion="9000", sede="Colsamiro")
    t = token_de(client, sup)
    ids = [p["id"] for p in client.get("/loan/", headers=headers(t)).json()]
    assert e["prestamo_b"].id in ids
    usuarios = client.get("/usuarios/", headers=headers(t)).json()
    assert {e["est_a"].id, e["est_b"].id}.issubset({u["id"] for u in usuarios})


def test_funcionario_no_amplia_sede_con_parametro(client, db):
    e = _escenario(db, client)
    r = client.get("/libros/?sede=Barranquilla", headers=headers(e["t_gestor"]))
    assert r.status_code == 200
    assert all(l["sede"] == "Soledad" for l in r.json())
    assert all(l["ID"] != e["libro_b"].ID for l in r.json())


# ─── Libros ────────────────────────────────────────────────────────────────
def test_libro_cross_sede_404_y_escritura_forzada(client, db):
    e = _escenario(db, client, rol_gestor="Administrador")
    assert client.get(f"/libros/{e['libro_b'].ID}", headers=headers(e["t_gestor"])).status_code == 404
    assert client.put(
        f"/libros/{e['libro_b'].ID}", json={"Titulo": "X"}, headers=headers(e["t_gestor"])
    ).status_code == 404
    assert client.delete(
        f"/libros/{e['libro_b'].ID}", headers=headers(e["t_gestor"])
    ).status_code == 404

    creado = client.post("/libros/", json=PAYLOAD_LIBRO, headers=headers(e["t_gestor"]))
    assert creado.status_code == 201
    assert creado.json()["sede"] == "Soledad"


# ─── Dispositivos ──────────────────────────────────────────────────────────
def test_dispositivos_aislados_por_sede(client, db):
    e = _escenario(db, client, rol_gestor="Administrador")
    d_a = _dispositivo(db, "Soledad")
    d_b = _dispositivo(db, "Barranquilla")

    lista = client.get("/dispositivos/", headers=headers(e["t_gestor"])).json()
    assert d_a.id in [d["id"] for d in lista]
    assert d_b.id not in [d["id"] for d in lista]
    assert client.get(f"/dispositivos/{d_b.id}", headers=headers(e["t_gestor"])).status_code == 404
    assert client.put(
        f"/dispositivos/{d_b.id}", json={"marca": "X"}, headers=headers(e["t_gestor"])
    ).status_code == 404
    assert client.delete(
        f"/dispositivos/{d_b.id}", headers=headers(e["t_gestor"])
    ).status_code == 404

    creado = client.post("/dispositivos/", json=PAYLOAD_DISPOSITIVO, headers=headers(e["t_gestor"]))
    assert creado.status_code == 201
    assert creado.json()["sede"] == "Soledad"


def test_prestamo_dispositivo_cross_sede_rechazado(client, db):
    e = _escenario(db, client, rol_gestor="Administrador")
    d_b = _dispositivo(db, "Barranquilla")
    r = client.post(
        "/prestamos-dispositivos/",
        json={
            "dispositivo_id": d_b.id,
            "user_id": e["est_a"].id,
            "fecha_prestamo": "2026-10-10T09:00:00",
            "fecha_devolucion": "2026-10-10T10:00:00",
        },
        headers=headers(e["t_a"]),
    )
    assert r.status_code == 400


def test_prestamo_dispositivo_lista_y_patch_por_sede(client, db):
    e = _escenario(db, client)
    d_a = _dispositivo(db, "Soledad")
    d_b = _dispositivo(db, "Barranquilla")
    p_a = _prestamo_dispositivo(db, d_a, e["est_a"])
    p_b = _prestamo_dispositivo(db, d_b, e["est_b"])

    lista = client.get("/prestamos-dispositivos/", headers=headers(e["t_gestor"]))
    assert lista.status_code == 200
    ids = [p["id"] for p in lista.json()]
    assert p_a.id in ids and p_b.id not in ids
    assert client.patch(
        f"/prestamos-dispositivos/{p_b.id}", json={"estado": "Activo"}, headers=headers(e["t_gestor"])
    ).status_code == 404


# ─── Usuarios ──────────────────────────────────────────────────────────────
def test_admin_usuarios_aislados_por_sede(client, db):
    e = _escenario(db, client, rol_gestor="Administrador")
    lista = client.get("/usuarios/", headers=headers(e["t_gestor"]))
    ids = [u["id"] for u in lista.json()]
    assert e["est_a"].id in ids
    assert e["est_b"].id not in ids

    assert client.get(f"/usuarios/{e['est_b'].id}", headers=headers(e["t_gestor"])).status_code == 404
    assert client.put(
        f"/usuarios/{e['est_b'].id}", json={"nombre": "X"}, headers=headers(e["t_gestor"])
    ).status_code == 404
    assert client.delete(
        f"/usuarios/{e['est_b'].id}", headers=headers(e["t_gestor"])
    ).status_code == 404


def test_crear_usuario_fuerza_sede_del_actor(client, db):
    e = _escenario(db, client, rol_gestor="Administrador")
    r = client.post("/usuarios/", json=PAYLOAD_USUARIO, headers=headers(e["t_gestor"]))
    assert r.status_code == 201, r.text
    assert r.json()["sede"] == "Soledad"


def test_revocar_modulo_anula_lectura_por_id(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000", sede="Soledad")
    otro = crear_usuario(db, rol="Estudiante", identificacion="1001", sede="Soledad")
    t = token_de(client, admin)
    assert client.get(f"/usuarios/{otro.id}", headers=headers(t)).status_code == 200

    db.query(ModuloRol).filter(
        ModuloRol.rol_id == _rol(db, "Administrador").id,
        ModuloRol.modulo_id == db.query(Modulo).filter(Modulo.nombre == "gestion_usuarios").first().id,
    ).delete()
    db.commit()
    assert client.get(f"/usuarios/{otro.id}", headers=headers(t)).status_code == 403


def test_revocar_gestion_prestamos_anula_aprobacion(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000", sede="Soledad")
    libro = crear_libro(db, sede="Soledad")
    t = token_de(client, admin)
    db.query(ModuloRol).filter(
        ModuloRol.rol_id == _rol(db, "Administrador").id,
        ModuloRol.modulo_id == db.query(Modulo).filter(Modulo.nombre == "gestion_prestamos").first().id,
    ).delete()
    db.commit()

    r = client.post(
        "/loan/",
        json={
            "user_id": admin.id,
            "book_id": libro.ID,
            "loan_date": "2026-01-05T10:00:00",
            "delivery_date": "2026-01-09T10:00:00",
            "prestamo_state": "Aprobado",
        },
        headers=headers(t),
    )
    assert r.status_code == 403


# ─── Ingresos y dashboard ──────────────────────────────────────────────────
def test_ingresos_aislados_por_sede(client, db):
    e = _escenario(db, client)
    for u in (e["est_a"], e["est_b"]):
        db.add(LibraryAccess(user_id=u.id, message="OK", status=True))
    db.commit()

    r = client.get("/api/library-access/", headers=headers(e["t_gestor"]))
    assert r.status_code == 200
    assert {row["user_id"] for row in r.json()} == {e["est_a"].id}


def test_dashboard_aislado_por_sede(client, db):
    e = _escenario(db, client)
    r = client.get("/api/ia/dashboard", headers=headers(e["t_gestor"]))
    assert r.status_code == 200
    assert r.json()["morosidad"]["total"] == 0

    sup = crear_usuario(db, rol="super_administrador", identificacion="9000", sede="Colsamiro")
    r_sup = client.get("/api/ia/dashboard", headers=headers(token_de(client, sup)))
    assert r_sup.status_code == 200
    assert r_sup.json()["morosidad"]["total"] >= 1


# ─── Migración segura ──────────────────────────────────────────────────────
def test_plan_rbac_no_escribe(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    db.add(ModuloRol(
        rol_id=_rol(db, "Estudiante").id,
        modulo_id=db.query(Modulo).filter(Modulo.nombre == "gestion_usuarios").first().id,
    ))
    db.commit()

    plan = sembrar_rbac(db, aplicar=False)
    assert any(p["rol"] == "Estudiante" and p["modulo"] == "gestion_usuarios" for p in plan["enlaces_quitar"])
    # La previsualización no cambia nada.
    assert tiene_modulo(db, _rol(db, "Estudiante").id, "gestion_usuarios")
    assert client.get("/usuarios/", headers=headers(token_de(client, est))).status_code == 200

    sembrar_rbac(db, aplicar=True)
    assert not tiene_modulo(db, _rol(db, "Estudiante").id, "gestion_usuarios")


def test_roles_personalizados_se_conservan(client, db):
    db.add(Rol(nombre="Auditor", descripcion="Rol institucional"))
    db.commit()
    auditor_id = _rol(db, "Auditor").id
    usuario_id = db.query(Modulo).filter(Modulo.nombre == "gestion_usuarios").first().id
    db.add(ModuloRol(rol_id=auditor_id, modulo_id=usuario_id))
    db.commit()

    plan = sembrar_rbac(db)
    assert "Auditor" in plan["roles_personalizados"]
    assert "Auditor" not in ROLES
    assert tiene_modulo(db, auditor_id, "gestion_usuarios")


def test_planificar_rbac_completo_no_tiene_pendientes(db):
    sembrar_rbac(db)
    plan = planificar_rbac(db)
    assert not plan["enlaces_agregar"]
    assert not plan["enlaces_quitar"]
    assert not plan["roles_faltantes"]
    assert not plan["modulos_faltantes"]
