"""Pruebas de préstamos: lógica de inventario y flujos de aprobación."""

from datetime import datetime, timedelta

from database import Prestamos, Dispositivo

from .conftest import crear_libro, crear_usuario, headers, token_de


def _crear_dispositivo(db, estado="Disponible"):
    d = Dispositivo(tipo="Computador", marca="HP", modelo="ProBook", sede="Soledad", estado=estado)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


def _dias_libro(dias=5):
    """Préstamo de LIBROS: hoy + 5 días (válido: 4 a 6 días)."""
    ahora = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
    entrega = ahora + timedelta(days=dias)
    return ahora.isoformat(), entrega.isoformat()


def _slot(h_inicio, h_fin):
    """Franja horaria de DISPOSITIVOS a horas concretas de hoy (08:00-20:00)."""
    ini = datetime.now().replace(hour=h_inicio, minute=0, second=0, microsecond=0)
    fin = datetime.now().replace(hour=h_fin, minute=0, second=0, microsecond=0)
    return ini.isoformat(), fin.isoformat()


def test_solicitud_no_aprobada_no_descuenta(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    libro = crear_libro(db, ejemplares=3)
    t_est = token_de(client, est)

    loan, delivery = _dias_libro()
    r = client.post("/loan/", json={
        "user_id": est.id, "book_id": libro.ID,
        "loan_date": loan, "delivery_date": delivery, "prestamo_state": "No Aprobado",
    }, headers=headers(t_est))
    assert r.status_code == 201
    db.refresh(libro)
    assert libro.Ejemplar == 3  # sin descuento


def test_estudiante_no_aprueba(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    libro = crear_libro(db)
    t_est = token_de(client, est)
    loan, delivery = _dias_libro()
    r = client.post("/loan/", json={
        "user_id": est.id, "book_id": libro.ID,
        "loan_date": loan, "delivery_date": delivery, "prestamo_state": "Aprobado",
    }, headers=headers(t_est))
    assert r.status_code == 403


def test_estudiante_no_solicita_para_otro(client, db):
    a = crear_usuario(db, rol="Estudiante", identificacion="1001", nombre="Ana")
    b = crear_usuario(db, rol="Estudiante", identificacion="1002", nombre="Beto")
    libro = crear_libro(db)
    t_a = token_de(client, a)
    loan, delivery = _dias_libro()
    r = client.post("/loan/", json={
        "user_id": b.id, "book_id": libro.ID,
        "loan_date": loan, "delivery_date": delivery, "prestamo_state": "No Aprobado",
    }, headers=headers(t_a))
    assert r.status_code == 403


def test_aprobar_descuenta_y_devolver_restaura(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    libro = crear_libro(db, ejemplares=2)
    t_est = token_de(client, est)
    t_admin = token_de(client, admin)

    loan, delivery = _dias_libro()
    r = client.post("/loan/", json={
        "user_id": est.id, "book_id": libro.ID,
        "loan_date": loan, "delivery_date": delivery, "prestamo_state": "No Aprobado",
    }, headers=headers(t_est))
    loan_id = r.json()["id"]

    # Aprobar → descuenta
    r = client.patch(f"/loan/{loan_id}", json={"prestamo_state": "Aprobado"}, headers=headers(t_admin))
    assert r.status_code == 200
    db.refresh(libro)
    assert libro.Ejemplar == 1

    # Devolver → restaura
    r = client.patch(f"/loan/{loan_id}", json={"state": "Devuelto", "entry_date": datetime.now().isoformat()}, headers=headers(t_admin))
    assert r.status_code == 200
    db.refresh(libro)
    assert libro.Ejemplar == 2


def test_admin_crea_aprobado_descuenta(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    libro = crear_libro(db, ejemplares=3)
    t_admin = token_de(client, admin)

    loan, delivery = _dias_libro()
    r = client.post("/loan/", json={
        "user_id": est.id, "book_id": libro.ID,
        "loan_date": loan, "delivery_date": delivery, "prestamo_state": "Aprobado",
    }, headers=headers(t_admin))
    assert r.status_code == 201
    db.refresh(libro)
    assert libro.Ejemplar == 2


def test_rechazar_solicitud_no_descuenta(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    libro = crear_libro(db, ejemplares=3)
    t_est = token_de(client, est)
    t_admin = token_de(client, admin)

    loan, delivery = _dias_libro()
    r = client.post("/loan/", json={
        "user_id": est.id, "book_id": libro.ID,
        "loan_date": loan, "delivery_date": delivery, "prestamo_state": "No Aprobado",
    }, headers=headers(t_est))
    loan_id = r.json()["id"]

    r = client.patch(f"/loan/{loan_id}", json={"prestamo_state": "Rechazado", "state": "Devuelto"}, headers=headers(t_admin))
    assert r.status_code == 200
    db.refresh(libro)
    assert libro.Ejemplar == 3


def test_libro_sin_ejemplares(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    libro = crear_libro(db, ejemplares=0)
    t_est = token_de(client, est)
    loan, delivery = _dias_libro()
    r = client.post("/loan/", json={
        "user_id": est.id, "book_id": libro.ID,
        "loan_date": loan, "delivery_date": delivery, "prestamo_state": "No Aprobado",
    }, headers=headers(t_est))
    assert r.status_code == 400


def test_prestamo_duplicado_activo(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    libro = crear_libro(db, ejemplares=5)
    t_est = token_de(client, est)
    loan, delivery = _dias_libro()

    payload = {
        "user_id": est.id, "book_id": libro.ID,
        "loan_date": loan, "delivery_date": delivery, "prestamo_state": "No Aprobado",
    }
    r1 = client.post("/loan/", json=payload, headers=headers(t_est))
    assert r1.status_code == 201
    r2 = client.post("/loan/", json=payload, headers=headers(t_est))
    assert r2.status_code == 400


def test_listar_prestamos_devuelve_nombre_y_libro(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    est = crear_usuario(db, rol="Estudiante", identificacion="1001", nombre="Ana Pérez")
    libro = crear_libro(db, titulo="El Quijote")
    t_admin = token_de(client, admin)
    t_est = token_de(client, est)

    loan, delivery = _dias_libro()
    r = client.post("/loan/", json={
        "user_id": est.id, "book_id": libro.ID,
        "loan_date": loan, "delivery_date": delivery, "prestamo_state": "No Aprobado",
    }, headers=headers(t_est))
    loan_id = r.json()["id"]
    client.patch(f"/loan/{loan_id}", json={"prestamo_state": "Aprobado"}, headers=headers(t_admin))

    r = client.get("/loan/", headers=headers(t_admin))
    assert r.status_code == 200
    assert any(x["user"] == "Ana Pérez" and x["book"] == "El Quijote" for x in r.json())


def test_eliminar_usuario_borra_sus_prestamos_y_no_renumera(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    libro = crear_libro(db)
    t_admin = token_de(client, admin)

    loan, delivery = _dias_libro()
    r = client.post("/loan/", json={
        "user_id": est.id, "book_id": libro.ID,
        "loan_date": loan, "delivery_date": delivery, "prestamo_state": "Aprobado",
    }, headers=headers(t_admin))
    assert r.status_code == 201

    r = client.delete(f"/usuarios/{est.id}", headers=headers(t_admin))
    assert r.status_code == 200

    # El ID del admin NO debe re-numerarse (antes se corrompía)
    r = client.get(f"/usuarios/{admin.id}", headers=headers(t_admin))
    assert r.status_code == 200
    assert r.json()["id"] == admin.id
    # No deben quedar préstamos del estudiante
    assert db.query(Prestamos).filter(Prestamos.user_id == est.id).count() == 0


# ─── Préstamos de dispositivos: estudiante solicita, admin aprueba ───────────
def test_estudiante_solicita_su_dispositivo(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    d = _crear_dispositivo(db)
    t_est = token_de(client, est)
    loan, delivery = _slot(9, 10)
    r = client.post("/prestamos-dispositivos/", json={
        "dispositivo_id": d.id, "user_id": est.id,
        "fecha_prestamo": loan, "fecha_devolucion": delivery,
    }, headers=headers(t_est))
    assert r.status_code == 201
    assert r.json()["estado"] == "Pendiente"
    db.refresh(d)
    assert d.estado == "Disponible"  # aún no se marca Prestado


def test_admin_aprueba_dispositivo(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    d = _crear_dispositivo(db)
    t_est = token_de(client, est)
    t_admin = token_de(client, admin)
    loan, delivery = _slot(9, 10)
    r = client.post("/prestamos-dispositivos/", json={
        "dispositivo_id": d.id, "user_id": est.id,
        "fecha_prestamo": loan, "fecha_devolucion": delivery,
    }, headers=headers(t_est))
    prestamo_id = r.json()["id"]

    r = client.patch(f"/prestamos-dispositivos/{prestamo_id}", json={"estado": "Activo"}, headers=headers(t_admin))
    assert r.status_code == 200
    assert r.json()["estado"] == "Activo"
    db.refresh(d)
    assert d.estado == "Prestado"


def test_admin_rechaza_dispositivo(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    d = _crear_dispositivo(db)
    t_est = token_de(client, est)
    t_admin = token_de(client, admin)
    loan, delivery = _slot(9, 10)
    r = client.post("/prestamos-dispositivos/", json={
        "dispositivo_id": d.id, "user_id": est.id,
        "fecha_prestamo": loan, "fecha_devolucion": delivery,
    }, headers=headers(t_est))
    prestamo_id = r.json()["id"]

    r = client.patch(f"/prestamos-dispositivos/{prestamo_id}", json={"estado": "Rechazado"}, headers=headers(t_admin))
    assert r.status_code == 200
    assert r.json()["estado"] == "Rechazado"
    db.refresh(d)
    assert d.estado == "Disponible"


def test_estudiante_no_solicita_dispositivo_ajeno(client, db):
    a = crear_usuario(db, rol="Estudiante", identificacion="1001", nombre="Ana")
    b = crear_usuario(db, rol="Estudiante", identificacion="1002", nombre="Beto")
    d = _crear_dispositivo(db)
    t_a = token_de(client, a)
    loan, delivery = _slot(9, 10)
    r = client.post("/prestamos-dispositivos/", json={
        "dispositivo_id": d.id, "user_id": b.id,
        "fecha_prestamo": loan, "fecha_devolucion": delivery,
    }, headers=headers(t_a))
    assert r.status_code == 403


def test_estudiante_no_modifica_prestamos_dispositivos(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    d = _crear_dispositivo(db)
    t_est = token_de(client, est)
    loan, delivery = _slot(9, 10)
    r = client.post("/prestamos-dispositivos/", json={
        "dispositivo_id": d.id, "user_id": est.id,
        "fecha_prestamo": loan, "fecha_devolucion": delivery,
    }, headers=headers(t_est))
    prestamo_id = r.json()["id"]
    # Un estudiante no puede marcar como completado/dañado un préstamo
    r = client.patch(f"/prestamos-dispositivos/{prestamo_id}", json={"estado": "Completado"}, headers=headers(t_est))
    assert r.status_code == 403


# ─── Privacidad: cada usuario ve solo sus préstamos ──────────────────────────
def test_estudiante_ve_solo_sus_prestamos_libros(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    a = crear_usuario(db, rol="Estudiante", identificacion="1001", nombre="Ana")
    b = crear_usuario(db, rol="Estudiante", identificacion="1002", nombre="Beto")
    libro = crear_libro(db)
    t_admin = token_de(client, admin)
    t_b = token_de(client, b)

    loan, delivery = _dias_libro()
    r = client.post("/loan/", json={
        "user_id": a.id, "book_id": libro.ID,
        "loan_date": loan, "delivery_date": delivery, "prestamo_state": "Aprobado",
    }, headers=headers(t_admin))
    assert r.status_code == 201

    # B no ve el préstamo de A
    r = client.get("/loan/", headers=headers(t_b))
    assert r.status_code == 200
    assert all(x["user_id"] == b.id for x in r.json())
    # El admin sí ve el préstamo de A
    r = client.get("/loan/", headers=headers(t_admin))
    assert any(x["user_id"] == a.id for x in r.json())


def test_estudiante_no_ve_prestamo_ajeno_por_id(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    a = crear_usuario(db, rol="Estudiante", identificacion="1001", nombre="Ana")
    b = crear_usuario(db, rol="Estudiante", identificacion="1002", nombre="Beto")
    libro = crear_libro(db)
    t_admin = token_de(client, admin)
    t_b = token_de(client, b)

    loan, delivery = _dias_libro()
    r = client.post("/loan/", json={
        "user_id": a.id, "book_id": libro.ID,
        "loan_date": loan, "delivery_date": delivery, "prestamo_state": "Aprobado",
    }, headers=headers(t_admin))
    loan_id = r.json()["id"]

    r = client.get(f"/loan/{loan_id}", headers=headers(t_b))
    assert r.status_code == 403


def test_estudiante_ve_solo_sus_prestamos_dispositivos(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    a = crear_usuario(db, rol="Estudiante", identificacion="1001", nombre="Ana")
    b = crear_usuario(db, rol="Estudiante", identificacion="1002", nombre="Beto")
    d = _crear_dispositivo(db)
    t_admin = token_de(client, admin)
    t_b = token_de(client, b)
    loan, delivery = _slot(9, 10)

    r = client.post("/prestamos-dispositivos/", json={
        "dispositivo_id": d.id, "user_id": a.id,
        "fecha_prestamo": loan, "fecha_devolucion": delivery,
    }, headers=headers(t_admin))
    assert r.status_code == 201

    r = client.get("/prestamos-dispositivos/", headers=headers(t_b))
    assert r.status_code == 200
    assert all(x["user_id"] == b.id for x in r.json())


# ─── Libros: plazo de 4 a 6 días · Dispositivos: franja 08:00-20:00 máx 2 h ───
def test_libro_menos_de_4_dias_rechazado(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    libro = crear_libro(db)
    t_est = token_de(client, est)
    loan, delivery = _slot(9, 10)  # mismo día: 1 día < 4
    r = client.post("/loan/", json={
        "user_id": est.id, "book_id": libro.ID,
        "loan_date": loan, "delivery_date": delivery, "prestamo_state": "No Aprobado",
    }, headers=headers(t_est))
    assert r.status_code == 400
    assert "4 a 6 días" in r.json()["detail"]


def test_libro_mas_de_6_dias_rechazado(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    libro = crear_libro(db)
    t_est = token_de(client, est)
    loan, delivery = _dias_libro(dias=7)  # 7 días > 6
    r = client.post("/loan/", json={
        "user_id": est.id, "book_id": libro.ID,
        "loan_date": loan, "delivery_date": delivery, "prestamo_state": "No Aprobado",
    }, headers=headers(t_est))
    assert r.status_code == 400
    assert "4 a 6 días" in r.json()["detail"]


def test_libro_5_dias_valido(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    libro = crear_libro(db)
    t_est = token_de(client, est)
    loan, delivery = _dias_libro(dias=5)
    r = client.post("/loan/", json={
        "user_id": est.id, "book_id": libro.ID,
        "loan_date": loan, "delivery_date": delivery, "prestamo_state": "No Aprobado",
    }, headers=headers(t_est))
    assert r.status_code == 201


def test_franja_mayor_a_2_horas_rechazada_dispositivo(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    d = _crear_dispositivo(db)
    t_est = token_de(client, est)
    ini, fin = _slot(9, 12)
    r = client.post("/prestamos-dispositivos/", json={
        "dispositivo_id": d.id, "user_id": est.id,
        "fecha_prestamo": ini, "fecha_devolucion": fin,
    }, headers=headers(t_est))
    assert r.status_code == 400


def test_franja_valida_limite_2_horas(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    d = _crear_dispositivo(db)
    t_est = token_de(client, est)
    ini, fin = _slot(18, 20)  # exactamente 2 horas, cierre 20:00
    r = client.post("/prestamos-dispositivos/", json={
        "dispositivo_id": d.id, "user_id": est.id,
        "fecha_prestamo": ini, "fecha_devolucion": fin,
    }, headers=headers(t_est))
    assert r.status_code == 201