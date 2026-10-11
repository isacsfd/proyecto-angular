"""Transiciones de préstamos de dispositivos: Completado y Dañado, estados no
permitidos y autorización (solo gestion_dispositivos)."""

from database import Dispositivo, PrestamoDispositivo

from .conftest import crear_usuario, headers, token_de

INICIO = "2026-10-10T09:00:00"
FIN = "2026-10-10T10:30:00"


def _crear_dispositivo(db):
    d = Dispositivo(tipo="Computador", marca="HP", modelo="ProBook", sede="Soledad")
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


def _usuarios(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    return token_de(client, admin), token_de(client, est)


def _solicitar(client, token, dispositivo_id, user_id):
    return client.post(
        "/prestamos-dispositivos/",
        json={
            "dispositivo_id": dispositivo_id,
            "user_id": user_id,
            "fecha_prestamo": INICIO,
            "fecha_devolucion": FIN,
        },
        headers=headers(token),
    )


def _estado_dispositivo(client, token, dispositivo_id):
    return client.get(f"/dispositivos/{dispositivo_id}", headers=headers(token)).json()["estado"]


def test_transicion_a_completado(client, db):
    t_admin, t_est = _usuarios(client, db)
    d = _crear_dispositivo(db)
    r = _solicitar(client, t_est, d.id, _usuario_id(db, "1001"))
    prestamo_id = r.json()["id"]
    assert r.status_code == 201
    assert r.json()["estado"] == "Pendiente"

    aprobar = client.patch(f"/prestamos-dispositivos/{prestamo_id}", json={"estado": "Activo"}, headers=headers(t_admin))
    assert aprobar.status_code == 200
    assert aprobar.json()["estado"] == "Activo"
    assert _estado_dispositivo(client, t_admin, d.id) == "Prestado"

    completar = client.patch(f"/prestamos-dispositivos/{prestamo_id}", json={"estado": "Completado"}, headers=headers(t_admin))
    assert completar.status_code == 200
    assert completar.json()["estado"] == "Completado"
    assert _estado_dispositivo(client, t_admin, d.id) == "Disponible"


def test_transicion_a_danado(client, db):
    t_admin, t_est = _usuarios(client, db)
    d = _crear_dispositivo(db)
    r = _solicitar(client, t_est, d.id, _usuario_id(db, "1001"))
    prestamo_id = r.json()["id"]
    client.patch(f"/prestamos-dispositivos/{prestamo_id}", json={"estado": "Activo"}, headers=headers(t_admin))

    danar = client.patch(f"/prestamos-dispositivos/{prestamo_id}", json={"estado": "Dañado"}, headers=headers(t_admin))
    assert danar.status_code == 200
    assert danar.json()["estado"] == "Dañado"
    assert _estado_dispositivo(client, t_admin, d.id) == "Dañado"


def test_estado_no_permitido(client, db):
    t_admin, t_est = _usuarios(client, db)
    d = _crear_dispositivo(db)
    r = _solicitar(client, t_est, d.id, _usuario_id(db, "1001"))
    prestamo_id = r.json()["id"]
    res = client.patch(f"/prestamos-dispositivos/{prestamo_id}", json={"estado": "Inventado"}, headers=headers(t_admin))
    assert res.status_code == 400


def test_estudiante_no_gestiona_estados(client, db):
    t_admin, t_est = _usuarios(client, db)
    d = _crear_dispositivo(db)
    r = _solicitar(client, t_est, d.id, _usuario_id(db, "1001"))
    prestamo_id = r.json()["id"]
    res = client.patch(f"/prestamos-dispositivos/{prestamo_id}", json={"estado": "Activo"}, headers=headers(t_est))
    assert res.status_code == 403


def _usuario_id(db, identificacion):
    from models.models import UserTable
    return db.query(UserTable).filter(UserTable.identificacion == identificacion).first().id