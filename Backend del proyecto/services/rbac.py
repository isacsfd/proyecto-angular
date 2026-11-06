"""
rbac.py — Definición central de módulos y matriz de permisos (RBAC)
===================================================================
Cataloga los módulos del sistema y qué rol tiene acceso a cada uno.
Usado por la migración y por el bootstrap. Idempotente.
"""

from typing import Optional

from sqlalchemy.orm import Session

from models.models import Rol, Modulo, ModuloRol

ROLES = ["super_administrador", "Administrador", "Funcionario", "Docente", "Estudiante"]

SEDES_VALIDAS = {"Soledad", "Barranquilla", "Colsamiro"}

MODULOS = [
    "login", "inicio", "catalogo", "mis_prestamos", "dispositivos", "chatbot",
    "dashboard", "gestion_usuarios", "gestion_libros", "gestion_dispositivos",
    "gestion_prestamos", "estadisticas", "ingresos",
]

# Matriz de permisos (rol -> módulos). El super y el admin acceden a todo.
# Funcionario es un rol OPERATIVO: atiende préstamos e ingresos, pero no
# administra usuarios, inventario ni estadísticas (mínimo privilegio).
MATRIZ = {
    "super_administrador": MODULOS,
    "Administrador": MODULOS,
    "Funcionario": [
        "login", "inicio", "catalogo", "mis_prestamos", "dispositivos", "chatbot",
        "dashboard", "gestion_prestamos", "ingresos",
    ],
    "Docente": ["login", "inicio", "catalogo", "mis_prestamos", "dispositivos", "chatbot"],
    "Estudiante": ["login", "inicio", "catalogo", "mis_prestamos", "dispositivos", "chatbot"],
}


def tiene_modulo(db: Session, rol_id, nombre_modulo: str) -> bool:
    """¿El rol tiene asignado el módulo? Denegación por defecto si no hay rol."""
    if not rol_id:
        return False
    return (
        db.query(ModuloRol)
        .join(Modulo, ModuloRol.modulo_id == Modulo.id)
        .filter(ModuloRol.rol_id == rol_id, Modulo.nombre == nombre_modulo)
        .first()
        is not None
    )


def sede_efectiva(token_data: dict, sede_param: Optional[str] = None) -> Optional[str]:
    """Sede por la que debe filtrar una consulta.

    Solo el super administrador tiene alcance institucional (puede indicar una
    sede o ver todas). Cualquier otro rol queda limitado a la sede de su
    usuario, tomada del token emitido por el backend; el parámetro del cliente
    se ignora para evitar que se manipule el alcance.
    """
    if token_data.get("rol") == "super_administrador":
        return sede_param if sede_param in SEDES_VALIDAS else None
    return token_data.get("sede") or "Soledad"


def planificar_rbac(db: Session) -> dict:
    """Calcula el impacto de sincronizar la matriz SIN modificar la base.

    Solo considera revocaciones de roles canónicos. Los roles personalizados
    se reportan aparte y no se tocan.
    """
    roles_db = {r.nombre: r.id for r in db.query(Rol).all()}
    mods_db = {m.nombre: m.id for m in db.query(Modulo).all()}
    enlaces = {(e.rol_id, e.modulo_id) for e in db.query(ModuloRol).all()}

    canonicos = {nombre: roles_db.get(nombre) for nombre in ROLES}
    deseados = []
    for rol_nombre, lista in MATRIZ.items():
        for mod_nombre in lista:
            deseados.append((rol_nombre, mod_nombre))

    agregar = [
        {"rol": r, "modulo": m}
        for r, m in deseados
        if canonicos.get(r) is None
        or mods_db.get(m) is None
        or (canonicos[r], mods_db[m]) not in enlaces
    ]
    deseados_pares = {
        (canonicos[r], mods_db[m])
        for r, m in deseados
        if canonicos.get(r) is not None and mods_db.get(m) is not None
    }
    mods_por_id = {mid: nombre for nombre, mid in mods_db.items()}
    quitar = [
        {"rol": nombre, "modulo": mods_por_id[mid]}
        for nombre, rid in canonicos.items()
        if rid is not None
        for (r_id, mid) in enlaces
        if r_id == rid and (r_id, mid) not in deseados_pares
    ]
    personalizados = sorted(n for n in roles_db if n not in ROLES)
    return {
        "roles_faltantes": [r for r in ROLES if r not in roles_db],
        "modulos_faltantes": [m for m in MODULOS if m not in mods_db],
        "enlaces_agregar": agregar,
        "enlaces_quitar": quitar,
        "roles_personalizados": personalizados,
        "roles_personalizados_con_enlaces": sorted(
            nombre
            for nombre in personalizados
            if any(e.rol_id == roles_db[nombre] for e in db.query(ModuloRol).all())
        ),
    }


def sembrar_rbac(db: Session, aplicar: bool = True) -> dict:
    """Sincroniza roles, módulos y la matriz modulos_X_rol.

    Con ``aplicar=False`` solo devuelve el plan (previsualización) y no escribe.
    Al aplicar: inserta lo faltante y revoca únicamente los enlaces de roles
    canónicos que ya no están en la matriz. Los roles personalizados y sus
    enlaces se conservan y se reportan para conciliación manual.
    """
    plan = planificar_rbac(db)
    if not aplicar:
        return plan

    roles = {}
    for nombre in ROLES:
        r = db.query(Rol).filter(Rol.nombre == nombre).first()
        if not r:
            r = Rol(nombre=nombre, descripcion=nombre)
            db.add(r)
            db.flush()
        roles[nombre] = r.id

    mods = {}
    for nombre in MODULOS:
        m = db.query(Modulo).filter(Modulo.nombre == nombre).first()
        if not m:
            m = Modulo(nombre=nombre, ruta="/" + nombre, descripcion=nombre, orden=0)
            db.add(m)
            db.flush()
        mods[nombre] = m.id

    deseados = set()
    for rol_nombre, lista in MATRIZ.items():
        for mod_nombre in lista:
            par = (roles[rol_nombre], mods[mod_nombre])
            deseados.add(par)
            existe = db.query(ModuloRol).filter(
                ModuloRol.rol_id == par[0], ModuloRol.modulo_id == par[1]
            ).first()
            if not existe:
                db.add(ModuloRol(rol_id=par[0], modulo_id=par[1]))

    ids_canonicos = set(roles.values())
    for enlace in db.query(ModuloRol).all():
        if enlace.rol_id not in ids_canonicos:
            continue
        if (enlace.rol_id, enlace.modulo_id) not in deseados:
            db.delete(enlace)
    db.commit()
    return plan