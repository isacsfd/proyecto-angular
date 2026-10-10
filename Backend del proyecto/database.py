import os
from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, func
from datetime import datetime


def _url_desarrollo() -> str:
    """
    URL de PostgreSQL LOCAL (desarrollo), sin credenciales embebidas.
    Se compone de variables de entorno opcionales:
      MM_DB_USER (default postgres), MM_DB_PASSWORD (default vacío),
      MM_DB_HOST (default localhost), MM_DB_PORT (default 5432),
      MM_DB_NAME (default biblioteca_iub).
    No incluye secretos en el código.
    """
    user = os.getenv("MM_DB_USER", "postgres")
    pwd = os.getenv("MM_DB_PASSWORD", "")
    host = os.getenv("MM_DB_HOST", "localhost")
    port = os.getenv("MM_DB_PORT", "5432")
    name = os.getenv("MM_DB_NAME", "biblioteca_iub")
    cred = f"{user}:{quote_plus(pwd)}@" if pwd else f"{user}@"
    return f"postgresql+psycopg2://{cred}{host}:{port}/{name}"


# Selección de base de datos:
#   - Si MM_DATABASE_URL está definida, se usa tal cual (p. ej. Neon en la nube).
#   - En Render (variable RENDER presente) es OBLIGATORIA: sin ella se lanza un
#     error claro en lugar de caer silenciosamente en localhost (que provoca un
#     OperationalError "Connection refused" al ejecutar create_all en el arranque).
#   - En local (sin RENDER) se usa PostgreSQL LOCAL de desarrollo, sin credenciales.
# El controlador de PostgreSQL es psycopg2 (postgresql+psycopg2).
_url = os.getenv("MM_DATABASE_URL")
if _url:
    SQLALCHEMY_DATABASE_URL = _url
elif os.getenv("RENDER"):
    raise RuntimeError(
        "MM_DATABASE_URL no está definida. En Render, configúrela en "
        "'Environment' con la cadena de conexión de PostgreSQL (p. ej. Neon, "
        "con ?sslmode=require)."
    )
else:
    SQLALCHEMY_DATABASE_URL = _url_desarrollo()

# Configuración del pool para Render + Neon (el host "-pooler" usa PgBouncer en
# modo transacción: cierra conexiones ociosas del lado del servidor).
#   - pool_pre_ping: antes de prestar una conexión ejecuta un ping; si la conexión
#     quedó obsoleta/cerrada por el pooler ("SSL connection has been closed
#     unexpectedly", "server closed the connection unexpectedly"), se descarta y
#     se crea otra sana. No cambia SSL: se conserva sslmode=require de la URL.
#   - pool_recycle: limita la antigüedad de la conexión para evitar reutilizar
#     conexiones que el pooler pueda haber cerrado por inactividad.
#   - pool_size/max_overflow/pool_timeout: acotados (uvicorn en Render corre con
#     WEB_CONCURRENCY=1); no se abren conexiones de más contra Neon.
ENGINE_OPTIONS = {
    "pool_pre_ping": True,
    "pool_recycle": int(os.getenv("MM_POOL_RECYCLE", "300")),
    "pool_size": int(os.getenv("MM_POOL_SIZE", "5")),
    "max_overflow": int(os.getenv("MM_POOL_MAX_OVERFLOW", "5")),
    "pool_timeout": int(os.getenv("MM_POOL_TIMEOUT", "30")),
}
engine = create_engine(SQLALCHEMY_DATABASE_URL, **ENGINE_OPTIONS)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class Libro(Base):
    __tablename__ = "libros"

    ID = Column(Integer, primary_key=True, index=True)
    Autor = Column(String(255), nullable=False)
    Titulo = Column(String(255), nullable=False)
    Programa = Column(String(100), nullable=False)
    Item = Column(Integer, nullable=False)
    Signatura = Column(String(50), nullable=False)
    Areas = Column(Integer, nullable=False)
    Ejemplar = Column(Integer, nullable=False)
    Editorial = Column(String(100), nullable=False)
    Año = Column(Integer, nullable=False) 
    Idioma = Column(String(50), nullable=False)
    sede = Column(Enum("Soledad", "Barranquilla", "Colsamiro", native_enum=False), nullable=False, default="Soledad")
    Observaciones = Column(String(50), nullable=True)
    Precio = Column(String(50), nullable=True)
    Proveedor = Column(String(100), nullable=True)
    Registro_en_linea = Column(String(100), nullable=True)

class Prestamos(Base):
    __tablename__ = "prestamos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    book_id = Column(String(50), nullable=False)
    loan_date = Column(DateTime, nullable=False)
    delivery_date = Column(DateTime, nullable=False)
    entry_date = Column(DateTime, nullable=True)
    state = Column(Enum("Activo", "Vencido", "Devuelto", name="estado_prestamo"), nullable=False)
    prestamo_state = Column(Enum("No Aprobado", "Aprobado", "Rechazado", name="estado_solicitud"), nullable=False, default="No Aprobado")
    observations = Column(String(250), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())

class Contratistas(Base):
    __tablename__ = "contratistas"
    
    ID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Editorial = Column(String(100), nullable=False)
    NIT = Column(Integer, nullable=False)

class Proveer(Base):
    __tablename__ = "proveer"
    
    Libro_ID = Column(Integer, primary_key=True, index=True)
    Contratista_ID = Column(Integer, primary_key=True, index=True)

class Dispositivo(Base):
    __tablename__ = "dispositivos"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(Enum("Tablet", "Computador", name="tipo_dispositivo"), nullable=False)
    marca = Column(String(100), nullable=False)
    modelo = Column(String(100), nullable=False)
    sede = Column(Enum("Soledad", "Barranquilla", "Colsamiro", name="tipo_sede"), nullable=False)
    estado = Column(Enum("Disponible", "Prestado", "Dañado", "En Mantenimiento", name="estado_dispositivo"), nullable=False, default="Disponible")
    observaciones = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())

class PrestamoDispositivo(Base):
    __tablename__ = "prestamos_dispositivos"

    id = Column(Integer, primary_key=True, index=True)
    dispositivo_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=False)
    fecha_prestamo = Column(DateTime, nullable=False)
    fecha_devolucion = Column(DateTime, nullable=True)
    estado = Column(Enum("Pendiente", "Activo", "Completado", "Dañado", "Rechazado", name="estado_prestamo_dispositivo"), nullable=False, default="Pendiente")
    observaciones = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())


class Configuracion(Base):
    __tablename__ = "configuracion"

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(100), unique=True, nullable=False)
    valor = Column(String(255), nullable=True)
    descripcion = Column(String(255), nullable=True)