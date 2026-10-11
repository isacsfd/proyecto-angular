"""Proveedores, Compras y Detalles en FastAPI.

Usa una conexión independiente a la base MySQL de XAMPP
(`biblioteca_iub_compras`), sin tocar la base principal de FastAPI
(PostgreSQL/Neon). Autenticación JWT de FastAPI; solo super_administrador y
Administrador (403 para otros roles).

Conexión MySQL (variables de entorno, con defaults locales XAMPP):
  MM_MYSQL_HOST, MM_MYSQL_PORT, MM_MYSQL_USER, MM_MYSQL_PASSWORD,
  MM_MYSQL_DATABASE, MM_MYSQL_POOL (opcional)

El motor se crea de forma perezosa para que FastAPI arranque aunque MySQL esté
caído; en ese caso los endpoints responden 503.
"""

import os
import re
from datetime import datetime
from typing import Optional
from urllib.parse import quote_plus

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from auth import verificar_token

router = APIRouter(tags=["Proveedores y Compras (MySQL)"])

ROLES_PERMITIDOS = ("super_administrador", "Administrador")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

_engine_singleton: Optional[Engine] = None


# ─── Configuración y motor MySQL (independiente de la base principal) ─────────
def _config_mysql() -> dict:
    return {
        "host": os.getenv("MM_MYSQL_HOST", "127.0.0.1"),
        "port": int(os.getenv("MM_MYSQL_PORT", "3306")),
        "user": os.getenv("MM_MYSQL_USER", "root"),
        "password": os.getenv("MM_MYSQL_PASSWORD", ""),
        "database": os.getenv("MM_MYSQL_DATABASE", "biblioteca_iub_compras"),
        "pool": int(os.getenv("MM_MYSQL_POOL", "5")),
    }


def _engine() -> Engine:
    global _engine_singleton
    if _engine_singleton is None:
        cfg = _config_mysql()
        url = (
            f"mysql+pymysql://{quote_plus(cfg['user'])}:{quote_plus(cfg['password'])}"
            f"@{cfg['host']}:{cfg['port']}/{cfg['database']}?charset=utf8mb4"
        )
        _engine_singleton = create_engine(
            url,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=cfg["pool"],
            max_overflow=cfg["pool"],
            pool_timeout=30,
        )
    return _engine_singleton


# ─── Autorización ──────────────────────────────────────────────────────────────
def solo_super_o_administrador(token_data: dict = Depends(verificar_token)) -> dict:
    if token_data.get("rol") not in ROLES_PERMITIDOS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permisos insuficientes para gestionar proveedores y compras.",
        )
    return token_data


# ─── Ejecución SQL con mapeo de errores (parámetros siempre enlazados) ─────────
def _map_error(e: Exception) -> HTTPException:
    orig = getattr(e, "orig", None)
    msg = str(orig or e)
    if "1062" in msg:
        return HTTPException(status.HTTP_409_CONFLICT, detail="Registro duplicado: incumple una restricción única.")
    if "1452" in msg:
        return HTTPException(status.HTTP_400_BAD_REQUEST, detail="La referencia indicada no existe.")
    if isinstance(e, __import__("sqlalchemy").exc.OperationalError):
        return HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Base de datos de compras no disponible.")
    return HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno del servidor.")


def _leer(sql: str, params: Optional[dict] = None) -> list:
    try:
        with _engine().connect() as conn:
            cursor = conn.execute(text(sql), params or {})
            return [dict(r._mapping) for r in cursor]
    except Exception as e:  # noqa: BLE001
        raise _map_error(e) from e


def _escribir(sql: str, params: Optional[dict] = None) -> int:
    try:
        with _engine().begin() as conn:
            res = conn.execute(text(sql), params or {})
            return res.lastrowid or 0
    except Exception as e:  # noqa: BLE001
        raise _map_error(e) from e


# ─── Validaciones de entrada ───────────────────────────────────────────────────
def _texto(campo: str, valor, max_: int, obligatorio: bool = False) -> Optional[str]:
    if valor is None:
        if obligatorio:
            raise HTTPException(400, f"El campo {campo} es obligatorio.")
        return None
    texto = str(valor).strip()
    if obligatorio and texto == "":
        raise HTTPException(400, f"El campo {campo} es obligatorio.")
    if len(texto) > max_:
        raise HTTPException(400, f"El campo {campo} supera {max_} caracteres.")
    return texto or None


def _email(campo: str, valor) -> Optional[str]:
    if valor is None or str(valor).strip() == "":
        return None
    correo = str(valor).strip()
    if not EMAIL_RE.match(correo):
        raise HTTPException(400, f"El campo {campo} debe ser un email válido.")
    return correo


def _parse_id(valor) -> int:
    try:
        numero = int(valor)
    except (TypeError, ValueError):
        raise HTTPException(400, "Identificador inválido") from None
    if numero < 1:
        raise HTTPException(400, "Identificador inválido")
    return numero


def _numero_no_negativo(campo: str, valor, max_digitos: int = 10) -> Optional[float]:
    if valor is None or str(valor).strip() == "":
        return None
    try:
        numero = float(valor)
    except (TypeError, ValueError):
        raise HTTPException(400, f"El campo {campo} debe ser un número no negativo.") from None
    if numero < 0 or numero > float("9" * max_digitos):
        raise HTTPException(400, f"El campo {campo} debe ser un número no negativo.")
    return numero


def _booleano(campo: str, valor) -> Optional[int]:
    if valor is None:
        return None
    try:
        numero = int(valor)
    except (TypeError, ValueError):
        raise HTTPException(400, f"El campo {campo} debe ser 0 o 1.") from None
    if numero not in (0, 1):
        raise HTTPException(400, f"El campo {campo} debe ser 0 o 1.")
    return numero


def _fecha_hora(valor) -> Optional[str]:
    if valor is None or str(valor).strip() == "":
        return None
    try:
        dt = datetime.fromisoformat(str(valor).replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(400, "fecha inválida.") from None
    return dt.strftime("%Y-%m-%d %H:%M:%S")


SELECT_PROVEEDOR = (
    "SELECT id, razon_social, nit, email, telefono, direccion, estado, creado, actualizado "
    "FROM proveedores WHERE id = :id"
)
SELECT_COMPRA = (
    "SELECT c.id, c.proveedor_id, p.razon_social AS proveedor, c.numero_factura, "
    "c.fecha, c.total, c.estado, c.creado, c.actualizado "
    "FROM compras c JOIN proveedores p ON c.proveedor_id = p.id WHERE c.id = :id"
)
SELECT_DETALLE = (
    "SELECT id, compra_id, descripcion, cantidad, precio_unitario, estado, creado, actualizado "
    "FROM detalle_compra WHERE id = :id"
)


# ══════════════════════════════════════════════════════════════════════════════
# PROVEEDORES
# ══════════════════════════════════════════════════════════════════════════════
@router.get("/api/proveedores")
def listar_proveedores(_: dict = Depends(solo_super_o_administrador)):
    return _leer(
        "SELECT id, razon_social, nit, email, telefono, direccion, estado, creado, actualizado "
        "FROM proveedores WHERE estado = 1 ORDER BY id DESC"
    )


@router.get("/api/proveedores/{proveedor_id}")
def obtener_proveedor(proveedor_id: int, _: dict = Depends(solo_super_o_administrador)):
    filas = _leer(SELECT_PROVEEDOR + " AND estado = 1", {"id": proveedor_id})
    if not filas:
        raise HTTPException(404, "Proveedor no encontrado")
    return filas[0]


@router.post("/api/proveedores", status_code=status.HTTP_201_CREATED)
def crear_proveedor(body: dict, _: dict = Depends(solo_super_o_administrador)):
    razon_social = _texto("razon_social", body.get("razon_social"), 150, True)
    nit = _texto("nit", body.get("nit"), 50, True)
    email = _email("email", body.get("email"))
    telefono = _texto("telefono", body.get("telefono"), 30)
    direccion = _texto("direccion", body.get("direccion"), 255)
    nuevo_id = _escribir(
        "INSERT INTO proveedores (razon_social, nit, email, telefono, direccion) "
        "VALUES (:rs, :nit, :email, :tel, :dir)",
        {"rs": razon_social, "nit": nit, "email": email, "tel": telefono, "dir": direccion},
    )
    return _leer(SELECT_PROVEEDOR, {"id": nuevo_id})[0]


@router.put("/api/proveedores/{proveedor_id}")
def actualizar_proveedor(proveedor_id: int, body: dict, _: dict = Depends(solo_super_o_administrador)):
    if not _leer("SELECT id FROM proveedores WHERE id = :id AND estado = 1", {"id": proveedor_id}):
        raise HTTPException(404, "Proveedor no encontrado")
    campos = []
    valores = {"id": proveedor_id}
    if "razon_social" in body:
        campos.append("razon_social = :rs")
        valores["rs"] = _texto("razon_social", body.get("razon_social"), 150)
    if "nit" in body:
        campos.append("nit = :nit")
        valores["nit"] = _texto("nit", body.get("nit"), 50)
    if "email" in body:
        campos.append("email = :email")
        valores["email"] = _email("email", body.get("email"))
    if "telefono" in body:
        campos.append("telefono = :tel")
        valores["tel"] = _texto("telefono", body.get("telefono"), 30)
    if "direccion" in body:
        campos.append("direccion = :dir")
        valores["dir"] = _texto("direccion", body.get("direccion"), 255)
    if "estado" in body:
        campos.append("estado = :estado")
        valores["estado"] = _booleano("estado", body.get("estado"))
    if not campos:
        raise HTTPException(400, "No se enviaron campos para actualizar")
    _escribir(f"UPDATE proveedores SET {', '.join(campos)} WHERE id = :id", valores)
    return _leer(SELECT_PROVEEDOR, {"id": proveedor_id})[0]


@router.delete("/api/proveedores/{proveedor_id}")
def eliminar_proveedor(proveedor_id: int, _: dict = Depends(solo_super_o_administrador)):
    if not _leer("SELECT id FROM proveedores WHERE id = :id AND estado = 1", {"id": proveedor_id}):
        raise HTTPException(404, "Proveedor no encontrado")
    _escribir("UPDATE proveedores SET estado = 0 WHERE id = :id", {"id": proveedor_id})
    return {"mensaje": "Proveedor eliminado (borrado lógico)", "id": proveedor_id}


# ══════════════════════════════════════════════════════════════════════════════
# COMPRAS
# ══════════════════════════════════════════════════════════════════════════════
@router.get("/api/compras")
def listar_compras(_: dict = Depends(solo_super_o_administrador)):
    return _leer(
        "SELECT c.id, c.proveedor_id, p.razon_social AS proveedor, c.numero_factura, "
        "c.fecha, c.total, c.estado, c.creado, c.actualizado "
        "FROM compras c JOIN proveedores p ON c.proveedor_id = p.id "
        "WHERE c.estado = 1 ORDER BY c.id DESC"
    )


@router.get("/api/compras/{compra_id}")
def obtener_compra(compra_id: int, _: dict = Depends(solo_super_o_administrador)):
    filas = _leer(SELECT_COMPRA + " AND c.estado = 1", {"id": compra_id})
    if not filas:
        raise HTTPException(404, "Compra no encontrada")
    return filas[0]


@router.post("/api/compras", status_code=status.HTTP_201_CREATED)
def crear_compra(body: dict, _: dict = Depends(solo_super_o_administrador)):
    proveedor_id = _parse_id(body.get("proveedor_id"))
    numero_factura = _texto("numero_factura", body.get("numero_factura"), 50, True)
    fecha = _fecha_hora(body.get("fecha"))
    total = _numero_no_negativo("total", body.get("total"), 12) or 0
    if not _leer("SELECT id FROM proveedores WHERE id = :id AND estado = 1", {"id": proveedor_id}):
        raise HTTPException(400, "El proveedor indicado no existe o está inactivo.")
    if fecha:
        nuevo_id = _escribir(
            "INSERT INTO compras (proveedor_id, numero_factura, fecha, total) VALUES (:p, :n, :f, :t)",
            {"p": proveedor_id, "n": numero_factura, "f": fecha, "t": total},
        )
    else:
        nuevo_id = _escribir(
            "INSERT INTO compras (proveedor_id, numero_factura, total) VALUES (:p, :n, :t)",
            {"p": proveedor_id, "n": numero_factura, "t": total},
        )
    return _leer(SELECT_COMPRA, {"id": nuevo_id})[0]


@router.put("/api/compras/{compra_id}")
def actualizar_compra(compra_id: int, body: dict, _: dict = Depends(solo_super_o_administrador)):
    if not _leer("SELECT id FROM compras WHERE id = :id AND estado = 1", {"id": compra_id}):
        raise HTTPException(404, "Compra no encontrada")
    campos = []
    valores = {"id": compra_id}
    if "proveedor_id" in body:
        pid = _parse_id(body.get("proveedor_id"))
        if not _leer("SELECT id FROM proveedores WHERE id = :id AND estado = 1", {"id": pid}):
            raise HTTPException(400, "El proveedor indicado no existe o está inactivo.")
        campos.append("proveedor_id = :proveedor_id")
        valores["proveedor_id"] = pid
    if "numero_factura" in body:
        campos.append("numero_factura = :nf")
        valores["nf"] = _texto("numero_factura", body.get("numero_factura"), 50, True)
    if "fecha" in body:
        campos.append("fecha = :fecha")
        valores["fecha"] = _fecha_hora(body.get("fecha"))
    if "total" in body:
        campos.append("total = :total")
        valores["total"] = _numero_no_negativo("total", body.get("total"), 12)
    if "estado" in body:
        campos.append("estado = :estado")
        valores["estado"] = _booleano("estado", body.get("estado"))
    if not campos:
        raise HTTPException(400, "No se enviaron campos para actualizar")
    _escribir(f"UPDATE compras SET {', '.join(campos)} WHERE id = :id", valores)
    return _leer(SELECT_COMPRA, {"id": compra_id})[0]


@router.delete("/api/compras/{compra_id}")
def eliminar_compra(compra_id: int, _: dict = Depends(solo_super_o_administrador)):
    if not _leer("SELECT id FROM compras WHERE id = :id AND estado = 1", {"id": compra_id}):
        raise HTTPException(404, "Compra no encontrada")
    _escribir("UPDATE compras SET estado = 0 WHERE id = :id", {"id": compra_id})
    return {"mensaje": "Compra eliminada (borrado lógico)", "id": compra_id}


# ══════════════════════════════════════════════════════════════════════════════
# DETALLES
# ══════════════════════════════════════════════════════════════════════════════
def _compra_activa(compra_id: int) -> None:
    if not _leer("SELECT id FROM compras WHERE id = :id AND estado = 1", {"id": compra_id}):
        raise HTTPException(400, "La compra indicada no existe o está inactiva.")


@router.get("/api/compras/{compra_id}/detalles")
def listar_detalles(compra_id: int, _: dict = Depends(solo_super_o_administrador)):
    _compra_activa(compra_id)
    return _leer(
        "SELECT id, compra_id, descripcion, cantidad, precio_unitario, estado, creado, actualizado "
        "FROM detalle_compra WHERE compra_id = :id AND estado = 1 ORDER BY id",
        {"id": compra_id},
    )


@router.post("/api/compras/{compra_id}/detalles", status_code=status.HTTP_201_CREATED)
def crear_detalle(compra_id: int, body: dict, _: dict = Depends(solo_super_o_administrador)):
    _compra_activa(compra_id)
    descripcion = _texto("descripcion", body.get("descripcion"), 200, True)
    cantidad = _numero_no_negativo("cantidad", body.get("cantidad"), 6)
    precio_unitario = _numero_no_negativo("precio_unitario", body.get("precio_unitario"), 12)
    if cantidad is None:
        cantidad = 1
    if cantidad < 1:
        raise HTTPException(400, "cantidad debe ser mayor o igual a 1.")
    nuevo_id = _escribir(
        "INSERT INTO detalle_compra (compra_id, descripcion, cantidad, precio_unitario) "
        "VALUES (:compra_id, :desc, :cant, :precio)",
        {"compra_id": compra_id, "desc": descripcion, "cant": cantidad, "precio": precio_unitario or 0},
    )
    return _leer(SELECT_DETALLE, {"id": nuevo_id})[0]


@router.get("/api/detalles/{detalle_id}")
def obtener_detalle(detalle_id: int, _: dict = Depends(solo_super_o_administrador)):
    filas = _leer(SELECT_DETALLE + " AND estado = 1", {"id": detalle_id})
    if not filas:
        raise HTTPException(404, "Detalle no encontrado")
    return filas[0]


@router.put("/api/detalles/{detalle_id}")
def actualizar_detalle(detalle_id: int, body: dict, _: dict = Depends(solo_super_o_administrador)):
    if not _leer("SELECT id FROM detalle_compra WHERE id = :id AND estado = 1", {"id": detalle_id}):
        raise HTTPException(404, "Detalle no encontrado")
    campos = []
    valores = {"id": detalle_id}
    if "descripcion" in body:
        campos.append("descripcion = :desc")
        valores["desc"] = _texto("descripcion", body.get("descripcion"), 200, True)
    if "cantidad" in body:
        cantidad = _numero_no_negativo("cantidad", body.get("cantidad"), 6)
        if cantidad is not None and cantidad < 1:
            raise HTTPException(400, "cantidad debe ser mayor o igual a 1.")
        campos.append("cantidad = :cant")
        valores["cant"] = cantidad
    if "precio_unitario" in body:
        campos.append("precio_unitario = :precio")
        valores["precio"] = _numero_no_negativo("precio_unitario", body.get("precio_unitario"), 12)
    if "estado" in body:
        campos.append("estado = :estado")
        valores["estado"] = _booleano("estado", body.get("estado"))
    if not campos:
        raise HTTPException(400, "No se enviaron campos para actualizar")
    _escribir(f"UPDATE detalle_compra SET {', '.join(campos)} WHERE id = :id", valores)
    return _leer(SELECT_DETALLE, {"id": detalle_id})[0]


@router.delete("/api/detalles/{detalle_id}")
def eliminar_detalle(detalle_id: int, _: dict = Depends(solo_super_o_administrador)):
    if not _leer("SELECT id FROM detalle_compra WHERE id = :id AND estado = 1", {"id": detalle_id}):
        raise HTTPException(404, "Detalle no encontrado")
    _escribir("UPDATE detalle_compra SET estado = 0 WHERE id = :id", {"id": detalle_id})
    return {"mensaje": "Detalle eliminado (borrado lógico)", "id": detalle_id}