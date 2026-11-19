# Tablero en Power BI — Biblioteca IUB (Parcial Corte 2)

> **Estado del entregable: COMPLETO.** El requisito «Tablero en Power BI» está
> cubierto con archivo editable `.pbix`:
> **[`powerbi/entrega/TableroBibliotecaIUB.pbix`](../powerbi/entrega/TableroBibliotecaIUB.pbix)**
> (112 KB), que **contiene los datos reales cargados**. Cómo se produjo: el
> proyecto se compiló a `.pbit` con pbi-tools, **Power BI Desktop 2.159 lo
> abrió, cargó las tablas reales (Libros 693, Dispositivos 18, préstamos 8/25,
> Ingresos 29, Usuarios 11, Sedes 3) y renderizó la página del reporte** con
> las 5 tarjetas, los 6 gráficos y el filtro por sede; desde esa sesión se
> guardó como `.pbix` con *Archivo → Guardar como*. El `.pbit` se conserva
> como artefacto maestro editable del proyecto (mismo contenido). Evidencias en
> [Validaciones](#9-validaciones-realizadas); guía de uso y actualización en
> las secciones siguientes.

---

## 1. Fuente de datos

Datos **reales** capturados de la API desplegada en Render
(`https://biblioteca-iub-api.onrender.com`) con la sesión de
`super_administrador` (sede `Soledad`) desde el navegador. El JWT nunca salió
de la página: los JSON se descargaron desde la propia sesión y luego se
anonimizaron.

| Endpoint | Tabla del modelo | Filas |
|---|---|---|
| `GET /libros/` | `Libros` | 693 |
| `GET /dispositivos/` | `Dispositivos` | 18 |
| `GET /loan/` | `PrestamosLibros` | 8 |
| `GET /prestamos-dispositivos/` | `PrestamosDispositivos` | 25 |
| `GET /api/library-access/` | `Ingresos` | 29 |
| `GET /usuarios/` (agregado) | `Usuarios` | 11 filas agregadas (15 usuarios) |
| `services/rbac.py` → `SEDES_VALIDAS` | `Sedes` | 3 |

Cadena de datos (reproducible):

```
API (Render) ──JWT──▶ JSON del navegador ──▶ powerbi/datos/fuente/datos_powerbi.json
                     (anonimizado en la página, sin PII)
      └─▶ powerbi/herramientas/generar_datos.py ──▶ powerbi/datos/*.csv + manifiesto.json
              └─▶ powerbi/herramientas/construir_proyecto.py ──▶ powerbi/TableroBibliotecaIUB/ (proyecto PbixProj)
                       └─▶ pbi-tools compile ──▶ powerbi/entrega/TableroBibliotecaIUB.pbit
                                └─▶ Power BI Desktop (abrir + Guardar como)
                                       └─▶ powerbi/entrega/TableroBibliotecaIUB.pbix  ← ENTREGABLE FINAL
```

- Instantánea original: `powerbi/datos/fuente/datos_powerbi.json`
  (capturada `2026-11-19T00:16:12Z`, 170 157 bytes; hash en `manifiesto.json`).
- Cada CSV lleva su número de filas y SHA-256 en `powerbi/datos/manifiesto.json`.
- Sedes según RBAC (`Backend del proyecto/services/rbac.py`):
  `Soledad`, `Barranquilla`, `Colsamiro`. Todos los libros, préstamos e
  ingresos registrados son de `Soledad`; solo `Dispositivos` se reparte entre
  las tres sedes (8 / 5 / 5) — así lo muestra el gráfico «Dispositivos por sede».

## 2. Privacidad (sin datos personales)

El tablero **no contiene** nombres, cédulas, correos, teléfonos, direcciones,
`user_id` ni `user_name`:

- `Libros` se exportó **sin** la columna `Autor`.
- `Ingresos` (endpoint `/api/library-access/`, que sí trae identificación)
  se exportó solo con `Fecha`, `Estado`, `Sede`.
- `Usuarios` solo se carga **agregado** por `Sede` + `Rol` + `Carrera` +
  `Nivel` + `Cantidad`.
- `powerbi/herramientas/validar_entregables.py` comprueba automáticamente
  que ningún CSV contenga columnas prohibidas
  (`nombre, user_id, user_name, identificacion, email, phone, address, password`).

## 3. Modelo tabular (7 tablas, 6 relaciones, 16 medidas)

Generado en formato PbixProj/TMSL (`powerbi/TableroBibliotecaIUB/`) y compilado
con **pbi-tools 1.2.0 (Core)** a `.pbit`. Nivel de compatibilidad 1550,
`powerBI_V3`, referencia cultural `es-ES`.

**Relaciones** (todas Many-to-One hacia la dimensión de filtro):

```
Libros[Sede]                 ──▶ Sedes[Sede]
Dispositivos[Sede]           ──▶ Sedes[Sede]
PrestamosLibros[Sede]        ──▶ Sedes[Sede]
PrestamosDispositivos[Sede]  ──▶ Sedes[Sede]
Ingresos[Sede]               ──▶ Sedes[Sede]
Usuarios[Sede]               ──▶ Sedes[Sede]
```

**Medidas DAX (≥ 4 requeridas; 16 entregadas):**

| Tabla | Medida | DAX |
|---|---|---|
| Libros | Total Libros | `COUNTROWS ( Libros )` |
| Libros | Total Ejemplares | `SUM ( Libros[Ejemplar] )` |
| Libros | Programas con Acervo | `CALCULATE ( DISTINCTCOUNT ( Libros[Programa] ), Libros[Programa] <> BLANK () )` |
| Dispositivos | Dispositivos Totales | `COUNTROWS ( Dispositivos )` |
| Dispositivos | Dispositivos Disponibles | `CALCULATE ( COUNTROWS ( Dispositivos ), Dispositivos[Estado] = "Disponible" )` |
| Dispositivos | % Disponibilidad | `DIVIDE ( [Dispositivos Disponibles], [Dispositivos Totales] )` |
| PrestamosLibros | Préstamos de Libros | `COUNTROWS ( PrestamosLibros )` |
| PrestamosLibros | Préstamos Activos | `CALCULATE ( COUNTROWS ( PrestamosLibros ), PrestamosLibros[Estado] = "Activo" )` |
| PrestamosLibros | Préstamos Vencidos | `CALCULATE ( COUNTROWS ( PrestamosLibros ), PrestamosLibros[Estado] = "Vencido" )` |
| PrestamosLibros | Tasa de Aprobación | `DIVIDE ( CALCULATE ( COUNTROWS ( PrestamosLibros ), PrestamosLibros[Solicitud] = "Aprobado" ), [Préstamos de Libros] )` |
| PrestamosDispositivos | Préstamos de Dispositivos | `COUNTROWS ( PrestamosDispositivos )` |
| PrestamosDispositivos | Préstamos de Dispositivos Activos | `CALCULATE ( COUNTROWS ( PrestamosDispositivos ), PrestamosDispositivos[Estado] = "Activo" )` |
| Ingresos | Ingresos Registrados | `COUNTROWS ( Ingresos )` |
| Ingresos | Ingresos Permitidos | `CALCULATE ( COUNTROWS ( Ingresos ), Ingresos[Estado] = "Permitido" )` |
| Ingresos | % Ingresos Permitidos | `DIVIDE ( [Ingresos Permitidos], [Ingresos Registrados] )` |
| Usuarios | Usuarios Registrados | `SUM ( Usuarios[Cantidad] )` (conteo agregado) |

**Origen de cada tabla (Power Query/M):** los CSV de `powerbi/datos/` vía el
parámetro de texto `RutaDatos` (valor por defecto:
`C:\Users\USUARIO\OneDrive\Documentos\Proyecto-Organizado\powerbi\datos`).
`Ingresos` añade columnas calculadas `Mes` (`yyyy-MM`, ordenada por `Periodo`)
y `Periodo` (oculta) para el eje temporal del gráfico de línea.

## 4. Página del reporte (1280×720, 13 visuales)

Una sola página, «Tablero de biblioteca»:

| # | Visual | Contenido |
|---|---|---|
| 1 | Título (cuadro de texto) | «Tablero Biblioteca IUB — Parcial Corte 2» + subtítulo «sin datos personales» |
| 2 | **Slicer (filtro por sede)** | `Sedes[Sede]` — filtro cruzado a todas las tablas por las relaciones |
| 3 | Tarjeta | **Total Libros** = 693 |
| 4 | Tarjeta | **Total Ejemplares** = 705 |
| 5 | Tarjeta | **Préstamos de Libros** = 8 |
| 6 | Tarjeta | **Dispositivos Disponibles** = 13 de 18 |
| 7 | Tarjeta | **Ingresos Registrados** = 29 |
| 8 | Barras agrupadas | **Acervo por programa** (`Libros[Programa]` × Total Libros) |
| 9 | Línea | **Ingresos por mes** (`Ingresos[Mes]` × Ingresos Registrados) |
| 10 | Columnas agrupadas | **Dispositivos por sede** (`Sedes[Sede]` × Dispositivos Totales): Barranquilla 8, Colsamiro 5, Soledad 5 |
| 11 | Anillo | **Dispositivos por tipo** (`Dispositivos[Tipo]` × Dispositivos Totales) |
| 12 | Anillo | **Préstamos de equipos por estado** (`PrestamosDispositivos[Estado]` × Préstamos de Dispositivos) |
| 13 | Columnas agrupadas | **Préstamos de libros por estado** (`PrestamosLibros[Estado]` × Préstamos de Libros) |

Supera el mínimo pedido: **5 indicadores (tarjetas), 6 gráficos y 1 filtro por
sede**, todos alimentados por medidas DAX — sin métricas inventadas.

## 5. Cómo abrir el tablero

**Para ver el tablero entregado (recomendado):**

1. Abrir **`powerbi/entrega/TableroBibliotecaIUB.pbix`** con Power BI Desktop
   (instalado: `Microsoft.MicrosoftPowerBIDesktop 2.159.1231.0`). El archivo
   **ya contiene los datos reales cargados** — se abre listo para explorar:
   5 tarjetas, 6 gráficos y el filtro por sede, sin pasos adicionales.

**Para editar el modelo o regenerar desde el proyecto:**

2. Abrir `powerbi/entrega/TableroBibliotecaIUB.pbit` (el artefacto maestro).
   Al abrir un `.pbit`, Desktop carga el modelo y **ejecuta la consulta**
   contra `RutaDatos`: si la carpeta `powerbi/datos` está en la ruta por
   defecto, los datos reales se cargan solos.
3. (Solo si la carpeta se movió) **Transformar datos → Administrar
   parámetros → RutaDatos** → poner la carpeta que contiene los CSV → Aplicar.
4. Tras editar, guardar de nuevo con **Archivo → Guardar como →
   TableroBibliotecaIUB.pbix** para actualizar el entregable con datos
   cargados (así se generó el `.pbix` actual).

> El `.pbit` es deliberadamente el artefacto maestro versionable: se abre, se
> edita y se guarda como `.pbix`. El `.pbix` entregado se produjo exactamente
> con ese flujo, tras verificar en la misma sesión que el reporte renderizaba
> con los datos reales.

## 6. Cómo actualizar los datos

**Vía A (implementada, recomendada): CSV exportados**

1. Volver a capturar la instantánea desde el tablero Angular (sesión
   administrador) igual que esta vez y guardarla como
   `powerbi/datos/fuente/datos_powerbi.json`, o ejecutar el export desde la
   consola del navegador (los endpoints están en la sección 1).
2. `python powerbi/herramientas/generar_datos.py`
   → regenera los CSV + `manifiesto.json` (conteos y SHA-256).
3. En Power BI Desktop: **Inicio → Actualizar**. El modelo lee los CSV de
   `RutaDatos` con Power Query (`Csv.Document`, UTF-8) y recalcula todo.

**Vía B (en vivo, opcional): consulta directa a la API**

`powerbi/consultas/api.pq` contiene las consultas M (`Web.Contents` +
`Authorization: Bearer`) para libros, dispositivos, préstamos, ingresos y
sedes, con los parámetros `BaseUrl` y `TokenJwt` (el token **no** se guarda en
el archivo). Para el Servicio de Power BI (nube) se necesitaría una puerta de
enlace; en Desktop funciona con Actualizar manual.

## 7. Anomalías conocidas de los datos reales (no se inventan ni se corrigen en origen)

- `Libros[Anio]` contiene valores inválidos (p. ej. `-5`) y `Programa` vacío en
  1 libro: se conservan tal cual; el tablero no usa `Anio` y el programa vacío
  se muestra como «(En blanco)».
- `Idioma` tiene variantes de escritura (`Español`, `Ingles`, `Inglés`,
  `English`, `Bilingue`) y `Titulo`/`Autor` tienen registros de prueba
  (`'T'`, `'A'`). No se usan en ningún visual actual.
- Todos los préstamos e ingresos registrados son de sede `Soledad`: al
  filtrar por otra sede las tarjetas de préstamos/ingresos muestran 0 (0 es
  correcto, no vacío).

## 8. Reproducibilidad

| Pieza | Ubicación |
|---|---|
| Instantánea real anonimizada | `powerbi/datos/fuente/datos_powerbi.json` |
| CSV + manifiesto (hashes) | `powerbi/datos/` |
| Script CSV ← JSON | `powerbi/herramientas/generar_datos.py` |
| Script proyecto PbixProj | `powerbi/herramientas/construir_proyecto.py` |
| Proyecto editable (TMSL + Report) | `powerbi/TableroBibliotecaIUB/` |
| Esquema TMSL del modelo (BIM) | `powerbi/entrega/TableroBibliotecaIUB.bim` |
| Validador automático | `powerbi/herramientas/validar_entregables.py` |
| Consultas M a la API | `powerbi/consultas/api.pq` |
| Proyecto editable (.pbit, artefacto maestro) | `powerbi/entrega/TableroBibliotecaIUB.pbit` |
| **Entregable final (.pbix, con datos cargados)** | `powerbi/entrega/TableroBibliotecaIUB.pbix` |

Recompilar el `.pbit` tras cambiar algo del proyecto:

```
pbi-tools.core.exe compile powerbi\TableroBibliotecaIUB powerbi\entrega\TableroBibliotecaIUB.pbit PBIT -overwrite
```

(pbi-tools 1.2.0 Core; los IDs del proyecto son deterministas, generados con
UUIDv5 de una semilla fija, para que el resultado sea estable en git.)

Después de recompilar (o de editar el modelo en Desktop), volver a guardar el
`.pbix` con *Archivo → Guardar como* para que el entregable final refleje los
cambios con datos cargados.

## 9. Validaciones realizadas

1. **`generate-bim`** (pbi-tools/AMO): el modelo TMSL se deserializa sin
   errores; 7 tablas, 16 medidas, 6 relaciones, expresión `RutaDatos`.
2. **`convert -modelSerialization Tmdl`**: el modelo se valida con TOM y se
   serializa a TMDL sin errores.
3. **`compile`**: `.pbit` OPC con partes `/Version`, `/Settings`, `/Metadata`,
   `/Report/Layout`, `/DataModelSchema`, `/Connections`.
4. **Apertura real en Power BI Desktop 2.159** (automatizada con UI
   Automation): el modelo cargó exactamente las filas reales —
   Libros 693, Dispositivos 18, PrestamosLibros 8, PrestamosDispositivos 25,
   Ingresos 29, Usuarios 11, Sedes 3 (diálogo «Actualizar» de Desktop).
5. **Render del reporte**: tras corregir la expresión M de `Ingresos`
   (`DateTime.ToText` para `Mes`) y añadir `themeCollection` al config del
   reporte, la página renderizó con las 5 tarjetas, los 6 gráficos y el slicer
   de Sede (verificado por UIA + capturas de pantalla).
6. **Editor TMDL de Desktop** mostró «Medidas (16)», «Relaciones (6)»,
   «Tablas (7)» al inspeccionar el modelo cargado.
7. **`validar_entregables.py`** (7 bloques): hashes y conteos de CSV vs
   manifiesto, columnas prohibidas, partes del paquete, coherencia
   modelo↔visuales (cada `queryRef` existe), mínimo de gráficos/tarjetas,
   slicer sobre `Sedes.Sede`, visuales dentro de la página.
8. **Guardado real como `.pbix`**: desde la sesión de Power BI Desktop en la
   que el tablero se abrió, cargó los datos y renderizó, se usó
   *Archivo → Guardar como* para producir
   `powerbi/entrega/TableroBibliotecaIUB.pbix` (~112 KB) con el modelo, el
   reporte y **los datos ya cargados** — el requisito literal «archivo `.pbix`
   editable» queda cumplido.

## 10. Nota de reproducibilidad sobre el `.pbix`

- **El `.pbix` no lo genera pbi-tools**: la edición Core solo produce PBIX
  para informes "thin" (sin modelo); con modelo embebido la salida es `.pbit`.
  La serialización de la base VertiPaq solo la hace Power BI Desktop al
  guardar.
- **Por eso el pipeline termina en `.pbit`** y el `.pbix` entregado se obtuvo
  abriendo ese `.pbit` en Desktop (donde se verificó la carga de datos y el
  render del reporte) y guardando con *Archivo → Guardar como*. El archivo ya
  existe en `powerbi/entrega/TableroBibliotecaIUB.pbix`.
- **Si se regenera el `.pbit`** (cambio de modelo o de datos), repetir el
  guardado para refrescar el `.pbix` — paso manual de ~30 s, sin limitación
  del modelo ni de los datos.

---

*Ningún dato personal ni secreto se incluyó en este entregable. Los archivos
de este flujo no se han publicado ni compartido fuera del proyecto, y no se
realizó commit ni push (rama de trabajo: `deploy/fastapi-express-production`).*
