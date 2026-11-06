"""Pruebas P0 del Asistente Bibliotecario Integral (orquestador + disponibilidad).

Cubre: clasificación de intenciones, servicio determinista de disponibilidad
(sin inventar), catálogo, recomendaciones, préstamos propios (mantener límites
de identidad) y canal institucional con guard + fallback existente.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database import Prestamos
from datetime import datetime, timedelta

import pytest

from services.ia import asistente, disponibilidad
from .conftest import crear_libro, crear_usuario, headers, token_de


def _poblar(db):
    crear_libro(db, titulo="Administración de Empresas", autor="Peter Drucker",
                programa="Administración de Negocios Internacionales", ejemplares=2)
    crear_libro(db, titulo="Circuitos Eléctricos", autor="Sadiku",
                programa="Ingeniería Eléctrica", ejemplares=3)
    crear_libro(db, titulo="Física Mecánica", autor="Sears",
                programa="Básicas y transversales", ejemplares=0)


# ---------------- clasificador ----------------

def test_clasificacion_basica():
    casos = {
        "hola": "saludo",
        "¿recomiéndame libros de ingeniería?": "recomendar",
        "¿disponibilidad de Circuitos Eléctricos?": "disponibilidad",
        "¿tienes libros sobre党风廉政 administración?": "catalogo",
        "¿cuáles son los requisitos de ingreso a pregrado?": "institucional",
        "¿cuál es el horario de la biblioteca?": "institucional",
        "mis préstamos": "prestamos",
        "ayuda": "ayuda",
    }
    for msg, esperado in casos.items():
        assert asistente.clasificar(msg) == esperado, msg


def test_disponibilidad_prioridad_sobre_busqueda():
    # '¿hay disponible el libro de administracion?' cae en disponibilidad (no catálogo)
    assert asistente.clasificar("¿hay disponible un libro de administracion?") == "disponibilidad"


# ------------- disponibilidad determinista -------------

def test_disponibilidad_libro_con_ejemplares(db):
    _poblar(db)
    from database import Libro
    libro = db.query(Libro).filter(Libro.Titulo == "Circuitos Eléctricos").first()
    d = disponibilidad.de_libro(db, libro)
    assert d["disponibles"] == 3
    assert d["prestadosActivos"] == 0
    assert d["puedePrestar"] is True
    assert d["sede"]


def test_disponibilidad_libro_sin_ejemplares(db):
    _poblar(db)
    from database import Libro
    libro = db.query(Libro).filter(Libro.Titulo == "Física Mecánica").first()
    d = disponibilidad.de_libro(db, libro)
    assert d["disponibles"] == 0
    assert d["puedePrestar"] is False
    assert "copias individuales por sede" in d["nota_sede"]


def test_disponibilidad_con_prestamo_activo_agregado(db):
    _poblar(db)
    from database import Libro
    est = crear_usuario(db, rol="Estudiante", identificacion="2001")
    libro = db.query(Libro).filter(Libro.Titulo == "Circuitos Eléctricos").first()
    db.add(Prestamos(
        user_id=est.id, book_id=str(libro.ID),
        loan_date=datetime.now() - timedelta(days=5),
        delivery_date=datetime.now() + timedelta(days=2),
        state="Activo", prestamo_state="Aprobado"))
    db.commit()
    d = disponibilidad.de_libro(db, libro)
    assert d["prestadosActivos"] == 1
    # con user_id del MISMO estudiante expone su préstamo; con otro usuario no
    d_propio = disponibilidad.de_libro(db, libro, user_id=est.id)
    assert len(d_propio["misPrestamos"]) == 1
    otro = disponibilidad.de_libro(db, libro, user_id=None)
    assert "misPrestamos" not in otro


def test_resumen_por_sede(db):
    _poblar(db)
    resumen = disponibilidad.resumen_por_sede(db)
    assert isinstance(resumen, list)
    total_titulos = sum(r["titulos"] for r in resumen)
    assert total_titulos == 3


# ---------------- asistente: catálogo / disponibilidad ----------------

def test_asistente_catalogo_responde_con_datos_reales(db):
    _poblar(db)
    r = asistente.atender(db, "¿tienes libros de administración?")
    assert r["intencion"] == "catalogo"
    assert "Administración de Empresas" in r["respuesta"]
    assert "2 ejemplar(es) disponibles" in r["respuesta"]


def test_asistente_disponibilidad_libro_existente(db):
    _poblar(db)
    r = asistente.atender(db, "¿disponibilidad de Circuitos Eléctricos?")
    assert r["intencion"] == "disponibilidad"
    assert "Circuitos Eléctricos" in r["respuesta"]
    assert "3 ejemplar(es) disponibles" in r["respuesta"]


def test_asistente_disponibilidad_libro_agotado(db):
    _poblar(db)
    r = asistente.atender(db, "¿disponibilidad de Física Mecánica?")
    assert r["intencion"] == "disponibilidad"
    assert "sin ejemplares disponibles ahora" in r["respuesta"]


def test_asistente_disponibilidad_inexistente_no_inventa(db):
    _poblar(db)
    r = asistente.atender(db, "¿disponibilidad de El Senor de los Anillos?")  # no existe en BD
    assert "No se encontró el título" in r["respuesta"]
    assert "Verifica la ortografía" in r["respuesta"]
    # no debe mencionar títulos de la BD ni disponibilidad inventada
    assert "Circuitos" not in r["respuesta"]
    assert "ejemplar(es) disponibles" not in r["respuesta"]


def test_asistente_disponibilidad_por_sede(db):
    _poblar(db)
    r = asistente.atender(db, "¿qué hay disponible en la sede Soledad?")
    assert r["intencion"] == "disponibilidad"
    assert "Soledad" in r["respuesta"]
    assert "una sede por título" in r["respuesta"]


# ---------------- asistente: recomendaciones ----------------

def test_asistente_recomendaciones_con_usuario(db):
    _poblar(db)
    crear_usuario(db, rol="Estudiante", identificacion="3001", carrera="Ingeniería Eléctrica")
    from models.models import UserTable
    u = db.query(UserTable).filter(UserTable.identificacion == "3001").first()
    r = asistente.atender(db, "recomiéndame libros", user_id=u.id)
    assert r["intencion"] == "recomendar"
    assert "Recomendaciones" in r["respuesta"]
    # los recomendados tienen ejemplares disponibles (recomendador filtra) y se informa
    assert "ejemplar(es) disponibles" in r["respuesta"]


def test_asistente_recomendaciones_sin_identidad(db):
    # sin identidad NI temática: pregunta qué área interesa (no presenta
    # genéricas como personalizadas); marca las populares como NO personalizadas
    _poblar(db)
    r = asistente.atender(db, "recomiéndame libros", user_id=None)
    assert r["intencion"] == "recomendar"
    assert "¿Qué área o temática te interesa?" in r["respuesta"]
    assert "NO personalizadas" in r["respuesta"]


def test_asistente_recomendaciones_por_tematica(db):
    _poblar(db)
    r = asistente.atender(db, "recomiéndame libros de ingeniería eléctrica")
    assert r["intencion"] == "recomendar"
    assert "temática 'ingenieria electrica'" in r["respuesta"].lower() \
        or "temática" in r["respuesta"]
    assert "Circuitos Eléctricos" in r["respuesta"]


# ---------------- asistente: préstamos e identidad ----------------

def test_asistente_prestamos_requiere_identidad(db):
    _poblar(db)
    r = asistente.atender(db, "mis préstamos", user_id=None)
    assert r["intencion"] == "prestamos"
    assert "identidad" in r["respuesta"].lower() or "vinculación" in r["respuesta"].lower()


def test_asistente_prestamos_del_propio_usuario(db):
    _poblar(db)
    est = crear_usuario(db, rol="Estudiante", identificacion="3002")
    from database import Libro
    libro = db.query(Libro).first()
    db.add(Prestamos(
        user_id=est.id, book_id=str(libro.ID),
        loan_date=datetime.now(), delivery_date=datetime.now() + timedelta(days=3),
        state="Activo", prestamo_state="Aprobado"))
    db.commit()
    r = asistente.atender(db, "mis préstamos", user_id=est.id)
    assert libro.Titulo in r["respuesta"]
    # no aparece el contenido de préstamos de terceros (sólo recursos propios)
    assert "préstamos activos (sólo los tuyos)" in r["respuesta"]


# ---------------- asistente: institucional con guard ----------------

def test_asistente_institucional_usa_rag(monkeypatch, db):
    class R:
        respuesta = "1. Requisito serio [1]."
        fuentes = []
        error = None

        def fue_bloqueada(self):
            return False

    monkeypatch.setattr(asistente.rag_definitivo, "consultar", lambda *a, **k: R())
    r = asistente.atender(db, "¿cuáles son los requisitos de ingreso a pregrado?")
    assert r["motor"] == asistente.MOTOR_RAG
    assert "Requisito serio" in r["respuesta"]


def test_asistente_institucional_bloqueo_guarda(monkeypatch, db):
    class R:
        respuesta = ("La información solicitada no aparece en los documentos cargados. "
                     "(verificado determinísticamente: mejor fragmento 0.1758 > 0.1572)")
        fuentes = []
        error = None

        def fue_bloqueada(self):
            return True

    monkeypatch.setattr(asistente.rag_definitivo, "consultar", lambda *a, **k: R())
    r = asistente.atender(db, "¿cuál es el horario de la biblioteca?")
    assert r["motor"] == asistente.MOTOR_RAG
    assert "no aparece en los documentos" in r["respuesta"]


def test_asistente_institucional_fallback_iubot(monkeypatch, db):
    def rompe(*a, **k):
        raise RuntimeError("OWUI caído")

    monkeypatch.setattr(asistente.rag_definitivo, "consultar", rompe)
    r = asistente.atender(db, "¿cuál es el reglamento?")
    # fallback determinista del chatbot existente (no rompe)
    assert r["respuesta"]
    assert r["motor"] != asistente.MOTOR_RAG


# ---------------- seguridad: por autorización marcada ----------------

def test_endpoint_chat_sigue_contrato(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="9001")
    _poblar(db)
    t = token_de(client, admin)
    r = client.post("/api/ia/chat", json={"mensaje": "hola"}, headers=headers(t))
    assert r.status_code == 200
    body = r.json()
    assert "respuesta" in body and "motor" in body and "intencion" in body
    assert body["intencion"] == "saludo"


def test_endpoint_chat_sin_token(client, db):
    r = client.post("/api/ia/chat", json={"mensaje": "hola"})
    assert r.status_code in (401, 403)
