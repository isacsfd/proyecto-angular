"""Pruebas de la configuración del motor/pool y del cierre de sesiones.

No requieren credenciales ni conexión a Neon: usan el motor de SQLite que
conftest configura para el resto de la suite.
"""

import pytest
from sqlalchemy import text
from sqlalchemy.pool import QueuePool

from app import get_db
from database import ENGINE_OPTIONS, engine


def test_opciones_de_pool_requeridas():
    """Las opciones mínimas para Render+Neon están presentes y son válidas."""
    assert ENGINE_OPTIONS["pool_pre_ping"] is True
    assert ENGINE_OPTIONS["pool_recycle"] >= 60
    assert ENGINE_OPTIONS["pool_size"] >= 1
    assert ENGINE_OPTIONS["max_overflow"] >= 0
    assert ENGINE_OPTIONS["pool_timeout"] >= 1


def test_el_engine_aplica_las_opciones_al_pool():
    """El pool del motor efectivamente refleja la configuración pedida."""
    pool = engine.pool
    assert isinstance(pool, QueuePool)
    assert pool._pre_ping is True
    assert pool._recycle == ENGINE_OPTIONS["pool_recycle"]
    assert pool._max_overflow == ENGINE_OPTIONS["max_overflow"]
    assert pool._timeout == ENGINE_OPTIONS["pool_timeout"]


def test_sesion_se_cierra_aunque_la_consulta_falle():
    """Una consulta con error no deja la sesión inutilizable ni transacciones colgadas."""
    gen = get_db()
    db = next(gen)
    try:
        with pytest.raises(Exception):
            db.execute(text("SELECT * FROM tabla_que_no_existe"))
    finally:
        gen.close()

    # Una sesión nueva sigue funcionando y se cierra correctamente.
    gen2 = get_db()
    db2 = next(gen2)
    try:
        assert db2.execute(text("SELECT 1")).scalar() == 1
    finally:
        gen2.close()


def test_varias_sesiones_se_cierran_correctamente():
    """Reusar las sesiones en bucle no acumula conexiones ni transacciones."""
    for _ in range(5):
        gen = get_db()
        db = next(gen)
        try:
            assert db.execute(text("SELECT 1")).scalar() == 1
        finally:
            gen.close()


def test_engine_sigue_funcionando_despues_de_error():
    """El motor continuúa operativo después de que una sesión falle y se cierre."""
    gen = get_db()
    db = next(gen)
    try:
        with pytest.raises(Exception):
            db.execute(text("STATEMENT CON SQL INVÁLIDO"))
    finally:
        gen.close()
    assert engine.connect().execute(text("SELECT 1")).scalar() == 1