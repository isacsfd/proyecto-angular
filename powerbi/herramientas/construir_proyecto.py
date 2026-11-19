#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Construye el proyecto de Power BI (formato PbixProj) del tablero de biblioteca.

Genera en powerbi/TableroBibliotecaIUB/:
  .pbixproj.json, Version.txt, Metadata.json, ReportSettings.json
  Model/database.json                  -> modelo tabular (TMSL): relaciones,
                                          expresiones (parámetro RutaDatos) y
                                          anotaciones
  Model/tables/<Tabla>/table.json      -> columnas, particiones M y medidas DAX
  Report/report.json + config.json     -> contenedor del reporte
  Report/sections/<NNN_nombre>/...     -> páginas, filtros y visuales

Con este proyecto, `pbi-tools compile` produce un .pbit real (paquete OPC con
DataModelSchema + Report/Layout), que Power BI Desktop abre y guarda como .pbix.

Uso:  python powerbi/herramientas/construir_proyecto.py
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
PROYECTO = RAIZ / "TableroBibliotecaIUB"
DATOS = RAIZ / "datos"

# Semilla fija: los identificadores (GUID / nombres de visual) son estables
# entre ejecuciones, de modo que el proyecto se puede versionar con git.
SEMILLA = uuid.UUID("6f1d0f7e-8b64-4a1e-9a5f-0b0f6a7c2d11")

def guid(etiqueta: str, prefijo: int = 0) -> str:
    return str(uuid.uuid5(SEMILLA, f"{prefijo}:{etiqueta}"))

def hexid(etiqueta: str) -> str:
    return uuid.uuid5(SEMILLA, etiqueta).hex[:22]


# ─────────────────────────── Fuente de datos (M) ────────────────────────────

RUTA_DATOS = str(DATOS).replace("\\", "\\\\")

EXPRESION_RUTA = {
    "name": "RutaDatos",
    "kind": "m",
    "expression": f'"{RUTA_DATOS}"',
    "annotations": [
        {"name": "PBI_IsParameterQuery", "value": "true"},
        {"name": "PBI_IsParameterQueryRequired", "value": "true"},
        {"name": "PBI_QueryGroupName", "value": "Parámetros"},
        {"name": "PBI_ResultType", "value": "Text"},
    ],
}


def m_csv(archivo: str, columnas_tipos: list[tuple[str, str]]) -> list[str]:
    tipos = ", ".join(f'{{"{c}", {t}}}' for c, t in columnas_tipos)
    return [
        "let",
        f'    Origen = Csv.Document(File.Contents(RutaDatos & "\\{archivo}"), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),',
        "    Encabezados = Table.PromoteHeaders(Origen, [PromoteAllScalars=true]),",
        '    SinVacios = Table.ReplaceValue(Encabezados, "", null, Replacer.ReplaceValue, Table.ColumnNames(Encabezados)),',
        f"    Tipos = Table.TransformColumnTypes(SinVacios, {{{tipos}}})",
        "in",
        "    Tipos",
    ]


def col(nombre: str, data_type: str, source: str | None = None, **extra) -> dict:
    columna = {
        "name": nombre,
        "dataType": data_type,
        "sourceColumn": source if source is not None else nombre,
        "lineageTag": guid(f"columna:{nombre}"),
        "summarizeBy": "none" if data_type in ("string", "dateTime") else "sum",
    }
    columna.update(extra)
    return columna


def medida(nombre: str, expresion: str, formato: str, descripcion: str | None = None) -> dict:
    m = {
        "name": nombre,
        "expression": expresion,
        "formatString": formato,
        "lineageTag": guid(f"medida:{nombre}"),
    }
    if descripcion:
        m["description"] = descripcion
    return m


def tabla(nombre: str, columnas: list[dict], expresion_m: list[str], medidas: list[dict] | None = None) -> dict:
    return {
        "name": nombre,
        "lineageTag": guid(f"tabla:{nombre}"),
        "columns": columnas,
        "partitions": [
            {
                "name": f"{nombre}-{guid('particion:' + nombre)}",
                "mode": "import",
                "source": {"type": "m", "expression": expresion_m},
            }
        ],
        "measures": medidas or [],
    }


# ─────────────────────────────── Modelo ─────────────────────────────────────

TABLAS = [
    tabla(
        "Libros",
        [
            col("ID", "int64"),
            col("Titulo", "string"),
            col("Programa", "string"),
            col("Sede", "string"),
            col("Idioma", "string"),
            col("Editorial", "string"),
            col("Anio", "int64", summarizeBy="none"),
            col("Ejemplar", "int64", summarizeBy="sum"),
        ],
        m_csv(
            "libros.csv",
            [("ID", "Int64.Type"), ("Ejemplar", "Int64.Type"), ("Anio", "Int64.Type")],
        ),
        [
            medida("Total Libros", "COUNTROWS ( Libros )", "#,0", "Filas del catálogo (una por registro de libro)."),
            medida("Total Ejemplares", "SUM ( Libros[Ejemplar] )", "#,0", "Suma de la columna Ejemplar."),
            medida(
                "Programas con Acervo",
                "CALCULATE ( DISTINCTCOUNT ( Libros[Programa] ), Libros[Programa] <> BLANK () )",
                "#,0",
                "Programas distintos con al menos un libro registrado.",
            ),
        ],
    ),
    tabla(
        "Dispositivos",
        [
            col("ID", "int64"),
            col("Tipo", "string"),
            col("Marca", "string"),
            col("Modelo", "string"),
            col("Sede", "string"),
            col("Estado", "string"),
            col("Alta", "dateTime", summarizeBy="none"),
        ],
        m_csv("dispositivos.csv", [("ID", "Int64.Type"), ("Alta", "type datetime")]),
        [
            medida("Dispositivos Totales", "COUNTROWS ( Dispositivos )", "#,0"),
            medida(
                "Dispositivos Disponibles",
                'CALCULATE ( COUNTROWS ( Dispositivos ), Dispositivos[Estado] = "Disponible" )',
                "#,0",
                "Equipos con estado Disponible.",
            ),
            medida(
                "% Disponibilidad",
                "DIVIDE ( [Dispositivos Disponibles], [Dispositivos Totales] )",
                "0.0%",
            ),
        ],
    ),
    tabla(
        "PrestamosLibros",
        [
            col("ID", "int64"),
            col("LibroID", "string"),
            col("Libro", "string"),
            col("FechaPrestamo", "dateTime", summarizeBy="none"),
            col("FechaEntrega", "dateTime", summarizeBy="none"),
            col("FechaDevolucion", "dateTime", summarizeBy="none"),
            col("Estado", "string"),
            col("Solicitud", "string"),
            col("Sede", "string"),
        ],
        m_csv(
            "prestamos_libros.csv",
            [
                ("ID", "Int64.Type"),
                ("FechaPrestamo", "type datetime"),
                ("FechaEntrega", "type datetime"),
                ("FechaDevolucion", "type datetime"),
            ],
        ),
        [
            medida("Préstamos de Libros", "COUNTROWS ( PrestamosLibros )", "#,0"),
            medida(
                "Préstamos Activos",
                'CALCULATE ( COUNTROWS ( PrestamosLibros ), PrestamosLibros[Estado] = "Activo" )',
                "#,0",
            ),
            medida(
                "Préstamos Vencidos",
                'CALCULATE ( COUNTROWS ( PrestamosLibros ), PrestamosLibros[Estado] = "Vencido" )',
                "#,0",
            ),
            medida(
                "Tasa de Aprobación",
                'DIVIDE ( CALCULATE ( COUNTROWS ( PrestamosLibros ), PrestamosLibros[Solicitud] = "Aprobado" ), [Préstamos de Libros] )',
                "0.0%",
                "Solicitudes de préstamo aprobadas sobre el total registrado.",
            ),
        ],
    ),
    tabla(
        "PrestamosDispositivos",
        [
            col("ID", "int64"),
            col("Dispositivo", "string"),
            col("FechaPrestamo", "dateTime", summarizeBy="none"),
            col("FechaDevolucion", "dateTime", summarizeBy="none"),
            col("Estado", "string"),
            col("Sede", "string"),
        ],
        m_csv(
            "prestamos_dispositivos.csv",
            [
                ("ID", "Int64.Type"),
                ("FechaPrestamo", "type datetime"),
                ("FechaDevolucion", "type datetime"),
            ],
        ),
        [
            medida("Préstamos de Dispositivos", "COUNTROWS ( PrestamosDispositivos )", "#,0"),
            medida(
                "Préstamos de Dispositivos Activos",
                'CALCULATE ( COUNTROWS ( PrestamosDispositivos ), PrestamosDispositivos[Estado] = "Activo" )',
                "#,0",
            ),
        ],
    ),
    tabla(
        "Ingresos",
        [
            col("Fecha", "dateTime", summarizeBy="none"),
            col("Estado", "string"),
            col("Sede", "string"),
            col("Mes", "string", summarizeBy="none", sortByColumn="Periodo"),
            col("Periodo", "dateTime", summarizeBy="none", isHidden=True),
        ],
        [
            "let",
            f'    Origen = Csv.Document(File.Contents(RutaDatos & "\\ingresos.csv"), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),',
            "    Encabezados = Table.PromoteHeaders(Origen, [PromoteAllScalars=true]),",
            '    SinVacios = Table.ReplaceValue(Encabezados, "", null, Replacer.ReplaceValue, Table.ColumnNames(Encabezados)),',
            '    Tipos = Table.TransformColumnTypes(SinVacios, {{"Fecha", type datetime}}),',
            '    ConMes = Table.AddColumn(Tipos, "Mes", each DateTime.ToText([Fecha], "yyyy-MM"), type text),',
            '    ConPeriodo = Table.AddColumn(ConMes, "Periodo", each #date(Date.Year([Fecha]), Date.Month([Fecha]), 1), type date)',
            "in",
            "    ConPeriodo",
        ],
        [
            medida("Ingresos Registrados", "COUNTROWS ( Ingresos )", "#,0", "Accesos a biblioteca registrados (tabla library_access)."),
            medida(
                "Ingresos Permitidos",
                'CALCULATE ( COUNTROWS ( Ingresos ), Ingresos[Estado] = "Permitido" )',
                "#,0",
            ),
            medida(
                "% Ingresos Permitidos",
                "DIVIDE ( [Ingresos Permitidos], [Ingresos Registrados] )",
                "0.0%",
            ),
        ],
    ),
    tabla(
        "Usuarios",
        [
            col("Sede", "string"),
            col("Rol", "string"),
            col("Carrera", "string"),
            col("Nivel", "string"),
            col("Cantidad", "int64", summarizeBy="sum"),
        ],
        m_csv("usuarios_agregados.csv", [("Cantidad", "Int64.Type")]),
        [medida("Usuarios Registrados", "SUM ( Usuarios[Cantidad] )", "#,0", "Conteo agregado: no se cargan datos personales.")],
    ),
    tabla(
        "Sedes",
        [col("Sede", "string")],
        [
            "let",
            '    Origen = #table(type table [Sede = text], {{"Soledad"}, {"Barranquilla"}, {"Colsamiro"}})',
            "in",
            "    Origen",
        ],
    ),
]

RELACIONES = [
    ("Libros", "Sede"),
    ("Dispositivos", "Sede"),
    ("PrestamosLibros", "Sede"),
    ("PrestamosDispositivos", "Sede"),
    ("Ingresos", "Sede"),
    ("Usuarios", "Sede"),
]

DATABASE = {
    "name": "TableroBibliotecaIUB",
    "compatibilityLevel": 1550,
    "model": {
        "culture": "es-ES",
        "dataAccessOptions": {"legacyRedirects": True, "returnErrorValuesAsNull": True},
        "defaultPowerBIDataSourceVersion": "powerBI_V3",
        "sourceQueryCulture": "es-ES",
        "relationships": [
            {
                "name": guid(f"relacion:{t}"),
                "fromTable": t,
                "fromColumn": c,
                "toTable": "Sedes",
                "toColumn": "Sede",
            }
            for t, c in RELACIONES
        ],
        "expressions": [EXPRESION_RUTA],
        "annotations": [
            {"name": "__PBI_TimeIntelligenceEnabled", "value": "0"},
            {"name": "PBIDesktopVersion", "value": "2.159.1231.0 (25.11)"},
            {
                "name": "PBI_QueryOrder",
                "value": json.dumps(
                    ["RutaDatos"] + [t["name"] for t in TABLAS], ensure_ascii=False
                ),
            },
        ],
    },
}

# ─────────────────────────── Visuales del reporte ───────────────────────────

def ref_fuente(alias: str) -> dict:
    return {"SourceRef": {"Source": alias}}


def lit(valor: str) -> dict:
    return {"expr": {"Literal": {"Value": valor}}}


def consulta(campos: list[tuple[str, str, str]]) -> dict:
    """Arma prototypeQuery a partir de [(entidad, 'col'|'medida', nombre), ...]."""
    alias: dict[str, str] = {}
    desde = []
    seleccion = []
    for entidad, tipo, nombre in campos:
        if entidad not in alias:
            alias[entidad] = f"t{len(alias)}"
            desde.append({"Name": alias[entidad], "Entity": entidad, "Type": 0})
        origen = ref_fuente(alias[entidad])
        if tipo == "col":
            seleccion.append({"Column": {"Expression": origen, "Property": nombre}, "Name": f"{entidad}.{nombre}"})
        else:
            seleccion.append({"Measure": {"Expression": origen, "Property": nombre}, "Name": f"{entidad}.{nombre}"})
    return {"Version": 2, "From": desde, "Select": seleccion}


def titulo(texto: str) -> dict:
    return {
        "title": [
            {
                "properties": {
                    "show": lit("true"),
                    "text": lit("'" + texto.replace("'", "''") + "'"),
                    "fontSize": lit("12D"),
                    "bold": lit("true"),
                }
            }
        ]
    }


class Pagina:
    def __init__(self) -> None:
        self.visuales: list[dict] = []
        self.z = 0

    def agregar(self, x, y, w, h, config: dict, etiqueta: str) -> None:
        self.z += 1000
        nombre = hexid(f"visual:{etiqueta}")
        posicion = {"x": x, "y": y, "z": self.z, "width": w, "height": h}
        config = {
            "name": nombre,
            "layouts": [{"id": 0, "position": posicion}],
            "singleVisual": config,
        }
        self.visuales.append(
            {
                "contenedor": posicion,
                "config": config,
                "nombre": etiqueta,
            }
        )

    def textbox(self, x, y, w, h, parrafos: list[dict]) -> None:
        self.agregar(
            x, y, w, h,
            {
                "visualType": "textbox",
                "drillFilterOtherVisuals": True,
                "objects": {"general": [{"properties": {"paragraphs": parrafos}}]},
            },
            "titulo-pagina",
        )

    def card(self, x, y, w, h, entidad: str, medida: str, etiqueta: str) -> None:
        self.agregar(
            x, y, w, h,
            {
                "visualType": "card",
                "projections": {"Values": [{"queryRef": f"{entidad}.{medida}"}]},
                "prototypeQuery": consulta([(entidad, "medida", medida)]),
                "drillFilterOtherVisuals": True,
            },
            etiqueta,
        )

    def grafico(self, x, y, w, h, tipo_visual: str, entidad_categoria: str, categoria: str,
                medida: str, entidad_medida: str, etiqueta: str, titulo_texto: str) -> None:
        campos = [(entidad_categoria, "col", categoria), (entidad_medida, "medida", medida)]
        self.agregar(
            x, y, w, h,
            {
                "visualType": tipo_visual,
                "projections": {
                    "Category": [{"queryRef": f"{entidad_categoria}.{categoria}"}],
                    "Y": [{"queryRef": f"{entidad_medida}.{medida}"}],
                },
                "prototypeQuery": consulta(campos),
                "objects": {},
                "vcObjects": titulo(titulo_texto),
                "drillFilterOtherVisuals": True,
            },
            etiqueta,
        )

    def slicer(self, x, y, w, h) -> None:
        self.agregar(
            x, y, w, h,
            {
                "visualType": "slicer",
                "projections": {"Values": [{"queryRef": "Sedes.Sede"}]},
                "prototypeQuery": consulta([("Sedes", "col", "Sede")]),
                "objects": {"data": [{"properties": {"mode": lit("'Basic'")}}]},
                "drillFilterOtherVisuals": True,
            },
            "filtro-sede",
        )


def construir_reporte() -> tuple[dict, list[dict]]:
    pagina = Pagina()

    pagina.textbox(
        16, 12, 950, 64,
        [
            {
                "textRuns": [
                    {
                        "value": "Tablero Biblioteca IUB — Parcial Corte 2",
                        "textStyle": {"fontWeight": "bold", "fontFamily": "Segoe UI", "fontSize": "20pt"},
                    }
                ]
            },
            {
                "textRuns": [
                    {
                        "value": "Datos reales de la API (catálogo, dispositivos, préstamos e ingresos) · sin datos personales",
                        "textStyle": {"fontFamily": "Segoe UI", "fontSize": "10pt"},
                    }
                ]
            },
        ],
    )
    pagina.slicer(1002, 12, 262, 64)

    # 5 tarjetas de indicadores
    tarjetas = [
        ("Libros", "Total Libros", "kpi-libros"),
        ("Libros", "Total Ejemplares", "kpi-ejemplares"),
        ("PrestamosLibros", "Préstamos de Libros", "kpi-prestamos"),
        ("Dispositivos", "Dispositivos Disponibles", "kpi-disponibles"),
        ("Ingresos", "Ingresos Registrados", "kpi-ingresos"),
    ]
    x = 16
    for entidad, medida, etiqueta in tarjetas:
        pagina.card(x, 88, 244, 92, entidad, medida, etiqueta)
        x += 252

    # 6 gráficos (2 filas x 3)
    fila1, fila2 = 192, 452
    ancho, alto1, alto2 = 408, 240, 248
    posiciones = [(16, fila1, ancho, alto1), (432, fila1, ancho, alto1), (848, fila1, ancho, alto1),
                  (16, fila2, ancho, alto2), (432, fila2, ancho, alto2), (848, fila2, ancho, alto2)]

    graficos = [
        ("clusteredBarChart", "Libros", "Programa", "Total Libros", "Libros",
         "g-acervo-programa", "Acervo por programa"),
        ("lineChart", "Ingresos", "Mes", "Ingresos Registrados", "Ingresos",
         "g-ingresos-mes", "Ingresos por mes"),
        ("clusteredColumnChart", "Sedes", "Sede", "Dispositivos Totales", "Dispositivos",
         "g-dispositivos-sede", "Dispositivos por sede"),
        ("donutChart", "Dispositivos", "Tipo", "Dispositivos Totales", "Dispositivos",
         "g-dispositivos-tipo", "Dispositivos por tipo"),
        ("donutChart", "PrestamosDispositivos", "Estado", "Préstamos de Dispositivos", "PrestamosDispositivos",
         "g-prestamos-dispositivos", "Préstamos de equipos por estado"),
        ("clusteredColumnChart", "PrestamosLibros", "Estado", "Préstamos de Libros", "PrestamosLibros",
         "g-prestamos-libros", "Préstamos de libros por estado"),
    ]
    for (tipo, entidad, categoria, medida, medida_entidad, etiqueta, texto), (x, y, w, h) in zip(graficos, posiciones):
        pagina.grafico(x, y, w, h, tipo, entidad, categoria, medida, medida_entidad, etiqueta, texto)

    nombre_seccion = "ReportSection" + uuid.uuid5(SEMILLA, "seccion:tablero").hex[:12]
    reporte = {
        "id": 0,
        "layoutOptimization": 0,
        "pods": [
            {"boundSection": nombre_seccion, "config": "{}", "name": "PodTablero"},
        ],
        "resourcePackages": [],
    }
    seccion = {
        "config": {},
        "filters": [],
        "name": nombre_seccion,
        "displayName": "Tablero de biblioteca",
        "ordinal": 0,
        "displayOption": 1,
        "width": 1280,
        "height": 720,
        "visuales": pagina.visuales,
    }
    return reporte, [seccion]


def escribir_json(ruta: Path, contenido) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(json.dumps(contenido, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    # Modelo
    escribir_json(PROYECTO / "Model" / "database.json", DATABASE)
    for t in TABLAS:
        escribir_json(PROYECTO / "Model" / "tables" / t["name"] / "table.json", t)

    # Metadatos del proyecto
    escribir_json(
        PROYECTO / ".pbixproj.json",
        {
            "version": "0.10",
            "created": "2026-11-18T00:00:00+00:00",
            "lastModified": "2026-11-18T00:00:00+00:00",
            "settings": {"model": {"serializationMode": "Default"}},
        },
    )
    (PROYECTO / "Version.txt").write_text("1.25", encoding="utf-8")
    escribir_json(
        PROYECTO / "ReportMetadata.json",
        {
            "Version": 5,
            "AutoCreatedRelationships": [],
            "FileDescription": "Tablero Biblioteca IUB - datos reales anonimizados",
            "CreatedFrom": "Desktop",
            "CreatedFromRelease": "2026.11",
        },
    )
    escribir_json(
        PROYECTO / "ReportSettings.json",
        {
            "Version": 1,
            "ReportSettings": {},
            "QueriesSettings": {
                "TypeDetectionEnabled": True,
                "RelationshipImportEnabled": True,
                "RunBackgroundAnalysis": True,
                "Version": "2.140.0.0",
            },
        },
    )

    # Reporte
    reporte, secciones = construir_reporte()
    escribir_json(PROYECTO / "Report" / "report.json", reporte)
    escribir_json(
        PROYECTO / "Report" / "config.json",
        {
            "version": "5.9",
            "themeCollection": {
                "baseTheme": {"name": "CY19SU06", "version": "5.3", "type": 2}
            },
            "activeSectionIndex": 0,
            "defaultDrillFilterOtherVisuals": True,
            "slowDataSourceSettings": {
                "isCrossHighlightingDisabled": False,
                "isSlicerSelectionsButtonEnabled": False,
                "isFilterSelectionsButtonEnabled": False,
                "isFieldWellButtonEnabled": False,
                "isApplyAllButtonEnabled": False,
            },
            "linguisticSchemaSyncVersion": 2,
            "settings": {
                "useStylableVisualContainerHeader": True,
                "exportDataMode": 1,
                "useNewFilterPaneExperience": True,
                "allowChangeFilterTypes": True,
            },
            "objects": {
                "section": [
                    {"properties": {"verticalAlignment": {"expr": {"Literal": {"Value": "'Top'"}}}}}
                ],
                "outspacePane": [
                    {"properties": {"expanded": {"expr": {"Literal": {"Value": "false"}}}}}
                ],
            },
        },
    )

    for seccion in secciones:
        carpeta = PROYECTO / "Report" / "sections" / f"{seccion['ordinal']:03d}_Tablero de biblioteca"
        escribir_json(
            carpeta / "section.json",
            {k: seccion[k] for k in ("name", "displayName", "ordinal", "displayOption", "width", "height")},
        )
        escribir_json(carpeta / "config.json", seccion["config"])
        escribir_json(carpeta / "filters.json", seccion["filters"])
        for indice, visual in enumerate(seccion["visuales"]):
            sub = carpeta / "visualContainers" / f"{indice:05d}_{visual['nombre']}"
            escribir_json(sub / "visualContainer.json", visual["contenedor"])
            escribir_json(sub / "config.json", visual["config"])
            escribir_json(sub / "filters.json", [])

    print(f"Proyecto generado en {PROYECTO}")
    print(f"  tablas      : {len(TABLAS)}")
    print(f"  medidas     : {sum(len(t['measures']) for t in TABLAS)}")
    print(f"  relaciones  : {len(DATABASE['model']['relationships'])}")
    print(f"  visuales    : {len(secciones[0]['visuales'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
