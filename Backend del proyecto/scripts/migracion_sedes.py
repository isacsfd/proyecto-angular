"""
migracion_sedes.py — Agrega la columna `sede` a usuarios y libros.
===================================================================
Estrategia segura:
  - Solo agrega columnas si no existen (idempotente).
  - Los registros existentes reciben la sede principal 'Soledad' como
    valor por defecto (no quedan NULL). Puede reasignarse después por
    administración sin destruir datos.
  - No elimina ni modifica ninguna columna existente.

Ejecutar desde la raíz del backend:
    python scripts/migracion_sedes.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text

from database import engine

SEDE_DEFAULT = "Soledad"


def _tiene_columna(conn, tabla, columna):
    r = conn.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla AND COLUMN_NAME = :col"
        ),
        {"tabla": tabla, "col": columna},
    )
    return r.scalar() > 0


def main():
    with engine.begin() as conn:
        for tabla in ("usuarios", "libros"):
            if _tiene_columna(conn, tabla, "sede"):
                print(f"{tabla}.sede ya existe. Sin cambios.")
                continue
            conn.execute(
                text(
                    f"ALTER TABLE {tabla} "
                    f"ADD COLUMN sede VARCHAR(20) NOT NULL DEFAULT '{SEDE_DEFAULT}'"
                )
            )
            print(f"{tabla}.sede creada con default '{SEDE_DEFAULT}'.")
    print("Migración de sedes completada.")


if __name__ == "__main__":
    main()