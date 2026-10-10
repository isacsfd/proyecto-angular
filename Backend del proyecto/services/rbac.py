"""
rbac.py — Definición central de módulos y matriz de permisos (RBAC)
===================================================================
Cataloga los módulos del sistema y qué rol tiene acceso a cada uno.
Usado por la migración y por el bootstrap. Idempotente.
"""

from sqlalchemy.orm import Session

from models.models import Rol, Modulo, ModuloRol

ROLES = ["super_administrador", "Administrador", "Funcionario", "Docente", "Estudiante"]

MODULOS = [
    "login", "inicio", "catalogo", "mis_prestamos", "dispositivos", "chatbot",
    "dashboard", "gestion_usuarios", "gestion_libros", "gestion_dispositivos",
    "gestion_prestamos", "estadisticas", "ingresos",
]

# Matriz de permisos (rol -> módulos). El super y el admin acceden a todo.
MATRIZ = {
    "super_administrador": MODULOS,
    "Administrador": MODULOS,
    "Funcionario": MODULOS,
    "Docente": ["login", "inicio", "catalogo", "mis_prestamos", "dispositivos", "chatbot"],
    "Estudiante": ["login", "inicio", "catalogo", "mis_prestamos", "dispositivos", "chatbot"],
}


def sembrar_rbac(db: Session):
    """Crea roles, módulos y la matriz modulos_X_rol si no existen (idempotente)."""
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

    for rol_nombre, lista in MATRIZ.items():
        for mod_nombre in lista:
            existe = db.query(ModuloRol).filter(
                ModuloRol.rol_id == roles[rol_nombre], ModuloRol.modulo_id == mods[mod_nombre]
            ).first()
            if not existe:
                db.add(ModuloRol(rol_id=roles[rol_nombre], modulo_id=mods[mod_nombre]))
    db.commit()