"""
test_libros.py — Pruebas del endpoint de búsqueda de libros para préstamo.
Usa SQLite (conftest), por lo que el collation es el de SQLAlchemy/SQLite.
"""

from .conftest import crear_usuario, crear_libro, token_de, headers


def _buscar(client, token, q, limit=None):
    url = "/libros/buscar?q=" + q
    if limit is not None:
        url += f"&limit={limit}"
    return client.get(url, headers=headers(token))


def _token_usuario(client, db, identificacion):
    u = crear_usuario(db, identificacion=identificacion)
    return token_de(client, u)


def test_buscar_requiere_autenticacion(client):
    r = client.get("/libros/buscar?q=mem")
    assert r.status_code == 401


def test_buscar_por_titulo_parcial(client, db):
    token = _token_usuario(client, db, "7001")
    crear_libro(db, titulo="Memorias de un Abanderado", autor="Maria Espinosa", ejemplares=2)
    crear_libro(db, titulo="Arte de dirigir", autor="Otro Autor", ejemplares=1)

    r = _buscar(client, token, "mem")
    assert r.status_code == 200
    datos = r.json()
    assert any(x["titulo"] == "Memorias de un Abanderado" for x in datos)
    assert all("id" in x and "titulo" in x and "autor" in x for x in datos)


def test_buscar_por_autor(client, db):
    token = _token_usuario(client, db, "7002")
    crear_libro(db, titulo="Memorias de un Abanderado", autor="Maria Espinosa", ejemplares=1)

    r = _buscar(client, token, "espinosa")
    assert r.status_code == 200
    assert any(x["autor"] == "Maria Espinosa" for x in r.json())


def test_buscar_insensible_a_mayusculas(client, db):
    token = _token_usuario(client, db, "7003")
    crear_libro(db, titulo="El Arte de Venderse", autor="Beckwith", ejemplares=1)

    r = _buscar(client, token, "ARTE")
    assert r.status_code == 200
    assert any(x["titulo"] == "El Arte de Venderse" for x in r.json())


def test_buscar_sin_resultados(client, db):
    token = _token_usuario(client, db, "7004")
    r = _buscar(client, token, "xyz123456")
    assert r.status_code == 200
    assert r.json() == []


def test_buscar_solo_libros_disponibles(client, db):
    token = _token_usuario(client, db, "7005")
    crear_libro(db, titulo="Libro Disponible", autor="Autor A", ejemplares=3)
    crear_libro(db, titulo="Libro Agotado", autor="Autor B", ejemplares=0)

    r = _buscar(client, token, "Libro")
    assert r.status_code == 200
    titulos = [x["titulo"] for x in r.json()]
    assert "Libro Disponible" in titulos
    assert "Libro Agotado" not in titulos


def test_buscar_respeta_limite(client, db):
    token = _token_usuario(client, db, "7006")
    for i in range(5):
        crear_libro(db, titulo=f"Libro de prueba {i}", autor="Autor X", ejemplares=1)

    r = _buscar(client, token, "prueba", limit=3)
    assert r.status_code == 200
    assert len(r.json()) == 3


def test_buscar_solo_muestra_libros_de_la_sede_del_usuario(client, db):
    u = crear_usuario(db, identificacion="7101", sede="Barranquilla")
    token = token_de(client, u)
    crear_libro(db, titulo="Libro de Soledad", autor="Autor A", sede="Soledad")
    crear_libro(db, titulo="Libro de Barranquilla", autor="Autor A", sede="Barranquilla")

    r = _buscar(client, token, "Libro")
    assert r.status_code == 200
    titulos = [x["titulo"] for x in r.json()]
    assert "Libro de Barranquilla" in titulos
    assert "Libro de Soledad" not in titulos


def test_buscar_param_sede_ignorado_para_no_super(client, db):
    u = crear_usuario(db, identificacion="7102", sede="Soledad")
    token = token_de(client, u)
    crear_libro(db, titulo="Libro de Barranquilla", autor="Autor B", sede="Barranquilla")

    # Un usuario normal NO puede filtrar por otra sede: el backend usa su sede.
    r = client.get("/libros/buscar?q=Barranquilla&sede=Barranquilla", headers=headers(token))
    assert r.status_code == 200
    assert r.json() == []