"""Pruebas de IA: búsqueda semántica, chatbot, recomendaciones y predictivo."""

from database import Libro, Prestamos
from datetime import datetime, timedelta

from services.ia import chatbot, busqueda_semantica, predictivo, recomendador

from .conftest import crear_libro, crear_usuario, headers, token_de


def _poblar(db):
    crear_libro(db, titulo="Administración de Empresas", autor="Peter Drucker", programa="Administración de Negocios Internacionales", ejemplares=2)
    crear_libro(db, titulo="Circuitos Eléctricos", autor="Sadiku", programa="Ingeniería Eléctrica", ejemplares=3)
    crear_libro(db, titulo="Física Mecánica", autor="Sears", programa="Básicas y transversales", ejemplares=1)


def test_busqueda_semantica_encuentra(db):
    _poblar(db)
    resultados = busqueda_semantica.buscar(db, "administracion de negocios", top_k=3)
    assert len(resultados) > 0
    assert resultados[0]["libro"].Titulo == "Administración de Empresas"


def test_busqueda_semantica_por_tema(db):
    _poblar(db)
    resultados = busqueda_semantica.buscar(db, "ingenieria electrica", top_k=3)
    assert any(r["libro"].Programa == "Ingeniería Eléctrica" for r in resultados)


def test_busqueda_semantica_vacia_ok(db):
    resultados = busqueda_semantica.buscar(db, "algo inexistente zzz", top_k=3)
    assert resultados == []


def test_chatbot_saludo(db):
    r = chatbot.responder(db, "hola")
    assert "asistente" in r["respuesta"].lower()
    assert r["intencion"] == "saludo"


def test_chatbot_recomendacion(db):
    crear_usuario(db, rol="Estudiante", identificacion="1001", carrera="Ingeniería Eléctrica")
    _poblar(db)
    # Buscamos un usuario real
    from models.models import UserTable
    u = db.query(UserTable).first()
    r = chatbot.responder(db, "recomiendame libros", user_id=u.id)
    assert r["intencion"] == "recomendar"


def test_chatbot_reglamento(db):
    r = chatbot.responder(db, "¿cuál es el reglamento?")
    assert r["intencion"] == "reglamento"
    assert "Horario" in r["respuesta"]


def test_recomendador_devuelve(db):
    _poblar(db)
    recs = recomendador.recomendar(db, user_id=None, top_k=3)
    assert isinstance(recs, list)
    for r in recs:
        assert "libro" in r and "razon" in r


def test_predictivo_resumen(db):
    _poblar(db)
    resumen = predictivo.resumen(db)
    assert "tendencia" in resumen
    assert "libros_top" in resumen
    assert "disponibilidad_critica" in resumen
    assert "demanda_dispositivos" in resumen
    assert "morosidad" in resumen
    assert "pendientes_aprobacion" in resumen


def test_predictivo_morosidad_con_vencido(db):
    est = crear_usuario(db, rol="Estudiante", identificacion="1001")
    libro = crear_libro(db)
    db.add(Prestamos(
        user_id=est.id, book_id=str(libro.ID),
        loan_date=datetime.now() - timedelta(days=10),
        delivery_date=datetime.now() - timedelta(days=3),
        state="Activo", prestamo_state="Aprobado",
    ))
    db.commit()
    m = predictivo.morosidad(db)
    assert m["total"] == 1


def test_ia_endpoints_api(client, db):
    """Endpoints /api/ia/* protegidos y funcionales."""
    admin = crear_usuario(db, rol="Administrador", identificacion="1000")
    _poblar(db)
    t = token_de(client, admin)

    # Sin token → 401
    assert client.get("/api/ia/estado").status_code == 401

    r = client.get("/api/ia/estado", headers=headers(t))
    assert r.status_code == 200
    assert r.json()["motor_llm"] in ("ollama", "determinista")

    r = client.get("/api/ia/buscar", params={"q": "administracion"}, headers=headers(t))
    assert r.status_code == 200
    assert len(r.json()) >= 1

    r = client.get("/api/ia/recomendaciones", headers=headers(t))
    assert r.status_code == 200

    r = client.get("/api/ia/dashboard", headers=headers(t))
    assert r.status_code == 200

    r = client.post("/api/ia/chat", json={"mensaje": "hola"}, headers=headers(t))
    assert r.status_code == 200
    assert "respuesta" in r.json()