"""
migracion_parcial1_pg.py — Adecuación del esquema PostgreSQL al Parcial 1
==========================================================================
Aditivo y NO destructivo. Idempotente (se puede ejecutar varias veces).

Reglas aplicadas:
  - 8 tablas reciben `estado BOOLEAN NOT NULL DEFAULT true` (flag activo/inactivo).
  - 4 tablas (cuyo `estado`/`state`/`status` ya es un estado de NEGOCIO) reciben
    un flag independiente `activo BOOLEAN NOT NULL DEFAULT true`.
  - Las 12 tablas reciben/aseguran `created_at` y `updated_at` (TIMESTAMP, default now()).
  - `updated_at` se actualiza automáticamente mediante TRIGGER (única fuente al
    actualizar; no se usa onupdate en SQLAlchemy para evitar duplicidad).
  - UNIQUE en libros."Signatura" SOLO si no hay duplicados.
  - NO se agregan claves foráneas ni se eliminan/renombran columnas ni registros.

Uso:
    MM_DATABASE_URL=postgresql+psycopg2://... python scripts/migracion_parcial1_pg.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine

# Tablas cuyo `estado` es un flag activo/inactivo
TABLAS_ESTADO = [
    "usuario", "rol", "modulos", "modulos_X_rol",
    "libros", "contratistas", "proveer", "configuracion",
]

# Tablas cuyo `estado`/`state`/`status` YA representa un estado de negocio
TABLAS_ACTIVO = [
    "dispositivos", "prestamos", "prestamos_dispositivos", "library_access",
]

TODAS = TABLAS_ESTADO + TABLAS_ACTIVO


def _col_existe(conn, tabla, columna):
    return conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.columns "
        "WHERE table_schema='public' AND table_name=:t AND column_name=:c"
    ), {"t": tabla, "c": columna}).scalar() > 0


def _constraint_existe(conn, tabla, nombre):
    return conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.table_constraints "
        "WHERE table_schema='public' AND table_name=:t AND constraint_name=:n"
    ), {"t": tabla, "n": nombre}).scalar() > 0


def main():
    with engine.begin() as conn:
        print("== 1) Columnas de auditoría y flag ==")

        # Flag activo/inactivo
        for t in TABLAS_ESTADO:
            conn.execute(text(f'ALTER TABLE "{t}" ADD COLUMN IF NOT EXISTS estado BOOLEAN NOT NULL DEFAULT true'))
            print(f"  {t}: estado (default true)")
        for t in TABLAS_ACTIVO:
            conn.execute(text(f'ALTER TABLE "{t}" ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true'))
            print(f"  {t}: activo (default true)")

        # created_at / updated_at en TODAS las tablas
        for t in TODAS:
            conn.execute(text(f'ALTER TABLE "{t}" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT now()'))
            conn.execute(text(f'ALTER TABLE "{t}" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT now()'))
            # Asegurar el default de servidor aunque la columna ya existiera sin default
            conn.execute(text(f'ALTER TABLE "{t}" ALTER COLUMN created_at SET DEFAULT now()'))
            conn.execute(text(f'ALTER TABLE "{t}" ALTER COLUMN updated_at SET DEFAULT now()'))
        print("  created_at/updated_at asegurados en las 12 tablas (default now())")

        print("== 2) Trigger de updated_at ==")
        conn.execute(text("""
            CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
            BEGIN
                NEW.updated_at := now();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        """))
        for t in TODAS:
            conn.execute(text(f'DROP TRIGGER IF EXISTS trg_{t}_updated ON "{t}"'))
            conn.execute(text(
                f'CREATE TRIGGER trg_{t}_updated BEFORE UPDATE ON "{t}" '
                f'FOR EACH ROW EXECUTE FUNCTION set_updated_at()'
            ))
        print("  trigger trg_<tabla>_updated creado en las 12 tablas")

        print("== 3) UNIQUE libros.Signatura (solo si no hay duplicados) ==")
        dups = conn.execute(text(
            'SELECT COUNT(*) FROM (SELECT "Signatura" FROM libros GROUP BY "Signatura" HAVING COUNT(*) > 1) x'
        )).scalar()
        if dups > 0:
            print(f"  OMITIDO: existen {dups} valores de Signatura duplicados (no se agrega UNIQUE).")
        elif _constraint_existe(conn, "libros", "uq_libros_signatura"):
            print("  ya existe uq_libros_signatura.")
        else:
            conn.execute(text('ALTER TABLE libros ADD CONSTRAINT uq_libros_signatura UNIQUE ("Signatura")'))
            print("  uq_libros_signatura agregado.")

    print("\nMigración completada (idempotente). Sin cambios destructivos.")


if __name__ == "__main__":
    main()