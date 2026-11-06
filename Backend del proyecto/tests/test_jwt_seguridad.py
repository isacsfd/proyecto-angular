"""Seguridad JWT: secreto, firma, claims, vigencia e identidad vigente."""

import base64
import json
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from jose import jwt

import auth as authmod
from app import hash_password
from auth import (
    ALGORITHM,
    SECRET_KEY,
    _horas_token,
    _revocar_antes,
    crear_token,
    verificar_token,
)
from models.models import UserTable

from .conftest import crear_libro, crear_usuario, headers, login, token_de


class _Credenciales:
    def __init__(self, token):
        self.credentials = token


def _payload(user_id, rol="Estudiante", **extra):
    ahora = datetime.now(timezone.utc)
    data = {
        "id": user_id,
        "rol": rol,
        "iat": ahora,
        "exp": ahora + timedelta(hours=1),
        "nbf": ahora,
    }
    data.update(extra)
    return data


def _b64(obj) -> str:
    return base64.urlsafe_b64encode(
        json.dumps(obj, separators=(",", ":"), default=lambda o: int(o.timestamp())).encode()
    ).rstrip(b"=").decode()


def _token_sin_firma(payload) -> str:
    return f"{_b64({'alg': 'none', 'typ': 'JWT'})}.{_b64(payload)}."


def _verificar(token, db):
    return verificar_token(_Credenciales(token), db)


def _assert_401(token, db):
    with pytest.raises(HTTPException) as exc:
        _verificar(token, db)
    assert exc.value.status_code == 401


# ─── Configuración ─────────────────────────────────────────────────────────
def test_horas_token_valida_rango():
    assert _horas_token({}) == 8
    assert _horas_token({"MM_TOKEN_HORAS": "2"}) == 2
    for valor in ("0", "25", "abc"):
        with pytest.raises(RuntimeError):
            _horas_token({"MM_TOKEN_HORAS": valor})


def test_revocar_antes_acepta_iso_y_unix():
    assert _revocar_antes({}) is None
    assert _revocar_antes({"MM_JWT_REVOCAR_ANTES": "1700000000"}) == 1700000000
    assert _revocar_antes({"MM_JWT_REVOCAR_ANTES": "2026-10-23T00:00:00Z"}) > 0
    with pytest.raises(RuntimeError):
        _revocar_antes({"MM_JWT_REVOCAR_ANTES": "no-es-fecha"})


# ─── Emisión y validación ──────────────────────────────────────────────────
def test_token_incluye_claims_de_seguridad():
    token = crear_token({"id": 7, "rol": "Estudiante"})
    claims = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert claims["sub"] == "7"
    assert claims["jti"]
    assert "nbf" in claims and "iat" in claims and "exp" in claims
    assert jwt.get_unverified_header(token)["alg"] == "HS256"


def test_token_antiguo_sin_nbf_sub_jti_sigue_siendo_valido(db):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001")
    antiguo = jwt.encode(
        {
            "id": u.id,
            "rol": "Estudiante",
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    assert _verificar(antiguo, db)["id"] == u.id


def test_rechaza_token_malformado(db):
    _assert_401("no-es-un-jwt", db)


def test_rechaza_token_expirado(db):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001")
    token = crear_token({"id": u.id, "rol": "Estudiante"}, timedelta(hours=-1))
    _assert_401(token, db)


def test_rechaza_firma_invalida(db):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001")
    token = jwt.encode(_payload(u.id), "otro-secreto-suficientemente-largo-2026", algorithm="HS256")
    _assert_401(token, db)


def test_rechaza_algoritmo_no_permitido(db):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001")
    token = jwt.encode(_payload(u.id), SECRET_KEY, algorithm="HS384")
    _assert_401(token, db)


def test_rechaza_token_sin_firma(db):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001")
    _assert_401(_token_sin_firma(_payload(u.id)), db)


def test_rechaza_token_sin_exp(db):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001")
    payload = _payload(u.id)
    payload.pop("exp")
    _assert_401(jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM), db)


def test_rechaza_token_sin_iat(db):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001")
    payload = _payload(u.id)
    payload.pop("iat")
    _assert_401(jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM), db)


def test_rechaza_iat_futuro(db):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001")
    futuro = datetime.now(timezone.utc) + timedelta(hours=2)
    payload = _payload(u.id, iat=futuro, exp=futuro + timedelta(hours=1))
    _assert_401(jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM), db)


def test_rechaza_id_con_tipo_incorrecto(db):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001")
    payload = _payload(str(u.id))
    _assert_401(jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM), db)


def test_rechaza_sub_incoherente(db):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001")
    payload = _payload(u.id, sub=str(u.id + 1))
    _assert_401(jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM), db)


def test_rechaza_token_desmesurado(db):
    _assert_401("a" * 9000, db)


def test_rol_y_sede_se_toman_de_la_bd(db, client):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001", sede="Soledad")
    token = token_de(client, u)
    crear_libro(db, titulo="Solo Soledad", sede="Soledad")
    crear_libro(db, titulo="Solo Barranquilla", sede="Barranquilla")

    u.sede = "Barranquilla"
    db.commit()

    r = client.get("/libros/", headers=headers(token))
    assert r.status_code == 200
    assert {l["sede"] for l in r.json()} == {"Barranquilla"}


def test_revocacion_global_por_corte(db, monkeypatch):
    u = crear_usuario(db, rol="Estudiante", identificacion="1001")
    token = crear_token({"id": u.id, "rol": "Estudiante"})
    corte = int(datetime.now(timezone.utc).timestamp()) + 60
    monkeypatch.setattr(authmod, "REVOCAR_ANTES", corte)
    _assert_401(token, db)


def test_login_rechaza_usuario_sin_rol(client, db):
    usuario = UserTable(
        nombre="Sin Rol",
        identificacion="7001",
        password=hash_password("Clave1234!"),
        rol_id=99999,
        phone="3000000000",
        address="Calle 1",
        username="sinrol",
        email="sinrol@iub.edu.co",
        sede="Soledad",
    )
    db.add(usuario)
    db.commit()
    assert login(client, "7001", "Clave1234!").status_code == 401
