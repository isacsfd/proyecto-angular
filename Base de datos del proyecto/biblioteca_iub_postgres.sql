-- ============================================================================
-- BIBLIOTECA IUB — Esquema PostgreSQL (12 tablas) — Backend
-- ============================================================================
-- Motor objetivo: PostgreSQL (el backend se conecta vía
--   MM_DATABASE_URL=postgresql+psycopg2://usuario:clave@host:5432/biblioteca_iub
-- )
-- Incluye el RBAC: rol, usuario, modulos, modulos_X_rol.
-- NO incluye usuarios con contraseñas: el super administrador se crea con
-- scripts/bootstrap_super_admin.py (bcrypt) en tiempo de ejecución.

BEGIN;

-- ============================ ENUMS =========================================
DO $$ BEGIN
    CREATE TYPE tipo_rol AS ENUM ('super_administrador','Administrador','Funcionario','Docente','Estudiante');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_sede AS ENUM ('Soledad','Barranquilla','Colsamiro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_dispositivo AS ENUM ('Tablet','Computador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_dispositivo AS ENUM ('Disponible','Prestado','Dañado','En Mantenimiento');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_prestamo AS ENUM ('Activo','Vencido','Devuelto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_solicitud AS ENUM ('No Aprobado','Aprobado','Rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_prestamo_dispositivo AS ENUM ('Pendiente','Activo','Completado','Dañado','Rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================ RBAC ==========================================
CREATE TABLE IF NOT EXISTS rol (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(50) UNIQUE NOT NULL,
    descripcion VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS modulos (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(50) UNIQUE NOT NULL,
    ruta        VARCHAR(100),
    descripcion VARCHAR(255),
    orden       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS modulos_X_rol (
    rol_id    INTEGER NOT NULL REFERENCES rol(id) ON DELETE CASCADE,
    modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, modulo_id)
);

CREATE TABLE IF NOT EXISTS usuario (
    id                SERIAL PRIMARY KEY,
    nombre            VARCHAR(100) NOT NULL,
    username          VARCHAR(50) UNIQUE,
    email             VARCHAR(100) UNIQUE,
    phone             VARCHAR(50) NOT NULL,
    address           VARCHAR(255) NOT NULL,
    rol_id            INTEGER NOT NULL REFERENCES rol(id),
    password          VARCHAR(255) NOT NULL,
    identificacion    VARCHAR(50) UNIQUE,
    nivel_academico   VARCHAR(50),
    carrera           VARCHAR(100),
    sede              tipo_sede DEFAULT 'Soledad'
);
CREATE INDEX IF NOT EXISTS idx_usuario_rol ON usuario(rol_id);

-- ============================ DOMINIO ========================================
CREATE TABLE IF NOT EXISTS libros (
    "ID"               SERIAL PRIMARY KEY,
    "Autor"            VARCHAR(255) NOT NULL,
    "Titulo"           VARCHAR(255) NOT NULL,
    "Programa"         VARCHAR(100) NOT NULL,
    "Item"             INTEGER NOT NULL,
    "Signatura"        VARCHAR(50) NOT NULL UNIQUE,
    "Areas"            INTEGER NOT NULL,
    "Ejemplar"         INTEGER NOT NULL,
    "Editorial"        VARCHAR(100) NOT NULL,
    "Año"              INTEGER NOT NULL,
    "Idioma"           VARCHAR(50) NOT NULL,
    sede               VARCHAR(20) NOT NULL DEFAULT 'Soledad' CHECK (sede IN ('Soledad','Barranquilla','Colsamiro')),
    "Observaciones"    VARCHAR(50),
    "Precio"           VARCHAR(50),
    "Proveedor"        VARCHAR(100),
    "Registro_en_linea" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS prestamos (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    book_id         VARCHAR(50) NOT NULL,
    loan_date       TIMESTAMP NOT NULL,
    delivery_date   TIMESTAMP NOT NULL,
    entry_date      TIMESTAMP,
    state           estado_prestamo NOT NULL,
    prestamo_state  estado_solicitud NOT NULL DEFAULT 'No Aprobado',
    observations    VARCHAR(250),
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispositivos (
    id            SERIAL PRIMARY KEY,
    tipo          tipo_dispositivo NOT NULL,
    marca         VARCHAR(100) NOT NULL,
    modelo        VARCHAR(100) NOT NULL,
    sede          tipo_sede NOT NULL,
    estado        estado_dispositivo NOT NULL DEFAULT 'Disponible',
    observaciones VARCHAR(255),
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prestamos_dispositivos (
    id                SERIAL PRIMARY KEY,
    dispositivo_id    INTEGER NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
    user_id           INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    fecha_prestamo    TIMESTAMP NOT NULL,
    fecha_devolucion  TIMESTAMP,
    estado            estado_prestamo_dispositivo NOT NULL DEFAULT 'Pendiente',
    observaciones     VARCHAR(255),
    created_at        TIMESTAMP NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS library_access (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    message    VARCHAR(255) NOT NULL,
    status     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contratistas (
    "ID"       SERIAL PRIMARY KEY,
    "Editorial" VARCHAR(100) NOT NULL,
    "NIT"      INTEGER
);

CREATE TABLE IF NOT EXISTS proveer (
    "Libro_ID"       INTEGER NOT NULL REFERENCES libros("ID") ON DELETE CASCADE,
    "Contratista_ID" INTEGER NOT NULL REFERENCES contratistas("ID") ON DELETE CASCADE,
    PRIMARY KEY ("Libro_ID", "Contratista_ID")
);

CREATE TABLE IF NOT EXISTS configuracion (
    id          SERIAL PRIMARY KEY,
    clave       VARCHAR(100) UNIQUE NOT NULL,
    valor       VARCHAR(255),
    descripcion VARCHAR(255)
);

-- ============================ SEED RBAC =====================================
INSERT INTO rol (nombre, descripcion) VALUES
    ('super_administrador', 'Super administrador del sistema'),
    ('Administrador', 'Administrador de la biblioteca'),
    ('Funcionario', 'Funcionario de la biblioteca'),
    ('Docente', 'Docente'),
    ('Estudiante', 'Estudiante')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO modulos (nombre, ruta, descripcion, orden) VALUES
    ('login', '/login', 'Autenticación', 1),
    ('inicio', '/inicio', 'Inicio del usuario', 2),
    ('catalogo', '/inicio/catalogo', 'Catálogo y búsqueda con IA', 3),
    ('mis_prestamos', '/inicio/mis-prestamos', 'Mis préstamos', 4),
    ('dispositivos', '/inicio/dispositivos', 'Solicitar dispositivos', 5),
    ('chatbot', '/', 'Asistente virtual', 6),
    ('dashboard', '/admin', 'Panel de control', 7),
    ('gestion_usuarios', '/admin/usuarios', 'Gestión de usuarios', 8),
    ('gestion_libros', '/admin/libros', 'Gestión de libros', 9),
    ('gestion_dispositivos', '/admin/dispositivos', 'Gestión de dispositivos', 10),
    ('gestion_prestamos', '/admin/prestamos', 'Gestión de préstamos', 11),
    ('estadisticas', '/admin/estadisticas', 'Estadísticas', 12),
    ('ingresos', '/admin/ingresos', 'Registro de ingresos QR', 13)
ON CONFLICT (nombre) DO NOTHING;

-- Matriz de permisos: super y admin acceden a todo; docente/estudiante a lo suyo.
INSERT INTO modulos_X_rol (rol_id, modulo_id)
SELECT r.id, m.id FROM rol r JOIN modulos m ON true
WHERE r.nombre IN ('super_administrador','Administrador','Funcionario')
ON CONFLICT DO NOTHING;

INSERT INTO modulos_X_rol (rol_id, modulo_id)
SELECT r.id, m.id FROM rol r JOIN modulos m ON m.nombre IN ('login','inicio','catalogo','mis_prestamos','dispositivos','chatbot')
WHERE r.nombre IN ('Docente','Estudiante')
ON CONFLICT DO NOTHING;

-- Configuración por defecto
INSERT INTO configuracion (clave, valor, descripcion) VALUES
    ('catalogo.moneda', 'COP', 'Moneda del catálogo'),
    ('biblioteca.hora_apertura', '08:00', 'Hora de apertura del servicio de préstamo'),
    ('biblioteca.hora_cierre', '20:00', 'Hora de cierre del servicio de préstamo'),
    ('prestamo.libros_min_dias', '4', 'Plazo mínimo de préstamo de libros (días)'),
    ('prestamo.libros_max_dias', '6', 'Plazo máximo de préstamo de libros (días)'),
    ('prestamo.dispositivos_max_horas', '2', 'Franja máxima de préstamo de dispositivos (horas)')
ON CONFLICT (clave) DO NOTHING;

COMMIT;
-- ============================================================================
-- Total: 12 tablas (rol, usuario, modulos, modulos_X_rol, libros, prestamos,
--         dispositivos, prestamos_dispositivos, library_access, contratistas,
--         proveer, configuracion)
-- ============================================================================