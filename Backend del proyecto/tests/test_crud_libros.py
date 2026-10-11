"""CRUD de libros: alta válida, entradas inválidas, consulta, actualización,
eliminación y autorización (solo roles con módulo gestion_libros)."""

from .conftest import crear_libro, crear_usuario, headers, token_de

PAYLOAD_VALIDO = {
    "Autor": "Autor Prueba",
    "Titulo": "Libro de prueba",
    "Programa": "Ingeniería Telemática",
    "Item": 1,
    "Signatura": "SIG-TEST-001",
    "Areas": 10,
    "Ejemplar": 2,
    "Editorial": "Editorial IUB",
    "Año": 2026,
    "Idioma": "Español",
    "sede": "Soledad",
}


def _token_admin(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    return token_de(client, admin)


def _token_estudiante(client, db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    return token_de(client, est)


def test_crear_libro_valido(client, db):
    t = _token_admin(client, db)
    r = client.post("/libros/", json=PAYLOAD_VALIDO, headers=headers(t))
    assert r.status_code == 201
    data = r.json()
    assert data["Titulo"] == "Libro de prueba"
    assert data["Signatura"] == "SIG-TEST-001"
    assert data["ID"] > 0


def test_crear_libro_campos_obligatorios(client, db):
    t = _token_admin(client, db)
    r = client.post("/libros/", json={"Titulo": "Sin datos mínimos"}, headers=headers(t))
    assert r.status_code == 422


def test_consultar_libro_creado(client, db):
    libro = crear_libro(db, titulo="Consultable")
    t = _token_estudiante(client, db)
    leido = client.get(f"/libros/{libro.ID}", headers=headers(t))
    assert leido.status_code == 200
    assert leido.json()["Titulo"] == "Consultable"
    no_existe = client.get("/libros/999999", headers=headers(t))
    assert no_existe.status_code == 404


def test_listar_libros(client, db):
    crear_libro(db, titulo="A1")
    crear_libro(db, titulo="A2")
    t = _token_estudiante(client, db)
    r = client.get("/libros/", headers=headers(t))
    assert r.status_code == 200
    assert len(r.json()) >= 2


def test_actualizar_libro(client, db):
    libro = crear_libro(db, titulo="Antes")
    t = _token_admin(client, db)
    r = client.put(
        f"/libros/{libro.ID}",
        json={"Titulo": "Después", "Ejemplar": 5},
        headers=headers(t),
    )
    assert r.status_code == 200
    assert r.json()["Titulo"] == "Después"
    assert r.json()["Ejemplar"] == 5


def test_eliminar_libro(client, db):
    libro = crear_libro(db, titulo="Se elimina")
    t = _token_admin(client, db)
    r = client.delete(f"/libros/{libro.ID}", headers=headers(t))
    assert r.status_code == 200
    after = client.get(f"/libros/{libro.ID}", headers=headers(t))
    assert after.status_code == 404


def test_estudiante_no_gestiona_libros(client, db):
    libro = crear_libro(db, titulo="X")
    t = _token_estudiante(client, db)
    assert client.post("/libros/", json=PAYLOAD_VALIDO, headers=headers(t)).status_code == 403
    assert client.put(f"/libros/{libro.ID}", json={"Titulo": "Y"}, headers=headers(t)).status_code == 403
    assert client.delete(f"/libros/{libro.ID}", headers=headers(t)).status_code == 403


def test_sin_token_401_libros(client):
    assert client.post("/libros/", json=PAYLOAD_VALIDO).status_code == 401
    assert client.get("/libros/").status_code == 401