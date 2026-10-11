"""CRUD de dispositivos: alta válida, entradas inválidas, consulta,
actualización, eliminación y autorización."""

from database import Dispositivo

from .conftest import crear_usuario, headers, token_de


def _crear_dispositivo(db, **kw):
    d = Dispositivo(
        tipo=kw.get("tipo", "Computador"),
        marca=kw.get("marca", "HP"),
        modelo=kw.get("modelo", "ProBook"),
        sede=kw.get("sede", "Soledad"),
        estado=kw.get("estado", "Disponible"),
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


def _token_admin(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    return token_de(client, admin)


def _token_estudiante(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    return token_de(client, est)


def test_crear_dispositivo_valido(client, db):
    t = _token_admin(client, db)
    r = client.post(
        "/dispositivos/",
        json={"tipo": "Computador", "marca": "HP", "modelo": "EliteDesk", "sede": "Soledad"},
        headers=headers(t),
    )
    assert r.status_code == 201
    data = r.json()
    assert data["tipo"] == "Computador"
    assert data["estado"] == "Disponible"
    assert data["id"] > 0


def test_crear_dispositivo_campos_obligatorios(client, db):
    t = _token_admin(client, db)
    r = client.post("/dispositivos/", json={"marca": "HP"}, headers=headers(t))
    assert r.status_code == 422


def test_consultar_dispositivo(client, db):
    d = _crear_dispositivo(db)
    t = _token_estudiante(client, db)
    r = client.get(f"/dispositivos/{d.id}", headers=headers(t))
    assert r.status_code == 200
    assert r.json()["id"] == d.id
    assert client.get("/dispositivos/999999", headers=headers(t)).status_code == 404


def test_listar_dispositivos(client, db):
    _crear_dispositivo(db)
    _crear_dispositivo(db, tipo="Tablet", modelo="Tab A9")
    t = _token_estudiante(client, db)
    r = client.get("/dispositivos/", headers=headers(t))
    assert r.status_code == 200
    assert len(r.json()) >= 2


def test_actualizar_dispositivo(client, db):
    d = _crear_dispositivo(db)
    t = _token_admin(client, db)
    r = client.put(f"/dispositivos/{d.id}", json={"marca": "Lenovo"}, headers=headers(t))
    assert r.status_code == 200
    assert r.json()["marca"] == "Lenovo"


def test_eliminar_dispositivo(client, db):
    d = _crear_dispositivo(db)
    t = _token_admin(client, db)
    r = client.delete(f"/dispositivos/{d.id}", headers=headers(t))
    assert r.status_code == 200
    assert client.get(f"/dispositivos/{d.id}", headers=headers(t)).status_code == 404


def test_estudiante_no_gestiona_dispositivos(client, db):
    d = _crear_dispositivo(db)
    t = _token_estudiante(client, db)
    post = client.post("/dispositivos/", json={"tipo": "Computador", "marca": "X", "modelo": "Y", "sede": "Soledad"}, headers=headers(t))
    assert post.status_code == 403
    assert client.put(f"/dispositivos/{d.id}", json={"marca": "Z"}, headers=headers(t)).status_code == 403
    assert client.delete(f"/dispositivos/{d.id}", headers=headers(t)).status_code == 403


def test_sin_token_401_dispositivos(client):
    assert client.get("/dispositivos/").status_code == 401
    assert client.post("/dispositivos/", json={"tipo": "Computador", "marca": "X", "modelo": "Y", "sede": "Soledad"}).status_code == 401