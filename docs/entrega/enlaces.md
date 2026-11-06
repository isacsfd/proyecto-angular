# ENLACES DE DESPLIEGUE — Biblioteca IUB (Taller 1 Corte 2)

> Actualizar los valores `<...>` tras ejecutar cada despliegue (ver instrucciones abajo).

| Componente | Enlace | Herramienta | Estado |
|---|---|---|---|
| Frontend Angular (nube) | `<URL_NETLIFY/VERCEL>` | Netlify Drop / Vercel | Listo para publicar (dist/ compilado) |
| API FastAPI (nube) | https://biblioteca-iub-api.onrender.com | Render (existente) | ✅ ACTIVO (GET / → 200) |
| API Express (nube) | `<URL_RENDER_EXPRESS>` | Render (servicio nuevo) | Pendiente (ver instrucciones §2) |
| Base de datos PostgreSQL (nube) | Neon (`MM_DATABASE_URL`) | Neon | ✅ ACTIVA (12 tablas, 15 usuarios, 693 libros) |
| Base de datos MySQL compras (nube) | `<MYSQL_HOST_CLOUD>` | Aiven FreeDB / Render PostgreSQL alternativo | Pendiente de autorización (§2.3) |
| Base de datos local | PostgreSQL local (`biblioteca_iub`) / MySQL Docker (`iub-mysql`) | pg + docker-compose | ✅ |
| Repositorio de descarga | `<ZIP_DRIVE_URL>` | OneDrive/Drive | Pendiente comprimir |
| Video de demostración | `<VIDEO_URL>` | Grabar hoy con guion `guion_video.md` | Pendiente |
| Diagrama de la BD (estilo Access) | `diagrama_bd/` (PNG/PDF/draw.io) | Generado | ✅ |

## 1) Publicar Angular (5-10 min)
1. Compilado listo: `Frontend-Angular/dist/Frontend-Angular/browser/` (prod: 3.3 MB, API en Render ya configurada en `environment.production.ts`).
2. Netlify Drop: ir a `app.netlify.com/drop` y arrastrar la carpeta `browser/` → obtener URL y pegarla arriba.
   (Alternativa Vercel: `npx vercel --prod` desde `Frontend-Angular/` con `--directory dist/Frontend-Angular/browser`).

## 2) Publicar Express en Render (10-15 min — Without touching FastAPI nor Neon)
1. Repo conectado: Render → New → Blueprint → este repositorio (rama entrega) y elegir únicamente el servicio `biblioteca-iub-express` (render.yaml ya lo declara), o "New Web Service" manual:
   - Runtime: Node · Root Directory: `express-api` · Build: `npm ci --omit=dev` · Start: `npm start` · Health: `/health`
2. En "Environment" crear los secretos listados en `render.yaml` (MM_JWT_SECRET = el mismo de FastAPI; MM_MYSQL_* de la BD compras; EXPRESS_CORS_ORIGINS = URL del frontend publicado).
3. **Base de datos compras en la nube — REQUIERE AUTORIZACIÓN** (regla del proyecto: no modificar Neon o DB prod sin permiso). Opciones:
   a) Aiven for MySQL (plan free): crear servicio `biblioteca-iub-compras` y ejecutar `docker/mysql-init/01-compras.sql` + inserts.
   b) Postgres de Neon: crear NUEVA base de datos `biblioteca_iub_compras` dentro del proyecto Neon (permite CREATE DATABASE) y ejecutar los scripts adaptados a Postgres.
   c) Mantener demo corrida localmente (Docker MySQL `iub-mysql`) y explicarlo en el video.
4. Al crear el servicio: pegar la URL `https://biblioteca-iub-express.onrender.com` arriba y reflejar en `EXPRESS_CORS_ORIGINS` del frontend host.
## 3) Publicar FastAPI (ya desplegado)
URL activa. Si toca redeploy THEM: Render → servicio `biblioteca-iub-api` → Manual Deploy (sin cambios de código requeridos).
