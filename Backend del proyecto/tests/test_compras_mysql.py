"""Pruebas del módulo Proveedores/Compras/Detalles en FastAPI (MySQL XAMPP).

Usa una conexión independiente a la base `biblioteca_iub_compras_test`
(solo pruebas). No toca la base principal de FastAPI (SQLite en los tests) ni
las bases reales de MySQL ni Neon.
"""

import os
from urllib.parse import quote_plus

import pytest
import sqlalchemy as sa
from sqlalchemy import create_engine, text

# Usar una base MySQL de pruebas antes de que el motor perezoso se cree.
os.environ.setdefault("MM_MYSQL_DATABASE", "biblioteca_iub_compras_test")

from routers.compras_router import _config_mysql, _map_error  # noqa: E402

from .conftest import crear_usuario, headers, token_de  # noqa: E402

DDL = [
    "CREATE TABLE IF NOT EXISTS `proveedores` ("
    "`id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, "
    "`razon_social` VARCHAR(150) NOT NULL, `nit` VARCHAR(50) NOT NULL, "
    "`email` VARCHAR(120) NULL, `telefono` VARCHAR(30) NULL, `direccion` VARCHAR(255) NULL, "
    "`estado` TINYINT(1) NOT NULL DEFAULT 1, "
    "`creado` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "
    "`actualizado` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, "
    "CONSTRAINT `uq_proveedores_nit` UNIQUE (`nit`)) ENGINE=InnoDB",
    "CREATE TABLE IF NOT EXISTS `compras` ("
    "`id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `proveedor_id` INT UNSIGNED NOT NULL, "
    "`numero_factura` VARCHAR(50) NOT NULL, `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "
    "`total` DECIMAL(12,2) NOT NULL DEFAULT 0, `estado` TINYINT(1) NOT NULL DEFAULT 1, "
    "`creado` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "
    "`actualizado` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, "
    "CONSTRAINT `uq_compras_numero_factura` UNIQUE (`numero_factura`), "
    "CONSTRAINT `fk_compras_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE RESTRICT) ENGINE=InnoDB",
    "CREATE TABLE IF NOT EXISTS `detalle_compra` ("
    "`id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `compra_id` INT UNSIGNED NOT NULL, "
    "`descripcion` VARCHAR(200) NOT NULL, `cantidad` INT UNSIGNED NOT NULL DEFAULT 1, "
    "`precio_unitario` DECIMAL(12,2) NOT NULL DEFAULT 0, `estado` TINYINT(1) NOT NULL DEFAULT 1, "
    "`creado` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "
    "`actualizado` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, "
    "CONSTRAINT `fk_detalle_compra` FOREIGN KEY (`compra_id`) REFERENCES `compras` (`id`) ON DELETE CASCADE) ENGINE=InnoDB",
]


def _url(cfg, con_db: bool) -> str:
    base = f"mysql+pymysql://{quote_plus(cfg['user'])}:{quote_plus(cfg['password'])}@{cfg['host']}:{cfg['port']}"
    return base + (f"/{cfg['database']}?charset=utf8mb4" if con_db else "/")


@pytest.fixture(scope="module", autouse=True)
def mysql_lista():
    cfg = _config_mysql()
    admin = create_engine(_url(cfg, False))
    try:
        admin.connect().close()
    except Exception as e:  # noqa: BLE001
        pytest.skip(f"MySQL local no disponible para pruebas: {e}")
        return
    with admin.begin() as c:
        c.execute(text(f"CREATE DATABASE IF NOT EXISTS `{cfg['database']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
    db = create_engine(_url(cfg, True))
    with db.begin() as c:
        for ddl in DDL:
            c.execute(text(ddl))
    yield
    db.dispose()
    admin.dispose()


@pytest.fixture(autouse=True)
def limpiar_mysql():
    cfg = _config_mysql()
    db = create_engine(_url(cfg, True))
    with db.begin() as c:
        c.execute(text("DELETE FROM detalle_compra"))
        c.execute(text("DELETE FROM compras"))
        c.execute(text("DELETE FROM proveedores"))
    yield
    db.dispose()


def _tokens(client, db):
    """Devuelve tokens para cada rol (usuarios creados en la BD SQLite de pruebas)."""
    roles = ["super_administrador", "Administrador", "Funcionario", "Estudiante"]
    out = {}
    for i, rol in enumerate(roles):
        u = crear_usuario(db, rol=rol, identificacion=str(1000 + i))
        out[rol] = token_de(client, u)
    return out


def _proveedor_valido():
    return {"razon_social": "Alfa Editorial", "nit": "900123456", "email": "a@test.com"}


def test_requiere_autenticacion_y_roles(client, db):
    t = _tokens(client, db)
    assert client.get("/api/proveedores").status_code == 401
    assert client.get("/api/proveedores", headers=headers(t["Estudiante"])).status_code == 403
    assert client.get("/api/proveedores", headers=headers(t["Funcionario"])).status_code == 403
    assert client.get("/api/proveedores", headers=headers(t["Administrador"])).status_code == 200
    assert client.get("/api/proveedores", headers=headers(t["super_administrador"])).status_code == 200


def test_crud_proveedores(client, db):
    t = _tokens(client, db)["super_administrador"]
    h = headers(t)

    created = client.post("/api/proveedores", json=_proveedor_valido(), headers=h)
    assert created.status_code == 201
    pid = created.json()["id"]

    dup = client.post("/api/proveedores", json=_proveedor_valido(), headers=h)
    assert dup.status_code == 409

    invalido = client.post("/api/proveedores", json={"nit": "X"}, headers=h)
    assert invalido.status_code == 400

    item = client.get(f"/api/proveedores/{pid}", headers=h)
    assert item.status_code == 200 and item.json()["nit"] == "900123456"

    update = client.put(f"/api/proveedores/{pid}", json={"telefono": "3001234567"}, headers=h)
    assert update.status_code == 200 and update.json()["telefono"] == "3001234567"

    assert client.get("/api/proveedores", headers=h).status_code == 200
    assert client.delete(f"/api/proveedores/{pid}", headers=h).status_code == 200
    assert client.get(f"/api/proveedores/{pid}", headers=h).status_code == 404


def test_crud_compras_y_detalles(client, db):
    t = _tokens(client, db)["super_administrador"]
    h = headers(t)
    prov = client.post("/api/proveedores", json=_proveedor_valido(), headers=h).json()
    prov2 = client.post(
        "/api/proveedores", json={"razon_social": "Beta", "nit": "900123457"}, headers=h
    ).json()

    compra = client.post(
        "/api/compras", json={"proveedor_id": prov["id"], "numero_factura": "FAC-001", "total": 0}, headers=h
    )
    assert compra.status_code == 201
    cid = compra.json()["id"]

    bad = client.post("/api/compras", json={"proveedor_id": 999999, "numero_factura": "F-2"}, headers=h)
    assert bad.status_code == 400
    assert client.post("/api/compras", json={"proveedor_id": prov["id"], "numero_factura": "FAC-001"}, headers=h).status_code == 409

    det = client.post(
        f"/api/compras/{cid}/detalles",
        json={"descripcion": "Libros", "cantidad": 3, "precio_unitario": 1000},
        headers=h,
    )
    assert det.status_code == 201
    did = det.json()["id"]

    assert client.post(f"/api/compras/{cid}/detalles", json={"descripcion": "x", "cantidad": 0}, headers=h).status_code == 400
    assert client.post("/api/compras/999999/detalles", json={"descripcion": "x"}, headers=h).status_code == 400
    assert len(client.get(f"/api/compras/{cid}/detalles", headers=h).json()) == 1

    upd = client.put(f"/api/detalles/{did}", json={"cantidad": 10}, headers=h)
    assert upd.status_code == 200 and upd.json()["cantidad"] == 10
    assert client.delete(f"/api/detalles/{did}", headers=h).status_code == 200
    assert client.get(f"/api/detalles/{did}", headers=h).status_code == 404

    pago = client.post(
        "/api/compras", json={"proveedor_id": prov2["id"], "numero_factura": "FAC-002", "total": 250000}, headers=h
    ).json()
    assert client.put(f"/api/compras/{pago['id']}", json={"total": 999}, headers=h).json()["total"] == 999
    assert client.delete(f"/api/compras/{cid}", headers=h).status_code == 200
    assert client.get(f"/api/compras/{cid}", headers=h).status_code == 404


def test_mapa_errores_conexion_y_duplicados():
    op = sa.exc.OperationalError("stmt", {}, Exception("(2003, 'Can't connect to MySQL')"))
    assert _map_error(op).status_code == 503
    dup = sa.exc.IntegrityError("stmt", {}, Exception("(1062, \"Duplicate entry 'x' for key 'y'\")"))
    assert _map_error(dup).status_code == 409