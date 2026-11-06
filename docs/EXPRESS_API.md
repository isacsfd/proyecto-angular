# Diseño y transición FastAPI → Express

## Alcance de esta fase

Express se añade como API independiente para el módulo de Proveedores,
Compras y Detalles de compra. No se elimina ni modifica la implementación
existente de `Backend del proyecto/routers/compras_router.py`.

## Fuente de escritura

Durante la transición:

1. Las rutas FastAPI existentes siguen disponibles para compatibilidad.
2. La nueva integración local de Angular apunta a Express cuando
   `environment.expressApiUrl` está configurada.
3. No se ejecutan escrituras desde ambas APIs para una misma operación del
   frontend: el Angular local usa Express para este módulo.
4. La URL de producción mantiene fallback a FastAPI hasta que Express tenga
   hosting y aprobación para desplegar.

## JWT compartido

Express valida el JWT emitido por FastAPI usando `MM_JWT_SECRET`,
`MM_JWT_ISSUER` y `MM_JWT_AUDIENCE` si están definidos. No existe un login
duplicado en Express. Los roles permitidos son `Administrador` y
`super_administrador`.

Express llama a `GET /api/auth/introspect` de FastAPI en cada operación de
negocio. FastAPI revalida el usuario y el rol contra su BD. Si el usuario fue
degradado, Express responde 403 inmediatamente; si FastAPI no está disponible,
la operación falla cerrado con 503. No se toca Neon desde Express.

## Compatibilidad Angular

- Desarrollo: `expressApiUrl` apunta a `http://127.0.0.1:4000`.
- Producción: `expressApiUrl` queda vacío y el servicio conserva el fallback a
  `apiUrl` (Render/FastAPI).
- El interceptor adjunta el JWT a ambos orígenes configurados.

## Esquema MySQL

Express usa las tablas existentes `proveedores`, `compras` y `detalle_compra`.
No ejecuta migraciones automáticas ni modifica el esquema. Las pruebas se
ejecutan contra `biblioteca_iub_compras_test`.
