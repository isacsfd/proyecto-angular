import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, func
from datetime import datetime

# URL de conexión por variable de entorno (producción debe definirla).
# Motores soportados:
#   MySQL (dev):  mysql+pymysql://usuario:clave@localhost:3306/biblioteca_iub (1)
#   PostgreSQL:   postgresql+psycopg2://usuario:clave@localhost:5432/biblioteca_iub
SQLALCHEMY_DATABASE_URL = os.getenv(
    "MM_DATABASE_URL",
    "mysql+pymysql://root@localhost:3306/biblioteca_iub (1)",
)
engine = create_engine(SQLALCHEMY_DATABASE_URL)

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
    estado = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())

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
    activo = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())

class Contratistas(Base):
    __tablename__ = "contratistas"
    
    ID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Editorial = Column(String(100), nullable=False)
    NIT = Column(Integer, nullable=False)
    estado = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())

class Proveer(Base):
    __tablename__ = "proveer"
    
    Libro_ID = Column(Integer, primary_key=True, index=True)
    Contratista_ID = Column(Integer, primary_key=True, index=True)
    estado = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())

class Dispositivo(Base):
    __tablename__ = "dispositivos"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(Enum("Tablet", "Computador", name="tipo_dispositivo"), nullable=False)
    marca = Column(String(100), nullable=False)
    modelo = Column(String(100), nullable=False)
    sede = Column(Enum("Soledad", "Barranquilla", "Colsamiro", name="tipo_sede"), nullable=False)
    estado = Column(Enum("Disponible", "Prestado", "Dañado", "En Mantenimiento", name="estado_dispositivo"), nullable=False, default="Disponible")
    observaciones = Column(String(255), nullable=True)
    activo = Column(Boolean, nullable=False, default=True, server_default="true")
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
    activo = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())


class Configuracion(Base):
    __tablename__ = "configuracion"

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(100), unique=True, nullable=False)
    valor = Column(String(255), nullable=True)
    descripcion = Column(String(255), nullable=True)
    estado = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, default=datetime.now, server_default=func.now())