"""Pruebas Fase IA 5.5 (P0): integridad de búsqueda por título y disponibilidad.

8 casos obligatorios + verificaciones de etiquetado de sugerencias.
Todos contra BD de prueba (SQLite) con títulos sembrados.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.ia import asistente, disponibilidad
from .conftest import crear_libro


def _poblar(db):
    crear_libro(db, titulo="Administración de Empresas", autor="Peter Drucker",
                programa="Administración de Negocios Internacionales", ejemplares=2)
    crear_libro(db, titulo="Gestión de municipios turísticos", autor="Wallingre, Noemí",
                programa="Básicas y transversales", ejemplares=2)
    crear_libro(db, titulo="Circuitos Eléctricos", autor="Sadiku",
                programa="Ingeniería Eléctrica", ejemplares=3)


def test_p055_1_titulo_exacto(db):
    _poblar(db)
    r = asistente.atender(db, "¿disponibilidad de Contrato Gestión de municipios turísticos?")
    r2 = asistente.atender(db, "¿disponibilidad de gestión de municipios turísticos?")
    assert "coincidencia exacta" in r2["respuesta"]
    assert "Gestión de municipios turísticos" in r2["respuesta"]
    assert "2 ejemplar(es) disponibles" in r2["respuesta"]


def test_p055_2_titulo_excacto_por_orm(db):
    # disponibilidad de <título exacto sin acentos y en minúsculas> debe coincidir
    _poblar(db)
    r = asistente.atender(db, "¿disponibilidad de administracion de empresas?")
    assert "coincidencia exacta" in r["respuesta"]


def test_p055_3_titulo_parzial(db):
    _poblar(db)
    r = asistente.atender(db, "¿disponibilidad de gestión de municipios?")
    assert "coincidencia parcial" in r["respuesta"]
    assert "Gestión de municipios turísticos" in r["respuesta"]


def test_p055_4_titulo_inexistente(db):
    _poblar(db)
    r = asistente.atender(db, "¿disponibilidad de El Código Perdido de la Biblioteca Babel?")
    assert "No se encontró el título" in r["respuesta"]
    # ningún título real del catálogo debe figurar como si fuera el pedido
    assert "ejemplar(es) disponibles" not in r["respuesta"]


def test_p055_5_diferencias_pequenas(db):
    _poblar(db)
    # comillas explícitas señalan que busca un título específico
    r = asistente.atender(db, "¿disponibilidad de «Circuitos Eléctricos»?")
    assert "coincidencia exacta" in r["respuesta"]


def test_p055_6_error_tipografico_etiqueta_sugerencia(db):
    _poblar(db)
    r = asistente.atender(db, "¿disponibilidad de gestion de muinipios turísticos?")  # 'muinipios'
    # el título pedido NO se confirma; las alternativas se etiquetan como sugerencias
    assert "No se encontró el título" in r["respuesta"]
    assert "SUGERENCIAS" in r["respuesta"]
    assert "coincidencia exacta" not in r["respuesta"]
    assert "ejemplar(es) disponibles" not in r["respuesta"]


def test_p055_7_referencia_tematica_sin_titulo(db):
    _poblar(db)
    r = asistente.atender(db, "¿tienes libros de administración?")  # "libros de" = tema
    assert "coincidencia exacta" not in r["respuesta"]
    assert "No se encontró el título" not in r["respuesta"]
    assert "APROXIMADAS" in r["respuesta"]  # etiqueta semántica
    assert "Administración de Empresas" in r["respuesta"]


def test_p055_8_disponibilidad_existente_y_catalogo_unificados(db):
    _poblar(db)
    r1 = asistente.atender(db, "¿disponibilidad de Circuitos Eléctricos?")
    r2 = asistente.atender(db, "¿tienes el libro Circuitos Eléctricos?")
    assert "3 ejemplar(es) disponibles" in r1["respuesta"]
    assert "coincidencia exacta" in r2["respuesta"]


def test_p055_determinar_niveles(db):
    _poblar(db)
    m = disponibilidad.determinar_modo(db, "administracion de empresas")
    assert m["modo"] == "exacto"
    m2 = disponibilidad.determinar_modo(db, "nosequeexiste de verdad abcfgh")
    assert m2["modo"] == "no_encontrado"


def test_p055_9_busca_libros_inexistent(db):
    _poblar(db)
    r = asistente.atender(db, "busca libros El Código Perdido de la Biblioteca Babel")
    assert "No se encontró el título" in r["respuesta"]
    assert "ejemplar(es) disponibles" not in r["respuesta"]


def test_p055_10_tematica_pliteca_sigue_semantica(db):
    _poblar(db)
    r = asistente.atender(db, "busca libros de administración")
    assert "No se encontró el título" not in r["respuesta"]
