"""
bootstrap_super_admin.py — Creación segura del Super Administrador
====================================================================
Uso (una sola vez, o repetible: es idempotente):

    SUPERADMIN_USERNAME=iaferrer \
    SUPERADMIN_PASSWORD='<secreto>' \
    SUPERADMIN_CC=1010086984 \
    SUPERADMIN_NAME='Isaacs Ferrer de las Salas' \
    python scripts/bootstrap_super_admin.py

Reglas:
  - La contraseña se lee SOLO de la variable de entorno en tiempo de ejecución.
    Nunca se escribe en archivos, SQL, logs ni documentación.
  - Se almacena exclusivamente como hash bcrypt en la columna `password`.
  - Comprueba idempotencia: si ya existe el username, la CC o cualquier
    super_administrador, NO crea duplicados.
  - Ejecuta la migración del ENUM de roles en MySQL (no destructiva).
"""

import os
import sys

# Permitir importar los módulos del backend desde este script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from passlib.context import CryptContext
from sqlalchemy import text

from database import engine, SessionLocal
from models.models import UserTable

SUPER_ADMIN = "super_administrador"


def _migrar_enum():
    """Amplía el ENUM de roles en MySQL (no destruye datos)."""
    try:
        with engine.begin() as conn:
            conn.execute(text(
                "ALTER TABLE usuarios MODIFY rol ENUM("
                "'super_administrador','Administrador','Funcionario','Docente','Estudiante') NOT NULL"
            ))
        print("Migración de roles: ENUM actualizado.")
    except Exception as e:  # SQLite u otro motor
        print("Migración de roles: no aplicable aquí (%s)." % type(e).__name__)


def main():
    username = os.getenv("SUPERADMIN_USERNAME", "").strip()
    password = os.getenv("SUPERADMIN_PASSWORD", "")
    cc = os.getenv("SUPERADMIN_CC", "").strip()
    nombre = os.getenv("SUPERADMIN_NAME", "").strip()

    faltan = [n for n, v in [
        ("SUPERADMIN_USERNAME", username),
        ("SUPERADMIN_PASSWORD", password),
        ("SUPERADMIN_CC", cc),
        ("SUPERADMIN_NAME", nombre),
    ] if not v]
    if faltan:
        print("Faltan variables de entorno: %s" % ", ".join(faltan))
        sys.exit(1)

    _migrar_enum()

    db = SessionLocal()
    try:
        pwd = CryptContext(schemes=["bcrypt"])

        # 1) Si YA existe un super administrador, no hacer nada (idempotente)
        super_existente = db.query(UserTable).filter(UserTable.rol == SUPER_ADMIN).first()
        if super_existente is not None:
            print(
                "Ya existe un super administrador (id=%s, username=%s). Nada que hacer."
                % (super_existente.id, super_existente.username)
            )
            return

        # 2) Buscar la cuenta por username o CC (evita duplicados)
        coincidencia = (
            db.query(UserTable)
            .filter((UserTable.username == username) | (UserTable.identificacion == cc))
            .first()
        )

        if coincidencia is not None:
            # Promover la cuenta existente al rol super_administrador y fijar
            # la contraseña inicial (bcrypt). No se crea un duplicado.
            coincidencia.rol = SUPER_ADMIN
            coincidencia.password = pwd.hash(password)
            if not coincidencia.nombre:
                coincidencia.nombre = nombre
            db.commit()
            db.refresh(coincidencia)
            print(
                "Cuenta existente promovida a super administrador (id=%s, username=%s)."
                % (coincidencia.id, coincidencia.username)
            )
            return

        # 3) No existía: crear la cuenta nueva
        nuevo = UserTable(
            nombre=nombre,
            username=username,
            email=username + "@unibarranquilla.edu.co",
            phone="",
            address="",
            rol=SUPER_ADMIN,
            password=pwd.hash(password),
            identificacion=cc,
            nivel_academico=None,
            carrera=None,
        )
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        print("Super administrador creado (id=%s, username=%s)." % (nuevo.id, nuevo.username))
        print("La contraseña se almacenó como hash bcrypt. Verifique con el hash en BD.")
    finally:
        db.close()


if __name__ == "__main__":
    main()