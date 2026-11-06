"""
migracion_rbac.py — Migración segura del esquema y la matriz RBAC
=================================================================
Modo por defecto: PREVISUALIZACIÓN (no escribe nada).

Uso:
  python scripts/migracion_rbac.py            # muestra el impacto sin aplicar
  python scripts/migracion_rbac.py --aplicar  # aplica los cambios

Qué hace al aplicar:
  - Crea las tablas `rol`, `modulos`, `modulos_X_rol` y `configuracion`.
  - Renombra `usuarios` -> `usuario` (solo MySQL y si aplica).
  - Añade `usuario.rol_id` y migra la columna ENUM `rol` (solo MySQL).
  - Sincroniza la matriz RBAC de forma autoritativa SOLO sobre roles
    canónicos. Los roles personalizados y sus enlaces NO se eliminan; se
    reportan para conciliación manual.

Reversión:
  - Restaurar la matriz anterior en `services/rbac.py` y volver a ejecutar
    con `--aplicar`. La sincronización vuelve a otorgar/revocar únicamente
    enlaces de roles canónicos.
  - Los roles personalizados no se modifican, por lo que no requieren
    restauración.
  - Conservar un respaldo de la base antes de aplicar.

Este script no se ejecuta automáticamente y no debe apuntarse a producción
sin autorización explícita y respaldo previo.
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect, text

from database import engine, Base, SessionLocal
from models.models import Rol, Modulo, ModuloRol
from database import Configuracion
from services.rbac import planificar_rbac, sembrar_rbac

TABLAS_RBAC = ["rol", "modulos", "modulos_X_rol", "configuracion"]


def _estado_esquema() -> dict:
    """Inspección de solo lectura del esquema actual."""
    insp = inspect(engine)
    tablas = set(insp.get_table_names())
    columnas_usuario = (
        {c["name"] for c in insp.get_columns("usuario")} if "usuario" in tablas else set()
    )
    return {
        "motor": engine.dialect.name,
        "tablas": sorted(tablas),
        "tablas_rbac_faltantes": [t for t in TABLAS_RBAC if t not in tablas],
        "renombrar_usuarios": "usuarios" in tablas and "usuario" not in tablas,
        "agregar_rol_id": "usuario" in tablas and "rol_id" not in columnas_usuario,
        "migrar_columna_rol": "rol" in columnas_usuario,
    }


def _plan_rbac() -> dict:
    """Plan RBAC (solo lectura). Requiere las tres tablas RBAC."""
    db = SessionLocal()
    try:
        return planificar_rbac(db)
    finally:
        db.close()


def _aplicar_esquema(estado: dict) -> None:
    """Crea tablas y migra columnas. Solo MySQL para los pasos ALTER/RENAME."""
    pasos = estado["renombrar_usuarios"] or estado["agregar_rol_id"] or estado["migrar_columna_rol"]
    if pasos and estado["motor"] != "mysql":
        raise RuntimeError(
            "El esquema requiere pasos específicos de MySQL (RENAME/ALTER) y el "
            f"motor actual es '{estado['motor']}'. Ejecute la migración de esquema "
            "con el procedimiento institucional correspondiente."
        )

    Base.metadata.create_all(bind=engine, tables=[
        Rol.__table__, Modulo.__table__, ModuloRol.__table__, Configuracion.__table__,
    ])

    if not pasos:
        return

    with engine.begin() as conn:
        existe = lambda n: conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.tables "
            "WHERE table_schema = DATABASE() AND table_name = :n"
        ), {"n": n}).scalar() > 0
        columna = lambda t, c: conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.columns "
            "WHERE table_schema = DATABASE() AND table_name = :t AND column_name = :c"
        ), {"t": t, "c": c}).scalar() > 0

        if existe("usuarios") and not existe("usuario"):
            conn.execute(text("RENAME TABLE `usuarios` TO `usuario`"))

        if existe("usuario") and not columna("usuario", "rol_id"):
            conn.execute(text(
                "ALTER TABLE `usuario` ADD COLUMN rol_id INT NULL, "
                "ADD CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES rol(id)"
            ))

        if columna("usuario", "rol"):
            conn.execute(text(
                "INSERT IGNORE INTO rol (nombre, descripcion) "
                "SELECT DISTINCT rol, rol FROM `usuario` WHERE rol IS NOT NULL"
            ))
            conn.execute(text(
                "UPDATE `usuario` u JOIN rol r ON u.rol = r.nombre SET u.rol_id = r.id "
                "WHERE u.rol_id IS NULL"
            ))
            conn.execute(text("ALTER TABLE `usuario` DROP COLUMN rol"))
            conn.execute(text("ALTER TABLE `usuario` MODIFY rol_id INT NOT NULL"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Migración RBAC con previsualización")
    parser.add_argument(
        "--aplicar",
        action="store_true",
        help="Aplica los cambios. Sin esta bandera solo se muestra el plan.",
    )
    args = parser.parse_args()

    estado = _estado_esquema()
    resultado = {
        "modo": "aplicar" if args.aplicar else "previsualizacion",
        "esquema": estado,
    }

    tablas_rbac_listas = not estado["tablas_rbac_faltantes"]
    if tablas_rbac_listas:
        resultado["rbac"] = _plan_rbac()
    else:
        resultado["rbac"] = {
            "pendiente": "Faltan tablas RBAC; se crearán al aplicar.",
            "roles_personalizados": [],
        }

    if not args.aplicar:
        print(json.dumps(resultado, ensure_ascii=False, indent=2))
        return 0

    try:
        _aplicar_esquema(estado)
        db = SessionLocal()
        try:
            sembrar_rbac(db, aplicar=True)
            resultado["validacion"] = planificar_rbac(db)
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    pendientes = (
        resultado["validacion"]["enlaces_agregar"]
        or resultado["validacion"]["enlaces_quitar"]
        or resultado["validacion"]["roles_faltantes"]
        or resultado["validacion"]["modulos_faltantes"]
    )
    resultado["aplicado"] = True
    resultado["validado"] = not pendientes
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
