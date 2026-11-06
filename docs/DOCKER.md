# Docker — Biblioteca IUB

Contenedores para ejecutar el sistema completo en local:

- **`mysql`** — MySQL 8 con el esquema de Proveedores/Compras/Detalles (`docker/mysql-init/01-compras.sql`).
- **`backend`** — FastAPI (uvicorn) en `http://localhost:8000`; la base principal es PostgreSQL/Neon vía `MM_DATABASE_URL`.
- **`frontend`** — Angular compilado y servido con nginx en `http://localhost:8080` (la URL de la API se incrusta en el build con `API_URL`).

## Requisitos
- Docker Desktop / Docker Engine con Compose v2.
- Una cadena de conexión a PostgreSQL (Neon) para `MM_DATABASE_URL`.

## Puesta en marcha
```bash
# 1) Crear el archivo de variables (no se versiona)
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env

# 2) Editar .env y completar:
#    MM_DATABASE_URL  -> cadena PostgreSQL/Neon
#    MM_JWT_SECRET    -> cadena aleatoria larga
#    (MySQL del contenedor usa los valores por defecto: iub/iubpass, DB biblioteca_iub_compras)

# 3) Construir y levantar
docker compose up --build
```

## Accesos
| Servicio | URL |
|---|---|
| Frontend (nginx) | http://localhost:8080 |
| Backend / Swagger | http://localhost:8000/docs |
| Health backend | http://localhost:8000/ |
| MySQL (host) | `localhost:3307` (usuario `iub`, DB `biblioteca_iub_compras`) |

> El puerto **3307** se usa en el host para no chocar con un MySQL/XAMPP local en 3306. Desde el backend, el host de MySQL es `mysql:3306` (red interna de Compose).

## Notas
- El esquema MySQL se crea **solo la primera vez** (volumen `mysql_data`). Para recrearlo desde cero: `docker compose down -v` (⚠️ borra los datos del volumen de MySQL del contenedor).
- La base principal **no se contenedoriza** (sigue siendo Neon/PostgreSQL externo). Para usar un PostgreSQL local, añade un servicio `postgres` y ajusta `MM_DATABASE_URL`.
- No hay secretos en las imágenes: todo se inyecta por variables de entorno (`.env`).
- Usuarios: si la base principal está vacía, crea el super administrador con `Backend del proyecto/scripts/bootstrap_super_admin.py` (fuera del contenedor o con `docker compose exec backend python scripts/bootstrap_super_admin.py` definiendo las variables `SUPERADMIN_*`).

## Comandos útiles
```bash
docker compose up --build -d     # levantar en segundo plano
docker compose logs -f backend   # ver logs del backend
docker compose ps                # estado de servicios
docker compose down              # detener (conserva el volumen de MySQL)
```
