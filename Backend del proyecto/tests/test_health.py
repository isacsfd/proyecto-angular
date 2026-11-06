"""Pruebas de los endpoints de salud (/health y /health/db)."""


def test_health_responde_sin_autenticacion(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "service": "biblioteca-iub-api"}


def test_health_db_ejecuta_select_1(client):
    r = client.get("/health/db")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "database": "ok"}


def test_health_db_devuelve_503_si_la_bd_falla(client, monkeypatch):
    import app as app_module

    class _EngineCaido:
        def connect(self):
            raise RuntimeError("fallo simulado con datos internos")

    monkeypatch.setattr(app_module, "engine", _EngineCaido())
    r = client.get("/health/db")
    assert r.status_code == 503
    assert r.json() == {"detail": "Base de datos no disponible"}


def test_health_no_expone_configuracion_sensible(client):
    for ruta in ("/health", "/health/db"):
        texto = client.get(ruta).text.lower()
        for prohibido in ("password", "secret", "token", "postgresql://", "neon"):
            assert prohibido not in texto
