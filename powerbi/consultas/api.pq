// ============================================================================
// Consultas Power Query (M) — Biblioteca IUB
// ============================================================================
// Conecta el tablero de Power BI directamente con la API desplegada en Render.
//
// USO (Power BI Desktop):
//   1. Inicio > Obtener datos > Consulta en blanco > Editor avanzado.
//   2. Pegar este archivo completo y aceptar.
//   3. Crear los dos parámetros: `BaseUrl` y `TokenJwt`
//      (Inicio > Administrar parámetros). En TokenJwt NO dejar ningún valor
//      guardado en el archivo: se rellena en la sesión al actualizar.
//   4. Inicio > Actualizar. La API exige JWT; el token se envía como
//      `Authorization: Bearer <token>`.
//
// NOTA DE PRIVACIDAD:
//   Este archivo NO contiene secretos. `TokenJwt` es un parámetro vacío.
//   Las consultas seleccionan únicamente columnas sin datos personales:
//   no se cargan nombre, cédula, correo, teléfono ni identificadores.
//   La tabla `usuarios` del endpoint /usuarios/ NO se conecta aquí porque
//   contiene datos personales; el tablero usa `usuariosAgregado` (export
//   anonimizado por CSV).
//
// FLUJO RECOMENDADO para este parcial: los CSV de `powerbi/datos/`
// (generados con `powerbi/herramientas/generar_datos.py`), que ya alimentan
// el modelo compilado en `powerbi/entrega/TableroBibliotecaIUB.pbit`.
// Este archivo es la alternativa "en vivo" para el futuro.
// ============================================================================

// --- Parámetros -------------------------------------------------------------
// BaseUrl  : Texto  -> https://biblioteca-iub-api.onrender.com
// TokenJwt : Texto  -> (vacío; se pide al actualizar)

BaseUrl = "https://biblioteca-iub-api.onrender.com",

ObtenerRecurso = (ruta as text) as table =>
    let
        Respuesta = Web.Contents(
            BaseUrl,
            [
                RelativePath = ruta,
                Headers = [Authorization = "Bearer " & TokenJwt]
            ]
        ),
        Json = Json.Document(Respuesta),
        Tabla = Table.FromList(Json, Splitter.SplitByNothing(), {"valor"}),
        Expandir = Table.ExpandRecordColumn(Tabla, "valor",
            {
                "ID", "Titulo", "Programa", "Sede", "Idioma", "Editorial",
                "Anio", "Ejemplar", "Tipo", "Marca", "Modelo", "Estado",
                "Alta", "LibroID", "Libro", "FechaPrestamo", "FechaEntrega",
                "FechaDevolucion", "Solicitud", "Dispositivo", "Fecha"
            },
            {
                "ID", "Titulo", "Programa", "Sede", "Idioma", "Editorial",
                "Anio", "Ejemplar", "Tipo", "Marca", "Modelo", "Estado",
                "Alta", "LibroID", "Libro", "FechaPrestamo", "FechaEntrega",
                "FechaDevolucion", "Solicitud", "Dispositivo", "Fecha"
            }
        )
    in
        Expandir,

SoloColumnas = (tabla as table, columnas as list) as table =>
    Table.SelectColumns(tabla, List.Intersect({Table.ColumnNames(tabla), columnas}), MissingField.UseNull),

// --- Catálogo de libros (GET /libros/) --------------------------------------
libros = SoloColumnas(ObtenerRecurso("libros/"),
    {"ID", "Titulo", "Programa", "Sede", "Idioma", "Editorial", "Anio", "Ejemplar"}),

// --- Inventario de dispositivos (GET /dispositivos/) ------------------------
dispositivos = SoloColumnas(ObtenerRecurso("dispositivos/"),
    {"ID", "Tipo", "Marca", "Modelo", "Sede", "Estado", "Alta"}),

// --- Préstamos de libros (GET /loan/) ---------------------------------------
prestamosLibros = SoloColumnas(ObtenerRecurso("loan/"),
    {"ID", "LibroID", "Libro", "FechaPrestamo", "FechaEntrega",
     "FechaDevolucion", "Estado", "Solicitud", "Sede"}),

// --- Préstamos de dispositivos (GET /prestamos-dispositivos/) ---------------
prestamosDispositivos = SoloColumnas(ObtenerRecurso("prestamos-dispositivos/"),
    {"ID", "Dispositivo", "FechaPrestamo", "FechaDevolucion", "Estado", "Sede"}),

// --- Ingresos a biblioteca (GET /api/library-access/) -----------------------
// OJO: el endpoint devuelve user_id y user_name; se excluyen aquí.
ingresos = SoloColumnas(ObtenerRecurso("api/library-access/"),
    {"Fecha", "Estado", "Sede"}),

// --- Tabla de sedes (dimensión del filtro; services/rbac.py) ----------------
sedes = #table(type table [Sede = text], {{"Soledad"}, {"Barranquilla"}, {"Colsamiro"}})

// Para usar cada bloque como consulta independiente en Desktop:
//   copiar el bloque a una consulta nueva (Avanzado) definiendo antes
//   BaseUrl, TokenJwt, ObtenerRecurso y SoloColumnas en una consulta
//   compartida (p. ej. "Helper") y referenciarla como Helper.ObtenerRecurso.
