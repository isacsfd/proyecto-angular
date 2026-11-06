"""Pruebas de la búsqueda del chatbot en los manuales institucionales."""

import pytest

from services.ia import chatbot, manuales


@pytest.fixture
def manuales_tmp(tmp_path, monkeypatch):
    (tmp_path / "manual_practicas.txt").write_text(
        "El manual de practicas exige carta de presentacion, hoja de vida y "
        "afiliacion a riesgos laborales antes de iniciar.",
        encoding="utf-8",
    )
    (tmp_path / "acuerdo_29_2021.txt").write_text(
        "El acuerdo 29 de 2021 regula la extension universitaria y los convenios "
        "con empresas para practicas formativas.",
        encoding="utf-8",
    )
    monkeypatch.setenv("MM_MANUALES_DIR", str(tmp_path))
    manuales.reiniciar_cache()
    yield tmp_path
    manuales.reiniciar_cache()


def test_buscar_devuelve_fragmentos_con_fuente(manuales_tmp):
    hits = manuales.buscar("requisitos de practicas", top_k=2, min_score=0.05)
    assert hits, "Debe recuperar fragmentos de los manuales"
    assert hits[0]["fuente"] in ("manual_practicas.txt", "acuerdo_29_2021.txt")
    assert hits[0]["pagina"] >= 1
    assert hits[0]["score"] > 0


def test_estado_cuenta_archivos_y_fragmentos(manuales_tmp):
    est = manuales.estado()
    assert est["archivos"] == 2
    assert est["fragmentos"] >= 2


def test_chatbot_responde_con_manuales(manuales_tmp, db):
    r = chatbot.responder(db, "¿Qué dice el manual de prácticas?")
    assert r["respuesta"]
    assert r["fuentes"], "La respuesta debe citar fuentes de manuales"
    assert "manual" in r["respuesta"].lower()


def test_chatbot_sin_manuales_no_falla(tmp_path, monkeypatch, db):
    monkeypatch.setenv("MM_MANUALES_DIR", str(tmp_path))
    manuales.reiniciar_cache()
    assert manuales.buscar("cualquier cosa") == []
    r = chatbot.responder(db, "pregunta sin relación con los documentos zzz")
    assert r["respuesta"]
    assert r["fuentes"] == []