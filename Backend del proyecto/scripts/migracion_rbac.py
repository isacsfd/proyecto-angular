"""
migracion_rbac.py — Migración del esquema a RBAC (12 tablas)
=============================================================
Aplica en la base de datos actual (MySQL) la estructura RBAC:

  - Crea las tablas `rol`, `modulos`, `modulos_X_rol` y `configuracion`.
  - Renombra `usuarios` -> `usuario`.
  - Reemplaza la columna ENUM `rol` por `usuario.rol_id` (FK -> rol.id),
    preservando los roles existentes.
  - Siembra la matriz de permisos por módulo.
  - NO destruye datos: conserva usuarios, libros, préstamos, etc.

Idempotente: puede ejecutarse varias veces.
Uso:  python scripts/migracion_rbac.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text

from database import engine, Base, SessionLocal
from models.models import Rol, Modulo, ModuloRol
from database import Configuracion
from services.rbac import sembrar_rbac


def _existe_tabla(conn, nombre):
    fila = conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.tables "
        "WHERE table_schema = DATABASE() AND table_name = :n"
    ), {"n": nombre}).scalar()
    return int(fila) > 0


def _existe_columna(conn, tabla, columna):
    fila = conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.columns "
        "WHERE table_schema = DATABASE() AND table_name = :t AND column_name = :c"
    ), {"t": tabla, "c": columna}).scalar()
    return int(fila) > 0


def main():
    # 1) Crear las tablas nuevas (rol, modulos, modulos_X_rol, configuracion)
    Base.metadata.create_all(bind=engine, tables=[
        Rol.__table__, Modulo.__table__, ModuloRol.__table__, Configuracion.__table__,
    ])
    print("Tablas RBAC creadas/verificadas.")

    with engine.begin() as conn:
        # 2) Renombrar usuarios -> usuario (si aplica)
        if _existe_tabla(conn, "usuarios") and not _existe_tabla(conn, "usuario"):
            conn.execute(text("RENAME TABLE `usuarios` TO `usuario`"))
            print("Tabla `usuarios` renombrada a `usuario`.")
        else:
            print("Tabla `usuario` ya en su lugar (o no existía `usuarios`).")

        # 3) Añadir rol_id a `usuario` si no existe
        if _existe_tabla(conn, "usuario") and not _existe_columna(conn, "usuario", "rol_id"):
            conn.execute(text(
                "ALTER TABLE `usuario` ADD COLUMN rol_id INT NULL, "
                "ADD CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES rol(id)"
            ))
            print("Columna `rol_id` añadida a `usuario`.")

        # 4) Poblar `rol` con los roles existentes y rellenar rol_id
        if _existe_columna(conn, "usuario", "rol"):
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
            print("Roles poblados, `rol_id` rellenado y columna ENUM `rol` eliminada.")

    # 5) Sembrar la matriz de módulos por rol (idempotente)
    db = SessionLocal()
    try:
        sembrar_rbac(db)
        print("Matriz de módulos por rol sembrada.")
    finally:
        db.close()

    print("\nMigración RBAC completada. Ya puede iniciar el backend.")


if __name__ == "__main__":
    main()