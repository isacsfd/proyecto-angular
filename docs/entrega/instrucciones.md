# INSTRUCCIONES DE INSTALACIÓN Y EJECUCIÓN — Biblioteca IUB (Entrega)

## 1. Requisitos
- Node ≥ 20, Python ≥ 3.11, Docker Desktop, PostgreSQL/Neon (nube o local), MySQL/XAMPP (compras) y MySQL Docker.
- Ollama + Open WebUI corriendo (para el componente IA en vivo).

## 2. Base de datos principal (PostgreSQL)
### Nube (producción de demostración)
- Neon: crear proyecto. Ejecutar los scripts: `Base de datos del proyecto/biblioteca_iub.sql`, `.../biblioteca_iub_postgres.sql` y (tras crear 5 usuarios demo) `Backend del proyecto/scripts/inserts_minimos.sql`.

### Local
- PostgreSQL: si usas el local `biblioteca_iub`, correr la primera base con `psql` con mismos scripts.
- Contenedor del proyecto: `docker compose up -d` (levantar MySQL de compras + carga `docker/mysql-init/01-compras.sql`).

## 3. Backend FastAPI (local)
```powershell
cd "Backend del proyecto"
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
# Variables de entorno (PowerShell): MM_DATABASE_URL='postgres://...' ; MM_JWT_SECRET='...'; MM_TOKEN_HORAS=8
uvicorn app:app --reload  # http://127.0.0.1:8000
```
## 4. Backend Express (local)
```powershell
cd express-api
npm ci
set EXPRESS_HOST=127.0.0.1
# Configurar `.env` según .env.example (MM_MYSQL_* de base compras local, MM_JWT_SECRET)
npm start  # http://127.0.0.1:4000/health
```
## 5. Frontend Angular (local)
```powershell
cd Frontend-Angular
npm ci
npm start  # http://127.0.0.1:4200
```
## 6. Producción (despliegue)
- FastAPI en Render: ya activo en https://biblioteca-iub-api.onrender.com (Blueprint `render.yaml`).
- Express en Render: servicio nuevo `biblioteca-iub-express` (ver `render.yaml` y `docs/entrega/enlaces.md`), con las variables/secrets descritos; MySQL de compras en la nube requiere autorización (§2 de `docs/entrega/enlaces.md`).
- Angular (Netlify/Vercel): subir `Frontend-Angular/dist/Frontend-Angular/browser/` (build ya hecho) o `npx vercel --prod`.

## 7. Componente IA en vivo
```powershell
ollama serve        # o el ícono Ollama en bandeja ya activo
docker exec -it iub-open-webui bash   # contenedor Open WebUI 1.14 con e5
# Modelo listo: llama3.2:1b (Ollama) + pipe documental 'biblioteca_iub_rag_guarda'
open http://127.0.0.1:3000
```
- En Telegram: bot @Biblioteca_IUB_BOT (env `TELEGRAM_BOT_TOKEN`, autorizados con lista, orquestador único: `services/ia/asistente.py`).
- Los scripts `sql` y estructuras: ver `Base de datos del proyecto/` e `informe_cierre_taller1_cyc.md`.

## 8. Pruebas
```powershell
cd "Backend del proyecto"
.\venv\Scripts\python.exe -m pytest tests -q     # 260/260 pruebs pasando al cierre
cd express-api && npm test
```
**Estado de video/eind:** los 4 archivos del diagrama de relaciones DB están en `docs/entrega/diagrama_bd/`.
