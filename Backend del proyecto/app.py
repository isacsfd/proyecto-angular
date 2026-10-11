"""
app.py — API principal de la Biblioteca IUB
============================================
Mejoras de solidez técnica implementadas:
  1. JWT  — Autenticación con tokens firmados (Bearer Token)
  2. HTTPS — Servidor configurado para SSL (ver generar_certificado.py)
  3. Docs  — Endpoints documentados con description, summary y tags
"""

from pydantic import BaseModel, EmailStr, ConfigDict
from fastapi import FastAPI, Depends, HTTPException, status, Query, Request
from fastapi.openapi.utils import get_openapi
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import cast, String, or_
from database import Dispositivo, Libro, PrestamoDispositivo, Prestamos
import database
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from database import SessionLocal, engine
from models.models import UserTable, LibraryAccess, Rol
from requests.user_request import UserCreateRequest
from routers.access_router import access_router
from routers.ia_router import ia_router
from routers.compras_router import router as compras_router
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from auth import (
    crear_token,
    verificar_token,
    requiere_modulo,
    es_admin,
    es_super,
    contar_super,
    SUPER_ADMIN,
)
import os, threading, sys

# ─── Lector QR ───────────────────────────────────────────────
# El lector QR (OpenCV + cámara) se importa de forma PEREZOSA dentro del
# endpoint /api/iniciar-lector (ver _cargar_lector_qr). Así el arranque del
# backend NO depende de OpenCV ni de la carpeta qr/ (no disponibles en
# entornos sin GUI como Render). La funcionalidad QR se conserva para
# servidores con cámara y OpenCV instalado.

# ─── Hash de contraseñas ─────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── Protección contra fuerza bruta en el login ───────────────
from services.rate_limit import RateLimiter, clave_por_ip
limitador_login = RateLimiter(max_requests=20, window_seconds=60)

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    """Valida únicamente hashes bcrypt.

    No acepta contraseñas en texto plano como alternativa silenciosa: si el
    hash almacenado no empieza por $2a$/$2b$/$2y$, la verificación falla y la
    migración legada se gestiona explícitamente en el login.
    """
    if hashed and hashed.startswith(("$2a$", "$2b$", "$2y$")):
        # bcrypt es compatible entre prefijos $2a$, $2b$ y $2y$
        return pwd_context.verify(plain, hashed)
    return False

# ─── Base de datos ────────────────────────────────────────────
database.Base.metadata.create_all(bind=engine)

# ─── Aplicación FastAPI con metadata para /docs ───────────────
app = FastAPI(
    title="API Biblioteca IUB",
    description=(
        "Sistema de gestión de acceso y préstamos de recursos informáticos "
        "de la Institución Universitaria de Barranquilla (IUB). "
        "Usa código QR para registrar ingresos y autenticación JWT para proteger los endpoints."
    ),
    version="2.1.0",
    contact={
        "name": "Isaacs Ferrer — ITSA",
        "email": "iaferrer@unibarranquilla.du.co",
    },
    license_info={"name": "Uso institucional IUB"},
)

# ─── CORS: solo orígenes permitidos (nunca "*" con credentials) ─────────────
# Define MM_CORS_ORIGINS como lista separada por comas en producción.
_cors_origins = [
    o.strip()
    for o in os.getenv(
        "MM_CORS_ORIGINS",
        "http://localhost:4200,http://127.0.0.1:4200,http://127.0.0.1:8000",
    ).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(access_router)
app.include_router(ia_router)
app.include_router(compras_router)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Franjas de préstamo ─────────────────────────────────────────────────────
# Dispositivos: franja horaria de MÁXIMO 2 horas, servicio de 08:00 a 20:00.
# Libros: préstamo de 4 a 6 días (se devuelve en la biblioteca).
def validar_franja_horaria(inicio: datetime, fin: datetime):
    if not inicio or not fin:
        raise HTTPException(status_code=400, detail="Debe indicar inicio y fin de la franja horaria")
    if fin <= inicio:
        raise HTTPException(status_code=400, detail="La fecha de fin debe ser posterior al inicio")
    if (fin - inicio).total_seconds() / 3600 > 2:
        raise HTTPException(status_code=400, detail="La franja horaria no puede superar las 2 horas")

    def dentro_horario(dt: datetime) -> bool:
        minutos = dt.hour + dt.minute / 60
        return 8 <= minutos <= 20

    if not (dentro_horario(inicio) and dentro_horario(fin)):
        raise HTTPException(status_code=400, detail="El servicio de préstamo de dispositivos opera de 8:00 a.m. a 8:00 p.m.")


def validar_prestamo_libro(inicio: datetime, fin: datetime):
    """El préstamo de libros es de 4 a 6 días."""
    if not inicio or not fin:
        raise HTTPException(status_code=400, detail="Debe indicar fecha de préstamo y de devolución")
    if fin <= inicio:
        raise HTTPException(status_code=400, detail="La fecha de devolución debe ser posterior al préstamo")
    dias = (fin - inicio).total_seconds() / 86400
    if dias < 4 or dias > 6:
        raise HTTPException(status_code=400, detail="El préstamo de libros es de 4 a 6 días")


# ══════════════════════════════════════════════════════════════
# RAÍZ
# ══════════════════════════════════════════════════════════════
@app.get(
    "/",
    tags=["General"],
    summary="Estado de la API",
    description="Verifica que el servidor esté corriendo. No requiere autenticación.",
)
def read_root():
    return {"message": "API Biblioteca IUB activa — visita /docs para la documentación interactiva."}


# ══════════════════════════════════════════════════════════════
# LECTOR QR
# ══════════════════════════════════════════════════════════════
_hilo_lector: threading.Thread | None = None  # Singleton: una sola cámara activa


def _cargar_lector_qr():
    """
    Importa PEREZOSAMENTE el lector QR (OpenCV + cámara) desde la carpeta 'qr/'
    de la raíz del repositorio. Devuelve el módulo `reader` o None si no está
    disponible (p. ej. sin OpenCV o sin la carpeta). No rompe el arranque.
    """
    import sys as _sys
    _sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    try:
        from qr import reader  # requiere OpenCV (cv2); opcional en la nube
        return reader
    except Exception:
        return None


@app.post(
    "/api/iniciar-lector",
    tags=["QR"],
    summary="Activar lector QR",
    description=(
        "Inicia el lector de código QR usando la cámara del servidor. "
        "Solo disponible para administradores autenticados. "
        "Si el lector ya está activo, no se crea un segundo hilo. "
        "Requiere la carpeta 'qr/' y OpenCV con cámara (no disponible en entornos sin GUI)."
    ),
)
def iniciar_lector(_: dict = Depends(requiere_modulo("ingresos"))):
    global _hilo_lector
    if _hilo_lector is not None and _hilo_lector.is_alive():
        return {"mensaje": "El lector QR ya está activo"}
    reader = _cargar_lector_qr()
    if reader is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "El lector QR no está disponible en este servidor: requiere la carpeta "
                "'qr/' y OpenCV con acceso a cámara (no está habilitado en entornos sin GUI)."
            ),
        )
    _hilo_lector = threading.Thread(target=reader.leer_qr_con_delay, daemon=True)
    _hilo_lector.start()
    return {"mensaje": "Lector QR iniciado correctamente"}


# ══════════════════════════════════════════════════════════════
# LOGIN — devuelve JWT
# ══════════════════════════════════════════════════════════════
class LoginData(BaseModel):
    identificacion: str
    password: str

class LoginResponse(BaseModel):
    message: str
    access_token: str
    token_type: str
    user: dict

@app.post(
    "/login",
    response_model=LoginResponse,
    tags=["Autenticación"],
    summary="Iniciar sesión",
    description=(
        "Autentica al usuario con su número de identificación y contraseña. "
        "Devuelve un token JWT válido por 8 horas que debe incluirse en el header "
        "`Authorization: Bearer <token>` en todas las solicitudes protegidas."
    ),
)
def login(data: LoginData, request: Request, db: Session = Depends(get_db)):
    # Protección contra fuerza bruta / enumeración de credenciales
    if not limitador_login.permitir(clave_por_ip(request)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos de inicio de sesión. Espere un momento e intente nuevamente.",
        )

    user = db.query(UserTable).filter(
        UserTable.identificacion == data.identificacion
    ).first()

    # Validación de credenciales (bcrypt). Ventana explícita de migración para
    # hashes legados en texto plano: nunca se aceptan en silencio; solo se
    # migran a bcrypt si MM_HASH_PLANO_PERMITIDO=1 y la contraseña coincide.
    credenciales_validas = False
    if user is not None:
        clave_storage = user.password or ""
        if clave_storage.startswith(("$2a$", "$2b$", "$2y$")):
            credenciales_validas = verify_password(data.password, clave_storage)
        elif (
            os.getenv("MM_HASH_PLANO_PERMITIDO") == "1"
            and clave_storage == data.password
        ):
            # Migración en el primer inicio de sesión: se re-hashea a bcrypt.
            user.password = hash_password(data.password)
            db.commit()
            credenciales_validas = True

    if user is None or not credenciales_validas:
        raise HTTPException(
            status_code=401,
            detail="Identificación o contraseña incorrectos",
        )

    user_data = {
        "id": user.id,
        "nombre": user.nombre,
        "username": user.username,
        "email": user.email,
        "rol": user.rol,
        "identificacion": user.identificacion,
        "nivel_academico": user.nivel_academico,
        "carrera": user.carrera,
        "sede": user.sede,
    }

    token = crear_token(user_data)

    return {
        "message": "Inicio de sesión exitoso",
        "access_token": token,
        "token_type": "bearer",
        "user": user_data,
    }


# ══════════════════════════════════════════════════════════════
# USUARIOS
# ══════════════════════════════════════════════════════════════
class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    identificacion: Optional[str] = None
    tipo: Optional[str] = None
    rol: Optional[str] = None
    nivel_academico: Optional[str] = None
    carrera: Optional[str] = None
    sede: Optional[str] = None

class UserDetailResponse(BaseModel):
    id: int
    nombre: str
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    rol: Optional[str] = None
    identificacion: str
    nivel_academico: Optional[str] = None
    carrera: Optional[str] = None
    sede: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

@app.get(
    "/usuarios/",
    response_model=List[UserDetailResponse],
    tags=["Usuarios"],
    summary="Listar todos los usuarios",
    description="Devuelve la lista completa de usuarios registrados. Solo administradores.",
)
def read_all_users(
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_modulo("gestion_usuarios")),
):
    return db.query(UserTable).all()


@app.post(
    "/usuarios/",
    response_model=UserDetailResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Usuarios"],
    summary="Crear usuario",
    description=(
        "Registra un nuevo usuario en el sistema. La contraseña se almacena "
        "hasheada con bcrypt. Solo administradores y super administradores "
        "pueden crear usuarios; únicamente el super administrador puede "
        "crear administradores. Está prohibido crear un segundo super "
        "administrador por API."
    ),
)
def create_user(
    user: UserCreateRequest,
    db: Session = Depends(get_db),
    token_data: dict = Depends(requiere_modulo("gestion_usuarios")),
):
    # Reglas de escalada de privilegios
    if user.rol == "super_administrador":
        raise HTTPException(status_code=403, detail="No se puede crear un super administrador por API")
    if user.rol == "Administrador" and not es_super(token_data):
        raise HTTPException(status_code=403, detail="Solo el super administrador puede crear administradores")
    if db.query(UserTable).filter(UserTable.identificacion == user.identificacion).first():
        raise HTTPException(status_code=400, detail="La identificación ya está registrada")
    # Resolver rol (nombre) → id en la tabla `rol`
    rol = db.query(Rol).filter(Rol.nombre == user.rol).first()
    if rol is None:
        raise HTTPException(status_code=400, detail=f"El rol '{user.rol}' no existe")
    data = user.model_dump()
    data.pop("rol", None)
    data["rol_id"] = rol.id
    data["password"] = hash_password(data["password"])
    new_user = UserTable(**data)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.get(
    "/usuarios/{user_id}",
    response_model=UserDetailResponse,
    tags=["Usuarios"],
    summary="Obtener usuario por ID",
    description=(
        "Devuelve los datos de un usuario específico. Un administrador puede "
        "consultar a cualquiera; un usuario solo puede consultarse a sí mismo."
    ),
)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verificar_token),
):
    if not es_admin(token_data) and token_data.get("id") != user_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para ver este usuario")
    db_user = db.query(UserTable).filter(UserTable.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return db_user


@app.put(
    "/usuarios/{user_id}",
    response_model=UserDetailResponse,
    tags=["Usuarios"],
    summary="Actualizar usuario",
    description=(
        "Modifica los datos de un usuario existente. Solo administradores y "
        "super administradores. Cambiar el rol a 'Administrador' o gestionar "
        "administradores/super administradores requiere rol de super "
        "administrador. Está prohibido degradar al único super administrador."
    ),
)
def update_user(
    user_id: int,
    user: UserUpdate,
    db: Session = Depends(get_db),
    token_data: dict = Depends(requiere_modulo("gestion_usuarios")),
):
    db_user = db.query(UserTable).filter(UserTable.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Protección general: gestionar admins/super requiere rol de super
    if db_user.rol in ("super_administrador", "Administrador") and not es_super(token_data):
        raise HTTPException(status_code=403, detail="Solo el super administrador puede gestionar administradores")

    datos = user.model_dump(exclude_unset=True)
    if "rol" in datos:
        nuevo_rol = datos["rol"]
        if nuevo_rol == "super_administrador":
            raise HTTPException(status_code=403, detail="No se puede crear un super administrador por API")
        if nuevo_rol == "Administrador" and not es_super(token_data):
            raise HTTPException(status_code=403, detail="Solo el super administrador puede gestionar administradores")
        # No degradar al único super administrador
        if db_user.rol == "super_administrador" and nuevo_rol != "super_administrador":
            if contar_super(db) <= 1:
                raise HTTPException(status_code=403, detail="No puedes degradar al único super administrador")
        rol_destino = db.query(Rol).filter(Rol.nombre == nuevo_rol).first()
        if rol_destino is None:
            raise HTTPException(status_code=400, detail=f"El rol '{nuevo_rol}' no existe")
        datos["rol_id"] = rol_destino.id
        datos.pop("rol", None)

    for key, value in datos.items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.delete(
    "/usuarios/{user_id}",
    response_model=UserDetailResponse,
    tags=["Usuarios"],
    summary="Eliminar usuario",
    description=(
        "Elimina un usuario y todos sus registros relacionados (ingresos y préstamos). "
        "Solo administradores. No se re-numeran los IDs para preservar las referencias."
    ),
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    token_data: dict = Depends(requiere_modulo("gestion_usuarios")),
):
    db_user = db.query(UserTable).filter(UserTable.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Protección: solo el super administrador gestiona admins/super
    if db_user.rol in ("super_administrador", "Administrador") and not es_super(token_data):
        raise HTTPException(status_code=403, detail="Solo el super administrador puede gestionar administradores")
    # No eliminar al único super administrador
    if db_user.rol == "super_administrador" and contar_super(db) <= 1:
        raise HTTPException(status_code=403, detail="No puedes eliminar al único super administrador")

    db.query(LibraryAccess).filter(LibraryAccess.user_id == user_id).delete()
    db.query(PrestamoDispositivo).filter(PrestamoDispositivo.user_id == user_id).delete()
    db.query(Prestamos).filter(Prestamos.user_id == user_id).delete()
    db.delete(db_user)
    db.commit()
    return db_user


# ══════════════════════════════════════════════════════════════
# LIBROS
# ══════════════════════════════════════════════════════════════
class LibroCreate(BaseModel):
    Autor: str; Titulo: str; Programa: Optional[str] = None; Item: Optional[int] = None
    Signatura: str; Areas: Optional[int] = None; Ejemplar: Optional[int] = None
    Editorial: Optional[str] = None; Año: Optional[int] = None; Idioma: Optional[str] = None
    Observaciones: Optional[str] = None; Precio: Optional[str] = None
    Proveedor: Optional[str] = None; Registro_en_linea: Optional[str] = None
    sede: str = "Soledad"

class LibroUpdate(BaseModel):
    Autor: Optional[str] = None; Titulo: Optional[str] = None
    Programa: Optional[str] = None; Item: Optional[int] = None
    Signatura: Optional[str] = None; Areas: Optional[int] = None
    Ejemplar: Optional[int] = None; Editorial: Optional[str] = None
    Año: Optional[int] = None; Idioma: Optional[str] = None
    Observaciones: Optional[str] = None; Precio: Optional[str] = None
    Proveedor: Optional[str] = None; Registro_en_linea: Optional[str] = None
    sede: Optional[str] = None

class LibroResponse(BaseModel):
    ID: int; Autor: str; Titulo: str; Programa: Optional[str] = None; Item: Optional[int] = None
    Signatura: str; Areas: Optional[int] = None; Ejemplar: Optional[int] = None
    Editorial: Optional[str] = None; Año: Optional[int] = None; Idioma: Optional[str] = None
    Observaciones: Optional[str] = None; Precio: Optional[str] = None
    Proveedor: Optional[str] = None; Registro_en_linea: Optional[str] = None
    sede: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

CATEGORIA_PROGRAMA = {
    "basica": ["Básicas y transversales"],
    "economicas": ["Ciencias Económicas y Administrativas","Administración de Negocios Internacionales","Tecnología en Gestión Logística Internacional","Operaciones del Comercio Exterior","Técnica Profesional En Operaciones Del Comercio","Gestión Administrativa comercial","Tecnología en Gestión Administrativa","Tecnología En Gestión Empresarial","Gestión Empresarial","Técnico Profesional en Operaciones Logísticas","Técnica Profesional en Operaciones de Procesos empresariales","Técnica Profesional en Operación de Procesos empresariales","Técnica profesional en Logística","Tecnología en Gestión de Sistemas Integrados"],
    "diseno": ["Diseño Gráfico","Producción Gráfica Multimedial","Diseño Gráfico Y Multimedia"],
    "industrial": ["Ingeniería Industrial","Técnica profesional en Operación de Procesos Industriales","Tecnología en Gestión de Sistemas Integrados"],
    "electrica": ["Ingeniería Eléctrica"],
    "seguridad": ["Ingeniería en Seguridad y Salud en el Trabajo","Técnica profesional en Gestión de Seguridad y Salud en el Trabajo","Tecnología en Gestión de Seguridad y Salud en el trabajo","Salud Ocupacional","Tecnología en Gestión de Sistemas Integrados"],
    "mecatronica": ["Ingeniería Mecatrónica","Electromecánica","Ingeniería mecatrónica","Mecatrónica","Tecnología en Gestión de Sistemas Integrados"],
    "telematica": ["Ingeniería Telemática","Mantenimiento de Redes de Telecomunicaciones","Tecnología en Gestión de Sistemas Integrados"],
    "licenciatura": ["Licenciatura En Educación Básica Primaria"],
}

@app.get("/libros/categoria", response_model=List[LibroResponse], tags=["Libros"], summary="Libros por categoría", description="Filtra los libros según la categoría académica del programa y la sede del usuario.")
def get_libros_por_categoria(categoria: str, db: Session = Depends(get_db), token_data: dict = Depends(verificar_token)):
    programas = CATEGORIA_PROGRAMA.get(categoria.lower())
    if not programas:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    query = db.query(Libro).filter(Libro.Programa.in_(programas))
    sede_filtro = _sede_efectiva(token_data, None)
    if sede_filtro:
        query = query.filter(Libro.sede == sede_filtro)
    return query.all()

@app.get("/libros/", response_model=List[LibroResponse], tags=["Libros"], summary="Listar todos los libros", description="Devuelve el catálogo de libros ordenado por ID descendente, respetando la sede del usuario (el super administrador ve todas las sedes).")
def read_all_libros(
    sede: Optional[str] = Query(None, description="Sede a filtrar (solo super administrador)"),
    db: Session = Depends(get_db),
    token_data: dict = Depends(verificar_token),
):
    query = db.query(Libro)
    sede_filtro = _sede_efectiva(token_data, sede)
    if sede_filtro:
        query = query.filter(Libro.sede == sede_filtro)
    return query.order_by(Libro.ID.desc()).all()

@app.post("/libros/", response_model=LibroResponse, status_code=201, tags=["Libros"], summary="Agregar libro", description="Registra un nuevo libro en el catálogo. Solo administradores.")
def create_libro(libro: LibroCreate, db: Session = Depends(get_db), _: dict = Depends(requiere_modulo("gestion_libros"))):
    db_libro = Libro(**libro.model_dump())
    db.add(db_libro); db.commit(); db.refresh(db_libro)
    return db_libro


class LibroBuscarResponse(BaseModel):
    id: int
    titulo: str
    autor: str
    ejemplares: Optional[int] = None
    sede: Optional[str] = None


SEDES_VALIDAS = {"Soledad", "Barranquilla", "Colsamiro"}


def _sede_efectiva(token_data: dict, sede_param: Optional[str] = None) -> Optional[str]:
    """
    Resuelve la sede por la que se debe filtrar:
      - super_administrador: la indicada por el parámetro, o None (todas las sedes).
      - resto de roles: SIEMPRE su propia sede (el parámetro se ignora; el frontend
        no puede cambiarla porque el backend la toma del token/sesión).
    """
    if token_data.get("rol") == SUPER_ADMIN:
        if sede_param and sede_param in SEDES_VALIDAS:
            return sede_param
        return None
    return token_data.get("sede") or "Soledad"


@app.get(
    "/libros/buscar",
    response_model=List[LibroBuscarResponse],
    tags=["Libros"],
    summary="Buscar libros para préstamo (autocompletado)",
    description=(
        "Busca libros por título, autor o signatura con coincidencia parcial. "
        "Es insensible a mayúsculas/minúsculas y acentos (collation utf8mb4_unicode_ci). "
        "Devuelve SOLO libros con ejemplares disponibles y únicamente los campos "
        "necesarios para las sugerencias (id, titulo, autor, ejemplares, sede). "
        "La búsqueda respeta la sede: un usuario no administrador siempre ve su "
        "propia sede (validado en backend); el super administrador puede indicar "
        "?sede= para filtrar. Requiere autenticación."
    ),
)
def buscar_libros(
    q: str = Query(..., min_length=1, max_length=100, description="Texto a buscar"),
    limit: int = Query(8, ge=1, le=10, description="Máximo de sugerencias"),
    sede: Optional[str] = Query(None, description="Sede a filtrar (solo super administrador)"),
    db: Session = Depends(get_db),
    token_data: dict = Depends(verificar_token),
):
    termino = q.strip()
    if not termino:
        return []
    patron = f"%{termino}%"
    filtros = [
        or_(
            Libro.Titulo.ilike(patron),
            Libro.Autor.ilike(patron),
            Libro.Signatura.ilike(patron),
        ),
        Libro.Ejemplar > 0,
    ]
    sede_filtro = _sede_efectiva(token_data, sede)
    if sede_filtro:
        filtros.append(Libro.sede == sede_filtro)
    libros = (
        db.query(Libro)
        .filter(*filtros)
        .order_by(Libro.Titulo.asc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.ID,
            "titulo": l.Titulo,
            "autor": l.Autor,
            "ejemplares": l.Ejemplar,
            "sede": l.sede,
        }
        for l in libros
    ]

@app.get("/libros/{libro_id}", response_model=LibroResponse, tags=["Libros"], summary="Obtener libro por ID")
def read_libro(libro_id: int, db: Session = Depends(get_db), _: dict = Depends(verificar_token)):
    db_libro = db.query(Libro).filter(Libro.ID == libro_id).first()
    if not db_libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return db_libro

@app.put("/libros/{libro_id}", response_model=LibroResponse, tags=["Libros"], summary="Actualizar libro", description="Modifica los datos de un libro. Solo administradores.")
def update_libro(libro_id: int, libro: LibroUpdate, db: Session = Depends(get_db), _: dict = Depends(requiere_modulo("gestion_libros"))):
    db_libro = db.query(Libro).filter(Libro.ID == libro_id).first()
    if not db_libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    for key, value in libro.model_dump(exclude_unset=True).items():
        setattr(db_libro, key, value)
    db.commit(); db.refresh(db_libro)
    return db_libro

@app.delete("/libros/{libro_id}", response_model=LibroResponse, tags=["Libros"], summary="Eliminar libro", description="Elimina un libro del catálogo. Solo administradores.")
def delete_libro(libro_id: int, db: Session = Depends(get_db), _: dict = Depends(requiere_modulo("gestion_libros"))):
    db_libro = db.query(Libro).filter(Libro.ID == libro_id).first()
    if not db_libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    db.delete(db_libro); db.commit()
    return db_libro


# ══════════════════════════════════════════════════════════════
# PRÉSTAMOS DE LIBROS
# ══════════════════════════════════════════════════════════════
class LoanRequestCreate(BaseModel):
    user_id: int; book_id: int; loan_date: datetime; delivery_date: datetime
    prestamo_state: Optional[str] = "No Aprobado"

class LoanRequestUpdate(BaseModel):
    entry_date: Optional[datetime] = None; observations: Optional[str] = None
    prestamo_state: Optional[str] = None; state: Optional[str] = None

class LoanResponse(BaseModel):
    id: int; user_id: int; user: str; book_id: str; book: str
    loan_date: datetime; delivery_date: datetime; entry_date: Optional[datetime] = None
    state: str; prestamo_state: str; created_at: datetime
    model_config = ConfigDict(from_attributes=True)

@app.post("/loan/", status_code=201, tags=["Préstamos de libros"], summary="Crear préstamo de libro", description="Registra un préstamo. Un usuario autenticado puede solicitar ('No Aprobado') para sí mismo; solo administradores crean préstamos ya aprobados. El inventario se descuenta solo si queda aprobado.")
def loan_create(request: LoanRequestCreate, db: Session = Depends(get_db), token_data: dict = Depends(verificar_token)):
    es_administrador = es_admin(token_data)
    # Solo admin/super puede crear préstamos ya aprobados
    if request.prestamo_state == "Aprobado" and not es_administrador:
        raise HTTPException(status_code=403, detail="Solo un administrador puede aprobar préstamos")
    # Un usuario no-admin solo puede solicitar para sí mismo
    if not es_administrador and request.user_id != token_data.get("id"):
        raise HTTPException(status_code=403, detail="No puedes solicitar un préstamo para otro usuario")
    book = db.query(Libro).filter(Libro.ID == request.book_id).first()
    if not book: raise HTTPException(status_code=404, detail="Libro no encontrado")
    user = db.query(UserTable).filter(UserTable.id == request.user_id).first()
    if not user: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    # Un libro solo puede prestarse en la sede del usuario que lo solicita
    if book.sede and user.sede and book.sede != user.sede:
        raise HTTPException(status_code=400, detail=f"El libro pertenece a la sede {book.sede} y el usuario a {user.sede}.")
    if not book.Ejemplar or book.Ejemplar <= 0: raise HTTPException(status_code=400, detail="Libro no disponible")
    if db.query(Prestamos).filter(Prestamos.user_id == request.user_id, Prestamos.book_id == str(book.ID), Prestamos.state == "Activo").first():
        raise HTTPException(status_code=400, detail="El libro ya está prestado a este usuario")
    # Validar plazo del préstamo de libros (4 a 6 días)
    validar_prestamo_libro(request.loan_date, request.delivery_date)
    loan = Prestamos(user_id=user.id, book_id=str(book.ID), loan_date=request.loan_date, delivery_date=request.delivery_date, state="Activo", prestamo_state=request.prestamo_state)
    # Solo un préstamo aprobado consume inventario. Una solicitud "No Aprobado" no descuenta.
    if request.prestamo_state == "Aprobado":
        book.Ejemplar -= 1
    db.add(loan); db.commit(); db.refresh(loan)
    return loan

@app.get("/loan/", response_model=List[LoanResponse], tags=["Préstamos de libros"], summary="Listar préstamos de libros", description="Un usuario ve únicamente sus propios préstamos; administradores y super administradores ven todos.")
def loan_list(db: Session = Depends(get_db), token_data: dict = Depends(verificar_token)):
    filtro = []
    if not es_admin(token_data):
        filtro.append(Prestamos.user_id == token_data.get("id"))
    rows = (
        db.query(Prestamos, UserTable, Libro)
        .outerjoin(UserTable, Prestamos.user_id == UserTable.id)
        .outerjoin(Libro, cast(Libro.ID, String) == Prestamos.book_id)
        .filter(*filtro)
        .order_by(Prestamos.created_at.desc())
        .all()
    )
    return [
        {
            "id": loan.id,
            "user_id": loan.user_id,
            "user": user.nombre if user else "N/A",
            "book_id": loan.book_id,
            "book": libro.Titulo if libro else "N/A",
            "loan_date": loan.loan_date,
            "delivery_date": loan.delivery_date,
            "entry_date": loan.entry_date,
            "state": loan.state,
            "prestamo_state": loan.prestamo_state,
            "created_at": loan.created_at,
        }
        for loan, user, libro in rows
    ]

@app.get("/loan/{loan_id}", response_model=LoanResponse, tags=["Préstamos de libros"], summary="Obtener préstamo por ID")
def loan_get(loan_id: int, db: Session = Depends(get_db), token_data: dict = Depends(verificar_token)):
    loan = db.query(Prestamos).filter(Prestamos.id == loan_id).first()
    if not loan: raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    # Un usuario normal no puede consultar préstamos ajenos
    if not es_admin(token_data) and loan.user_id != token_data.get("id"):
        raise HTTPException(status_code=403, detail="No puedes consultar préstamos de otro usuario")
    user = db.query(UserTable).filter(UserTable.id == loan.user_id).first()
    book = db.query(Libro).filter(cast(Libro.ID, String) == loan.book_id).first()
    return {"id": loan.id, "user_id": loan.user_id, "user": user.nombre, "book_id": loan.book_id, "book": book.Titulo if book else "N/A", "loan_date": loan.loan_date, "delivery_date": loan.delivery_date, "entry_date": loan.entry_date, "state": loan.state, "prestamo_state": loan.prestamo_state, "created_at": loan.created_at}

@app.patch("/loan/{loan_id}", tags=["Préstamos de libros"], summary="Actualizar préstamo de libro", description="Actualiza el estado de un préstamo. El inventario se descuenta al aprobar y se devuelve al marcar como Devuelto o Rechazado.")
def loan_update(loan_id: int, request: LoanRequestUpdate, db: Session = Depends(get_db), _: dict = Depends(requiere_modulo("gestion_prestamos"))):
    loan = db.query(Prestamos).filter(Prestamos.id == loan_id).first()
    if not loan: raise HTTPException(status_code=404, detail="Préstamo no encontrado")

    def consume(loan) -> bool:
        """Un préstamo consume inventario solo si está aprobado y no devuelto."""
        return loan.prestamo_state == "Aprobado" and loan.state != "Devuelto"

    book = db.query(Libro).filter(cast(Libro.ID, String) == loan.book_id).first()
    consumia_antes = consume(loan)

    if request.entry_date: loan.entry_date = request.entry_date
    if request.observations: loan.observations = request.observations
    if request.prestamo_state: loan.prestamo_state = request.prestamo_state
    if request.state:
        loan.state = request.state

    consume_ahora = consume(loan)
    if book:
        if consume_ahora and not consumia_antes:
            if not book.Ejemplar or book.Ejemplar <= 0:
                db.rollback()
                raise HTTPException(status_code=400, detail="Libro no disponible para aprobar")
            book.Ejemplar -= 1
        elif consumia_antes and not consume_ahora:
            book.Ejemplar = (book.Ejemplar or 0) + 1

    db.commit(); db.refresh(loan)
    return loan


# ══════════════════════════════════════════════════════════════
# DISPOSITIVOS
# ══════════════════════════════════════════════════════════════
class DispositivoCreate(BaseModel):
    tipo: str; marca: str; modelo: str; sede: str
    estado: Optional[str] = "Disponible"; observaciones: Optional[str] = None

class DispositivoUpdate(BaseModel):
    tipo: Optional[str] = None; marca: Optional[str] = None
    modelo: Optional[str] = None; sede: Optional[str] = None
    estado: Optional[str] = None; observaciones: Optional[str] = None

class DispositivoResponse(BaseModel):
    id: int; tipo: str; marca: str; modelo: str; sede: str; estado: str
    observaciones: Optional[str] = None; created_at: datetime; updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

@app.get("/dispositivos/", response_model=List[DispositivoResponse], tags=["Dispositivos"], summary="Listar dispositivos", description="Devuelve todos los dispositivos registrados, ordenados por ID descendente.")
def read_all_dispositivos(db: Session = Depends(get_db), _: dict = Depends(verificar_token)):
    return db.query(Dispositivo).order_by(Dispositivo.id.desc()).all()

@app.get("/dispositivos/{dispositivo_id}", response_model=DispositivoResponse, tags=["Dispositivos"], summary="Obtener dispositivo por ID")
def read_dispositivo(dispositivo_id: int, db: Session = Depends(get_db), _: dict = Depends(verificar_token)):
    d = db.query(Dispositivo).filter(Dispositivo.id == dispositivo_id).first()
    if not d: raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    return d

@app.post("/dispositivos/", response_model=DispositivoResponse, status_code=201, tags=["Dispositivos"], summary="Registrar dispositivo", description="Agrega un nuevo computador o tableta al inventario. Solo administradores.")
def create_dispositivo(dispositivo: DispositivoCreate, db: Session = Depends(get_db), _: dict = Depends(requiere_modulo("gestion_dispositivos"))):
    d = Dispositivo(**dispositivo.model_dump())
    db.add(d); db.commit(); db.refresh(d)
    return d

@app.put("/dispositivos/{dispositivo_id}", response_model=DispositivoResponse, tags=["Dispositivos"], summary="Actualizar dispositivo", description="Modifica los datos de un dispositivo. Solo administradores.")
def update_dispositivo(dispositivo_id: int, dispositivo: DispositivoUpdate, db: Session = Depends(get_db), _: dict = Depends(requiere_modulo("gestion_dispositivos"))):
    d = db.query(Dispositivo).filter(Dispositivo.id == dispositivo_id).first()
    if not d: raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    for key, value in dispositivo.model_dump(exclude_unset=True).items():
        setattr(d, key, value)
    db.commit(); db.refresh(d)
    return d

@app.delete("/dispositivos/{dispositivo_id}", response_model=DispositivoResponse, tags=["Dispositivos"], summary="Eliminar dispositivo", description="Elimina un dispositivo y sus préstamos asociados. Solo administradores. No se re-numeran los IDs.")
def delete_dispositivo(dispositivo_id: int, db: Session = Depends(get_db), _: dict = Depends(requiere_modulo("gestion_dispositivos"))):
    d = db.query(Dispositivo).filter(Dispositivo.id == dispositivo_id).first()
    if not d: raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    db.query(PrestamoDispositivo).filter(PrestamoDispositivo.dispositivo_id == dispositivo_id).delete()
    db.delete(d); db.commit()
    return d


# ══════════════════════════════════════════════════════════════
# PRÉSTAMOS DE DISPOSITIVOS
# ══════════════════════════════════════════════════════════════
class PrestamoDispositivoCreate(BaseModel):
    dispositivo_id: int; user_id: int; fecha_prestamo: datetime
    fecha_devolucion: datetime
    observaciones: Optional[str] = None

class PrestamoDispositivoUpdate(BaseModel):
    fecha_devolucion: Optional[datetime] = None
    estado: Optional[str] = None; observaciones: Optional[str] = None

class PrestamoDispositivoResponse(BaseModel):
    id: int; dispositivo_id: int; dispositivo: str; user_id: int; user: str
    fecha_prestamo: datetime; fecha_devolucion: Optional[datetime] = None
    estado: str; observaciones: Optional[str] = None
    created_at: datetime; updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

@app.post("/prestamos-dispositivos/", response_model=PrestamoDispositivoResponse, status_code=201, tags=["Préstamos de dispositivos"], summary="Solicitar préstamo de dispositivo", description="Un usuario solicita un dispositivo para sí mismo (queda en 'Pendiente'). Un administrador lo aprueba después. La franja horaria es de máximo 2 horas entre 8:00 a.m. y 8:00 p.m.")
def create_prestamo_dispositivo(request: PrestamoDispositivoCreate, db: Session = Depends(get_db), token_data: dict = Depends(verificar_token)):
    try:
        # Un usuario no-admin solo puede solicitar para sí mismo
        if not es_admin(token_data) and request.user_id != token_data.get("id"):
            raise HTTPException(status_code=403, detail="No puedes solicitar un dispositivo para otro usuario")
        # Validar franja horaria (máx. 2 horas, de 8:00 a.m. a 8:00 p.m.)
        validar_franja_horaria(request.fecha_prestamo, request.fecha_devolucion)
        dispositivo = db.query(Dispositivo).filter(Dispositivo.id == request.dispositivo_id).first()
        if not dispositivo: raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        if dispositivo.estado != "Disponible": raise HTTPException(status_code=400, detail="Dispositivo no disponible")
        user = db.query(UserTable).filter(UserTable.id == request.user_id).first()
        if not user: raise HTTPException(status_code=404, detail="Usuario no encontrado")
        # La solicitud nace en "Pendiente"; el dispositivo solo se marca Prestado al aprobar
        prestamo = PrestamoDispositivo(dispositivo_id=request.dispositivo_id, user_id=request.user_id,
                                       fecha_prestamo=request.fecha_prestamo, fecha_devolucion=request.fecha_devolucion,
                                       estado="Pendiente", observaciones=request.observaciones)
        db.add(prestamo); db.commit(); db.refresh(prestamo)
        return {"id": prestamo.id, "dispositivo_id": prestamo.dispositivo_id, "dispositivo": f"{dispositivo.tipo} {dispositivo.marca} {dispositivo.modelo}", "user_id": prestamo.user_id, "user": user.nombre, "fecha_prestamo": prestamo.fecha_prestamo, "fecha_devolucion": prestamo.fecha_devolucion, "estado": prestamo.estado, "observaciones": prestamo.observaciones, "created_at": prestamo.created_at, "updated_at": prestamo.updated_at}
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno al crear el préstamo.")

@app.get("/prestamos-dispositivos/", response_model=List[PrestamoDispositivoResponse], tags=["Préstamos de dispositivos"], summary="Listar préstamos de dispositivos", description="Un usuario ve únicamente sus propios préstamos; administradores y super administradores ven todos.")
def read_all_prestamos_dispositivos(db: Session = Depends(get_db), token_data: dict = Depends(verificar_token)):
    query = (
        db.query(PrestamoDispositivo, UserTable, Dispositivo)
        .outerjoin(UserTable, PrestamoDispositivo.user_id == UserTable.id)
        .outerjoin(Dispositivo, PrestamoDispositivo.dispositivo_id == Dispositivo.id)
    )
    if not es_admin(token_data):
        query = query.filter(PrestamoDispositivo.user_id == token_data.get("id"))
    rows = query.order_by(PrestamoDispositivo.created_at.desc()).all()
    return [
        {
            "id": p.id,
            "dispositivo_id": p.dispositivo_id,
            "dispositivo": f"{d.tipo} {d.marca} {d.modelo}" if d else "N/A",
            "user_id": p.user_id,
            "user": user.nombre if user else "N/A",
            "fecha_prestamo": p.fecha_prestamo,
            "fecha_devolucion": p.fecha_devolucion,
            "estado": p.estado,
            "observaciones": p.observaciones,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }
        for p, user, d in rows
    ]

@app.patch("/prestamos-dispositivos/{prestamo_id}", response_model=PrestamoDispositivoResponse, tags=["Préstamos de dispositivos"], summary="Gestionar préstamo de dispositivo", description="El administrador aprueba (Activo), rechaza (Rechazado) o gestiona la devolución (Completado) o daño (Dañado). El dispositivo se marca 'Prestado' solo al aprobar.")
def update_prestamo_dispositivo(prestamo_id: int, request: PrestamoDispositivoUpdate, db: Session = Depends(get_db), _: dict = Depends(requiere_modulo("gestion_dispositivos"))):
    prestamo = db.query(PrestamoDispositivo).filter(PrestamoDispositivo.id == prestamo_id).first()
    if not prestamo: raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    if request.fecha_devolucion: prestamo.fecha_devolucion = request.fecha_devolucion
    if request.estado:
        d = db.query(Dispositivo).filter(Dispositivo.id == prestamo.dispositivo_id).first()
        if request.estado == "Activo":
            # Aprobar la solicitud pendiente: marcar el equipo como Prestado
            if not d or d.estado != "Disponible":
                raise HTTPException(status_code=400, detail="Dispositivo no disponible para aprobar")
            prestamo.estado = "Activo"
            d.estado = "Prestado"
        elif request.estado == "Rechazado":
            # Rechazar la solicitud: el equipo nunca fue marcado como Prestado
            prestamo.estado = "Rechazado"
        elif request.estado == "Completado":
            prestamo.estado = "Completado"
            if d: d.estado = "Disponible"
        elif request.estado == "Dañado":
            prestamo.estado = "Dañado"
            if d: d.estado = "Dañado"
        else:
            raise HTTPException(status_code=400, detail="Estado no válido")
    if request.observaciones: prestamo.observaciones = request.observaciones
    db.commit(); db.refresh(prestamo)
    user = db.query(UserTable).filter(UserTable.id == prestamo.user_id).first()
    d = db.query(Dispositivo).filter(Dispositivo.id == prestamo.dispositivo_id).first()
    return {"id": prestamo.id, "dispositivo_id": prestamo.dispositivo_id, "dispositivo": f"{d.tipo} {d.marca} {d.modelo}" if d else "N/A", "user_id": prestamo.user_id, "user": user.nombre if user else "N/A", "fecha_prestamo": prestamo.fecha_prestamo, "fecha_devolucion": prestamo.fecha_devolucion, "estado": prestamo.estado, "observaciones": prestamo.observaciones, "created_at": prestamo.created_at, "updated_at": prestamo.updated_at}


# ══════════════════════════════════════════════════════════════
# MANUAL ESTÁTICO
# ══════════════════════════════════════════════════════════════
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANUAL_DIR = os.path.join(BASE_DIR, "Frontend del proyecto", "manual")
# Se monta solo si el directorio existe (evita fallo de arranque si el deploy
# no incluye "Frontend del proyecto/manual"). Comportamiento igual si existe.
if os.path.isdir(MANUAL_DIR):
    app.mount("/manual", StaticFiles(directory=MANUAL_DIR), name="manual")