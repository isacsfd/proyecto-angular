"""
migrar_mysql_a_postgres.py â€” Copia los datos de MySQL a PostgreSQL
====================================================================
Origen  : MySQL  biblioteca_iub (1)   (ya migrada a RBAC)
Destino : PostgreSQL biblioteca_iub

- Copia libros, dispositivos, contratistas, proveer, prÃ©stamos y accesos.
- Usuarios: copia todos menos `iaferrer` (ya existe en PG); remapea rol por NOMBRE
  (los IDs de rol difieren entre motores) y remapea user_id (iaferrer 14 -> 1).
- Actualiza las secuencias para evitar colisiones en nuevos INSERT.
- Idempotente aproximado: si el destino ya tiene filas en libros/usuario, no duplica.

Uso:
    python scripts/migrar_mysql_a_postgres.py
Requiere MM_DATABASE_URL apuntando a PostgreSQL (ver README).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text

MYSQL_URL = "mysql+pymysql://root@localhost:3306/biblioteca_iub (1)"
PG_URL = os.getenv(
    "MM_DATABASE_URL",
    "postgresql+psycopg2://postgres:CambiarAqui@localhost:5432/biblioteca_iub",
)

mysql_engine = create_engine(MYSQL_URL, pool_pre_ping=True)
pg_engine = create_engine(PG_URL)


def mysql_cols(tabla):
    with mysql_engine.connect() as c:
        rows = c.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = DATABASE() AND table_name = :t"
        ), {"t": tabla}).fetchall()
        return [r[0] for r in rows]


def pg_cols(tabla):
    with pg_engine.connect() as c:
        rows = c.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :t"
        ), {"t": tabla}).fetchall()
        return [r[0] for r in rows]


def leer_mysql(tabla, cols):
    sel = ", ".join("`%s`" % c for c in cols)
    with mysql_engine.connect() as c:
        return [dict(r._mapping) for r in c.execute(text("SELECT %s FROM `%s`" % (sel, tabla)))]


def contar_pg(tabla):
    with pg_engine.connect() as c:
        return c.execute(text('SELECT COUNT(*) FROM "%s"' % tabla)).scalar()


def insertar_pg(tabla, filas):
    if not filas:
        print("  (%s: 0 filas)" % tabla)
        return
    cols = list(filas[0].keys())
    quoted = ", ".join('"%s"' % c for c in cols)
    placeholders = ", ".join(":%s" % c for c in cols)
    stmt = text('INSERT INTO "%s" (%s) VALUES (%s)' % (tabla, quoted, placeholders))
    with pg_engine.begin() as conn:
        conn.execute(stmt, filas)
    print("  (%s: %d filas)" % (tabla, len(filas)))


def sanitizar_libros(filas):
    """MySQL permite NULL en algunas columnas que el modelo PG define NOT NULL."""
    for f in filas:
        for col, default in [("Item", 0), ("Areas", 0), ("Ejemplar", 0),
                             ("Editorial", ""), ("Idioma", ""), ("Programa", ""), ("AÃ±o", 0)]:
            if f.get(col) is None:
                f[col] = default
    return filas


def fix_sequence(tabla, columna="id"):
    try:
        with pg_engine.begin() as conn:
            seq = conn.execute(text(
                "SELECT pg_get_serial_sequence('public.%s', :col)" % tabla
            ), {"col": columna}).scalar()
            if seq:
                conn.execute(text(
                    "SELECT setval(:seq, COALESCE((SELECT MAX(\"%s\") FROM \"%s\"), 1), true)"
                    % (columna, tabla)
                ), {"seq": seq})
                print("  secuencia %s ok" % tabla)
            else:
                print("  (sin secuencia serial en %s)" % tabla)
    except Exception as e:
        print("  (secuencia %s: %s)" % (tabla, type(e).__name__))


def main():
    print("== Origen (MySQL) -> Destino (PostgreSQL) ==")

    # 0) Mapas de roles por NOMBRE
    with mysql_engine.connect() as c:
        mysql_roles = {r[0]: r[1] for r in c.execute(text("SELECT id, nombre FROM rol"))}
    with pg_engine.connect() as c:
        pg_roles = {r[1]: r[0] for r in c.execute(text('SELECT id, nombre FROM "rol"'))}
    print("Roles MySQL:", mysql_roles)
    print("Roles PG   :", pg_roles)

    # 1) Usuarios (rol por nombre, omitir iaferrer ya existente, remapear 14->1)
    cols_user = [c for c in mysql_cols("usuario") if c != "id"] or ["id"]
    filas_user = leer_mysql("usuario", ["id"] + cols_user)
    user_remap = {}
    a_insertar = []
    for u in filas_user:
        mid = u["id"]
        rol_name = mysql_roles.get(u.get("rol_id"), "Estudiante")
        if rol_name not in pg_roles:
            print("  OJO: rol '%s' no estÃ¡ en PG, se asigna Estudiante." % rol_name)
            rol_name = "Estudiante"
        pg_rol_id = pg_roles.get(rol_name)
        if u.get("username") == "iaferrer" or u.get("identificacion") == "1010086984":
            user_remap[mid] = 1  # iaferrer ya existe en PG (id 1)
            continue
        fila = {k: u[k] for k in cols_user if k in u}
        fila["id"] = mid
        fila["rol_id"] = pg_rol_id
        a_insertar.append(fila)
        user_remap[mid] = mid
    if contar_pg("usuario") <= 1:  # solo iaferrer -> copiar el resto
        insertar_pg("usuario", a_insertar)
    else:
        print("  (usuario: destino ya poblado, se omite la copia)")
    fix_sequence("usuario", "id")

    # 2) Tablas con IDs preservados (si el destino estÃ¡ vacÃ­o)
    plan = [
        ("libros", ["ID", "Autor", "Titulo", "Programa", "Item", "Signatura", "Areas",
                    "Ejemplar", "Editorial", "AÃ±o", "Idioma", "sede",
                    "Observaciones", "Precio", "Proveedor", "Registro_en_linea"]),
        ("dispositivos", ["id", "tipo", "marca", "modelo", "sede", "estado",
                          "observaciones", "created_at", "updated_at"]),
        ("contratistas", ["ID", "Editorial", "NIT"]),
    ]
    for tabla, cols in plan:
        cols = [c for c in cols if c in mysql_cols(tabla)]
        if contar_pg(tabla) == 0:
            try:
                filas = leer_mysql(tabla, cols)
                if tabla == "libros":
                    filas = sanitizar_libros(filas)
                insertar_pg(tabla, filas)
            except Exception as e:
                print("  ERROR en %s: %s" % (tabla, e))
        else:
            print("  (%s: destino ya tiene datos, se omite)" % tabla)
        if tabla in ("libros", "dispositivos", "contratistas"):
            col_pk = "id"
            if tabla in ("libros", "contratistas"):
                col_pk = "ID"
            fix_sequence(tabla, col_pk)

    # proveer
    if contar_pg("proveer") == 0:
        try:
            insertar_pg("proveer", leer_mysql("proveer", ["Libro_ID", "Contratista_ID"]))
        except Exception as e:
            print("  ERROR en proveer: %s" % e)

    # 3) PrÃ©stamos y accesos (remap user_id)
    def copiar_con_remap(tabla, cols):
        filas = leer_mysql(tabla, cols)
        for f in filas:
            if "user_id" in f and f["user_id"] in user_remap:
                f["user_id"] = user_remap[f["user_id"]]
            # MySQL tinyint(1) -> booleano de PostgreSQL
            if "status" in f and f["status"] is not None:
                f["status"] = bool(f["status"])
        insertar_pg(tabla, filas)
        fix_sequence(tabla)

    prestamos_cols = [c for c in mysql_cols("prestamos") if c != "id"] or ["id"]
    if contar_pg("prestamos") == 0:
        try:
            copiar_con_remap("prestamos", ["id"] + prestamos_cols)
        except Exception as e:
            print("  ERROR en prestamos: %s" % e)

    pd_cols = [c for c in mysql_cols("prestamos_dispositivos") if c != "id"] or ["id"]
    if contar_pg("prestamos_dispositivos") == 0:
        try:
            copiar_con_remap("prestamos_dispositivos", ["id"] + pd_cols)
        except Exception as e:
            print("  ERROR en prestamos_dispositivos: %s" % e)

    la_cols = [c for c in mysql_cols("library_access") if c != "id"] or ["id"]
    if contar_pg("library_access") == 0:
        try:
            copiar_con_remap("library_access", ["id"] + la_cols)
        except Exception as e:
            print("  ERROR en library_access: %s" % e)

    print("\nMigraciÃ³n MySQL -> PostgreSQL completada.")


if __name__ == "__main__":
    main()