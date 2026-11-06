# Diccionario de Relaciones — Biblioteca IUB (PostgreSQL real)

Esquema verificado por lectura de `information_schema` (Neon). FK físicas = restricciones reales en la BD; FK lógicas = declaradas en el código pero sin restricción física; relación textual = campo de texto con correspondencia nominal.

| Entidad | PK | FK (columna -> tabla.ref) | Cardinalidad | Descripción |
|---|---|---|---|---|
| **rol** | id | — | — | Catálogo de roles del sistema (RBAC). |
| **usuario** | id | rol_id -> rol.id | N — 1 rol | Usuarios institucionales con rol y sede. |
| **modulos** | id | — | — | Catálogo de módulos/rutas accesibles desde el menú. |
| **modulos_X_rol** | modulo_id, rol_id | rol_id -> rol.id, modulo_id -> modulos.id | relación N:M rol↔modulos (PK compuesta) | Asignación rol↔módulo (tabla puente; PK compuesta). |
| **library_access** | id | —; user_id -> usuario.id (lógica) | N — 1 usuario (FK lógica) | Registro de accesos a la biblioteca (QR). |
| **dispositivos** | id | — | — | Inventario de tablets/computadores. |
| **prestamos_dispositivos** | id | user_id -> usuario.id; dispositivo_id -> dispositivos.id (lógica) | N — 1 usuario (FK física) · N — 1 dispositivos (FK lógica) | Préstamos de dispositivos. |
| **configuracion** | id | — | — | Parámetros clave/valor del sistema. |
| **libros** | ID | —; Proveedor -> contratistas.Editorial (textual) | — | Catálogo de libros con inventario (Ejemplar) y sede. |
| **prestamos** | id | user_id -> usuario.id; book_id -> libros.ID (lógica) | N — 1 usuario · N — 1 libros (book_id lógica) | Préstamos de libros con estado y aprobación. |
| **contratistas** | ID | — | — | Proveedores/compañías editoriales (compras). |
| **proveer** | Contratista_ID, Libro_ID | Libro_ID -> libros.ID, Contratista_ID -> contratistas.ID | N:M libros ↔ contratistas (FK físicas) | Puente libros↔contratistas (N:M, PK compuesta). |

## Cardinalidades principales
- usuario N — 1 rol (FK usuario.rol_id -> rol.id, física).
- modulos_X_rol N — 1 rol / N — 1 modulos (FK físicas; PK compuesta = relación N:M rol↔módulos).
- prestamos N — 1 usuario (FK física prestamos.user_id).
- prestamos_dispositivos N — 1 usuario (FK física); prestamos_dispositivos N — 1 dispositivos (FK lógica sin restricción).
- prestamos N — 1 libros (FK lógica `book_id`, sin restricción física).
- proveer es la tabla puente libros (N) — contratistas (M) con FK físicas a ambas (PK compuesta).
- library_access N — 1 usuario (FK lógica sin restricción física).
- libros.Proveedor -> contratistas.Editorial (relación textual, sin FK).

## Diferencias MySQL (Express/compras) y PostgreSQL (Biblioteca)
- El esquema dibujado corresponde a la BD real del proyecto en PostgreSQL (Neon).
- Express usa un esquema de compras independiente (MySQL, `docker/mysql-init/01-compras.sql`: proveedores, compras, detalles_compra) que aún no está desplegado en la nube; no forma parte del diagrama principal para no mezclar estructuras incompatibles.

(Diagrama generado a partir del esquema real; sin modificaciones de datos ni esquema.)