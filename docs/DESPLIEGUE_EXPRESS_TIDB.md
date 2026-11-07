# Despliegue gratuito de Express + MySQL (TiDB Cloud Starter)

Alternativa 100% gratuita (sin tarjeta) que conserva la arquitectura exigida:
**Express obligatorio** (Render Free) + **base de datos MySQL-compatible** (TiDB
Cloud Starter) + JWT compartido con FastAPI (Render Free, sin cambios).

```
Angular (Netlify)  ──Bearer──►  Express (Render Free)  ──TLS 4000──►  TiDB Cloud Starter
                                      │
                                      └──introspección►  FastAPI (Render Free, intacto)
```

Backups: TiDB Starter free retiene sus backups automáticos solo **1 día**;
el respaldo durable es el workflow `backup-compras` (GitHub Actions, 30 días).

---

## A. Crear la instancia TiDB (en el panel, lo hace el usuario)

1. Entra con GitHub/Google en <https://tidbcloud.com> (no pide tarjeta).
2. **New Cluster → TiDB Cloud Starter** (modo *MySQL-compatible*), región
   Oregon `us-west-2` (misma zona horaria aproximada que Render oregon) y
   nombre `biblioteca-iub-compras`.
3. Desde la página del clúster: **Connect**. Anota (no reportar en el repo):
   - `TIDB_HOST`: p. ej. `gateway01.us-west-2.prod.aws.tidbcloud.com`
   - `TIDB_PORT`: `4000`
   - `TIDB_USER`: usuario con prefijo, p. ej. `xxxxx.root`
   - `TIDB_PASSWORD`: la que configures
   - **Certificado CA de TiDB** (p. ej. `tidb-ca.pem`) descargado del panel.

## B. Inicializar la base de datos (una sola vez)

Con el cliente `mysql` en cualquier máquina (o el **Web SQL editor** del panel):

```bash
mysql --host=$TIDB_HOST --port=4000 --user='<prefix>.root' -p \
      --ssl-mode=VERIFY_IDENTITY --ssl-ca=tidb-ca.pem
```

```sql
CREATE DATABASE IF NOT EXISTS biblioteca_iub_compras
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE biblioteca_iub_compras;
-- pegar/establecer el contenido completo de docker/mysql-init/01-compras.sql
SHOW TABLES;
SHOW CREATE TABLE compras;
```

Verificación obligatoria tras ejecutar el DDL:

1. `SHOW TABLES` devuelve 3: `proveedores`, `compras`, `detalle_compra`.
2. `SHOW CREATE TABLE compras` incluye `CONSTRAINT fk_compras_proveedor`
   (`ON DELETE RESTRICT`) y `uq_compras_numero_factura`.
3. `SHOW CREATE TABLE detalle_compra` incluye `fk_detalle_compra`
   (`ON DELETE CASCADE`).
4. `SELECT @@foreign_key_checks;` = `1`.

Compatibilidad del DDL con TiDB (verificación estática): `CREATE TABLE IF NOT
EXISTS`, `AUTO_INCREMENT`, `UNIQUE`, FK con `RESTRICT`/`CASCADE`,
`DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`, `TINYINT(1)`
y `ENGINE=InnoDB` (cláusula aceptada/ignorada) son sintaxis MySQL 5.7/8.0 que
TiDB soporta. Si TiDB rechazara alguna cláusula (poco probable), se reporta el
error exacto y se decide; NO se elimina ninguna restricción sin demostrar la
incompatibilidad.

## C. Variables del web service `biblioteca-iub-express` (panel Render)

Crear el servicio en Render con: repositorio `isacsfd/proyecto-angular`,
**Branch `deploy/fastapi-express-production`**, `rootDir: express-api`,
build `npm ci --omit=dev`, start `npm start`, health `/health` (el blueprint
`render.yaml` ya lo define; COVID: completar solo las `sync: false`):

| Variable | Valor a introducir en el panel |
|---|---|
| `MM_JWT_SECRET` | el MISMO string del servicio FastAPI (copiar desde su panel Environment; no regenerar) |
| `MM_JWT_AUDIENCE` | el mismo valor que FastAPI (si FastAPI no lo define, dejarlo vacío; ni issuer ni audience están en uso) |
| `EXPRESS_CORS_ORIGINS` | `https://kaleidoscopic-kheer-863249.netlify.app,http://localhost:4200,http://127.0.0.1:4200` |
| `MM_MYSQL_HOST` | `TIDB_HOST` del paso A |
| `MM_MYSQL_USER` | `TIDB_USER` del paso A (con su prefijo) |
| `MM_MYSQL_PASSWORD` | `TIDB_PASSWORD` del paso A |
| `MM_MYSQL_SSL_CA` | contenido del CA de TiDB, en UNA sola línea con `\n` (el código normaliza a saltos reales) |

Ya prefijadas por `render.yaml` (no tocar): `MM_MYSQL_PORT=4000`,
`MM_MYSQL_DATABASE=biblioteca_iub_compras`,
`FASTAPI_INTROSPECTION_URL=https://biblioteca-iub-api.onrender.com/api/auth/introspect`,
`FASTAPI_INTROSPECTION_TIMEOUT_MS=2500`, rate limit `120` req/60 s.

TLS: `db.js` activa `ssl: { minVersion: TLSv1.2, rejectUnauthorized: true, ca }`
solo cuando `MM_MYSQL_SSL_CA` está presente; con MySQL local sigue conectando
sin TLS (la suite `_test` no cambia).

## D. GitHub Secrets del backup programado

En *Settings → Secrets and variables → Actions* del repo, igual a las del paso A:

`TIDB_HOST`, `TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE`,
`TIDB_SSL_CA` (misma CA con `\n` escapado).

Primer arranque: pestaña **Actions → backup-compras → Run workflow**. Después
corre solo a diario (05:00 UTC). Guarda un artefacto
`backup-compras-<run-id>` con retención de 30 días; los dumps no tocan Git.

## E. Checklist de activación post-despliegue

1. `GET https://<express-url>/health` → 200 `{"status":"ok"}`.
2. `GET /health/db` → 200 `{"database":"ok"}`.
3. Login real → `GET /api/proveedores` con Bearer Administrador → 200; con
   Estudiante → 403.
4. CRUD de compras vía Angular (Administrador) y total exacto.
5. Primer run del workflow de backup.

Nota del plan Free: la primera petición tras ~15 min sin tráfico puede tardar
~50 s (spin-down); aceptado por diseño en la alternativa gratuita.
