"""Pruebas de revalidación del rol vigente para la API Express."""

from .conftest import crear_usuario, headers, token_de
from models.models import Rol, UserTable


def test_introspeccion_relee_el_rol_de_la_base(client, db):
    usuario = crear_usuario(db, rol="Administrador", identificacion="9101")
    token = token_de(client, usuario)

    primera = client.get("/api/auth/introspect", headers=headers(token))
    assert primera.status_code == 200
    assert primera.json()["active"] is True
    assert primera.json()["rol"] == "Administrador"
    assert primera.headers["cache-control"] == "no-store, max-age=0"

    rol_estudiante = db.query(Rol).filter(Rol.nombre == "Estudiante").first()
    usuario_db = db.query(UserTable).filter(UserTable.id == usuario.id).first()
    usuario_db.rol_id = rol_estudiante.id
    db.commit()

    segunda = client.get("/api/auth/introspect", headers=headers(token))
    assert segunda.status_code == 200
    assert segunda.json()["rol"] == "Estudiante"


def test_introspeccion_rechaza_token_ausente(client):
    response = client.get("/api/auth/introspect")
    assert response.status_code == 401
