# API Express — Biblioteca IUB

Servicio independiente para **Proveedores, Compras y Detalles de compra**.

## Responsabilidad

- FastAPI conserva usuarios, libros, préstamos, dispositivos, accesos QR, RBAC e IA.
- Express es el propietario de las escrituras del módulo de compras sobre
  `biblioteca_iub_compras`.
- Las rutas FastAPI existentes se mantienen durante la transición para no romper
  producción ni el contrato actual. Angular local se puede configurar para usar
  Express; producción continúa usando FastAPI hasta que exista una URL Express
  autorizada.

## Requisitos

- Node.js 20 o superior.
- MySQL/MariaDB local con las tablas de `docker/mysql-init/01-compras.sql`.
- `MM_JWT_SECRET` igual al secreto configurado para FastAPI, únicamente por
  variable de entorno.
- FastAPI local disponible para revalidar el rol en
  `/api/auth/introspect`.

## Ejecutar localmente

```powershell
cd express-api
npm install
$env:MM_JWT_SECRET = "<secreto-local-no-versionado>"
$env:MM_MYSQL_DATABASE = "biblioteca_iub_compras"
npm start
```

API: `http://127.0.0.1:4000`.

Health: `GET /health` y `GET /health/db`.

## Pruebas

Las pruebas usan exclusivamente `biblioteca_iub_compras_test`. El helper aborta
si `MM_MYSQL_DATABASE` no termina en `_test`.

```powershell
npm test
```

## Rutas

Se conservan los paths que consume el frontend actual:

- `/api/proveedores`
- `/api/compras`
- `/api/compras/:id/detalles`
- `/api/detalles/:id`

Todas las rutas de negocio requieren `Authorization: Bearer <JWT>` y roles
`Administrador` o `super_administrador`. Los DELETE actualizan `estado=0`; no
eliminan físicamente.

Antes de autorizar una operación, Express consulta FastAPI para confirmar el
rol vigente. Si FastAPI no está disponible, Express falla cerrado con 503; no
usa silenciosamente un rol obsoleto del JWT.

## Producción

No se despliega desde este cambio. Antes de usar Express en producción se debe
proveer un MySQL externo autorizado, una URL pública, CORS y variables de
entorno. Render/Neon no se modifican en esta fase.
