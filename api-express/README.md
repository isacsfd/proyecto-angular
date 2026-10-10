# API Express + MySQL — Biblioteca IUB

API REST **independiente** (Node.js + Express + MySQL) para la gestión de **proveedores y compras** de la Biblioteca IUB.
Corresponde al **Requisito 2 (Express + MySQL, 15%)** del parcial. **No reemplaza** ni modifica la API FastAPI ni el frontend Angular del proyecto.

---

## 1. Requisitos

- **Node.js** ≥ 18 (probado con Node 24).
- **MySQL / MariaDB** accesible.
- npm.

## 2. Instalación

```bash
cd api-express
npm install
```

## 3. Variables de entorno

Copia `.env.example` a `.env` y ajusta los valores:

```bash
cp .env.example .env    # Windows PowerShell: Copy-Item .env.example .env
```

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto de la API | `3001` |
| `DB_HOST` | Host MySQL | `127.0.0.1` |
| `DB_PORT` | Puerto MySQL | `3306` |
| `DB_USER` | Usuario MySQL | `root` |
| `DB_PASSWORD` | Contraseña MySQL | `********` |
| `DB_DATABASE` | Base de datos | `biblioteca_iub_compras` |
| `DB_POOL_LIMIT` | Conexiones en el pool | `10` |
| `CORS_ORIGINS` | Orígenes permitidos (coma) o `*` | `http://localhost:4200` |

> `.env` está excluido en `.gitignore`. **Nunca** subas credenciales reales al repositorio.

## 4. Creación de la base de datos y tablas

```bash
npm run db:init
```

Crea la base `biblioteca_iub_compras` y las 3 tablas (idempotente, `CREATE ... IF NOT EXISTS`).
El esquema completo está en [`src/schema.sql`](src/schema.sql).

## 5. Ejecución local

```bash
npm start        # producción
npm run dev      # desarrollo (reinicio automático)
```

Health check: `GET http://localhost:3001/health`

## 6. Endpoints

Base: `http://localhost:3001`. Todas las respuestas son JSON. `estado` (1 = activo, 0 = inactivo).
El `DELETE` es **borrado lógico** (cambia `estado` a 0).

### Proveedores

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/proveedores` | Lista proveedores activos |
| GET | `/api/proveedores/:id` | Un proveedor activo |
| POST | `/api/proveedores` | Crea proveedor |
| PUT | `/api/proveedores/:id` | Actualiza |
| DELETE | `/api/proveedores/:id` | Borrado lógico |

**POST ejemplo**
```bash
curl -X POST http://localhost:3001/api/proveedores \
  -H "Content-Type: application/json" \
  -d '{"razon_social":"Alfa Editorial S.A.S.","nit":"900123456","email":"ventas@alfa.com","telefono":"3001234567","direccion":"Cra 8 #30-10"}'
```

### Compras

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/compras` | Lista compras activas (con proveedor) |
| GET | `/api/compras/:id` | Una compra |
| POST | `/api/compras` | Crea compra |
| PUT | `/api/compras/:id` | Actualiza |
| DELETE | `/api/compras/:id` | Borrado lógico |

**POST ejemplo**
```bash
curl -X POST http://localhost:3001/api/compras \
  -H "Content-Type: application/json" \
  -d '{"proveedor_id":1,"numero_factura":"FAC-001","total":250000}'
```

### Detalle de compra

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/compras/:compraId/detalles` | Detalles activos de una compra |
| POST | `/api/compras/:compraId/detalles` | Añade detalle |
| GET | `/api/detalles/:id` | Un detalle |
| PUT | `/api/detalles/:id` | Actualiza |
| DELETE | `/api/detalles/:id` | Borrado lógico |

**POST ejemplo**
```bash
curl -X POST http://localhost:3001/api/compras/1/detalles \
  -H "Content-Type: application/json" \
  -d '{"descripcion":"Caja de libros","cantidad":5,"precio_unitario":50000}'
```

### Health

```bash
curl http://localhost:3001/health
# {"estado":"ok","servicio":"biblioteca-iub-api-express","time":"..."}
```

### Códigos HTTP
`200` OK · `201` creado · `400` validación / referencia inválida · `404` no encontrado · `403` CORS · `409` duplicado (UNIQUE) · `500` error interno · `503` BD no disponible.

## 7. Seguridad

- **Consultas parametrizadas** (`?`) en todas las operaciones → previene inyección SQL.
- **Validación** de campos (`razon_social`, `nit`, `email`, `cantidad`, `total`, etc.).
- **CORS** configurado por `CORS_ORIGINS`.
- Credenciales **solo** por variables de entorno.

## 8. Pruebas automatizadas

```bash
npm test
```

Usa el runner integrado de Node (`node:test`) contra una base **aislada** `biblioteca_iub_compras_test`
(se crea y se elimina automáticamente; no afecta datos reales).

## 9. Despliegue en la nube (pendiente)

Para desplegar la API en un servicio de nube (Render, Railway, Fly.io, etc.):

1. Crear una base MySQL gestionada (PlanetScale, Railway MySQL, Aiven, Clever Cloud…).
2. Definir las variables de entorno del punto 3 en el panel del proveedor
   (incluyendo `DB_*` de la base en la nube y `CORS_ORIGINS` con el dominio del frontend).
3. Comando de arranque: `npm start` (o `node src/server.js`).
4. Ejecutar `npm run db:init` una vez (o aplicar `src/schema.sql`) contra la base en la nube.
5. Verificar `GET /health` público.

> Requisito aún **no cumplido**: la API funciona localmente; falta publicarla y registrar la URL.

## 10. Estructura

```
api-express/
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── src/
    ├── app.js          # App Express (CORS, rutas, /health, manejo de errores)
    ├── server.js       # Arranque
    ├── config.js       # Config por variables de entorno
    ├── db.js           # Pool MySQL + ping
    ├── errores.js      # AppError + validaciones + error handler
    ├── crear_bd.js     # npm run db:init (crea BD y tablas)
    ├── schema.sql      # Esquema (3 tablas)
    └── routes/
        ├── proveedores.js
        ├── compras.js
        └── detalles.js
└── test/
    ├── setup-env.js    # Usa la BD de pruebas
    └── api.test.js     # 18 pruebas (node:test)
```