#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Valida los entregables de Power BI sin abrir Power BI Desktop.

Comprobaciones:
  1. Los CSV coinciden con el manifiesto (filas y sha256).
  2. No hay columnas con datos personales.
  3. El .pbit es un paquete OPC con las partes mínimas.
  4. El modelo tiene >= 4 medidas y las relaciones apuntan a columnas reales.
  5. El reporte tiene >= 6 gráficos y exactamente 1 filtro (slicer) por sede.
  6. Cada campo usado por un visual existe en el modelo (queryRef resoluble).
  7. Todos los visuales caben dentro de la página.

Uso: python powerbi/herramientas/validar_entregables.py
Salida: código 0 si todo pasa, 1 si hay fallos.
"""

from __future__ import annotations

import hashlib
import io
import json
import re
import sys
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
DATOS = RAIZ / "datos"
PBIT = RAIZ / "entrega" / "TableroBibliotecaIUB.pbit"

PROHIBIDAS = {"nombre", "user_id", "user_name", "user_identificacion", "identificacion",
              "email", "phone", "address", "password"}

fallos: list[str] = []
avisos: list[str] = []

try:  # consola de Windows: evita errores con acentos y flechas
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # pragma: no cover
    pass


def ok(mensaje: str) -> None:
    print(f"  OK   {mensaje}")


def fallo(mensaje: str) -> None:
    fallos.append(mensaje)
    print(f"  FALLO {mensaje}")


def aviso(mensaje: str) -> None:
    avisos.append(mensaje)
    print(f"  AVISO {mensaje}")


def leer_parte(zf: zipfile.ZipFile, nombre: str) -> dict:
    datos = zf.read(nombre)
    for codificacion in ("utf-16-le", "utf-8-sig"):
        try:
            return json.loads(datos.decode(codificacion))
        except (UnicodeDecodeError, json.JSONDecodeError):
            continue
    raise ValueError(f"No se pudo decodificar la parte {nombre}")


def main() -> int:
    # ── 1. Datos ──────────────────────────────────────────────────────────
    print("\n[1] Datos (CSV vs. manifiesto)")
    manifiesto = json.loads((DATOS / "manifiesto.json").read_text(encoding="utf-8"))
    for tabla in manifiesto["tablas"]:
        ruta = DATOS / tabla["archivo"]
        if not ruta.exists():
            fallo(f"falta {tabla['archivo']}")
            continue
        contenido = ruta.read_bytes()
        if hashlib.sha256(contenido).hexdigest() != tabla["sha256"]:
            fallo(f"{tabla['archivo']}: sha256 no coincide con el manifiesto")
            continue
        filas = contenido.decode("utf-8").rstrip("\r\n").split("\r\n")
        if len(filas) - 1 != tabla["filas"]:
            fallo(f"{tabla['archivo']}: {len(filas) - 1} filas, se esperaban {tabla['filas']}")
        else:
            ok(f"{tabla['archivo']:<32} {tabla['filas']:>4} filas · sha256 verificado")
    if manifiesto["privacidad"]["datos_personales_incluidos"] is not False:
        fallo("el manifiesto declara datos personales")

    # ── 2. Privacidad ─────────────────────────────────────────────────────
    print("\n[2] Privacidad (sin identificadores personales)")
    for tabla in manifiesto["tablas"]:
        columnas = {c.lower() for c in tabla["columnas"]}
        intrusas = columnas & PROHIBIDAS
        if intrusas:
            fallo(f"{tabla['archivo']}: columnas prohibidas {sorted(intrusas)}")
        else:
            ok(f"{tabla['archivo']:<32} sin columnas personales")

    # ── 3. Paquete .pbit ─────────────────────────────────────────────────
    print("\n[3] Paquete Power BI (.pbit)")
    if not PBIT.exists():
        fallo(f"no existe {PBIT}")
        return informe()
    with zipfile.ZipFile(PBIT) as zf:
        partes = set(zf.namelist())
        for requerida in ("[Content_Types].xml", "Version", "DataModelSchema", "Report/Layout"):
            ok(f"parte presente: {requerida}" ) if requerida in partes else fallo(f"falta la parte {requerida}")
        esquema = leer_parte(zf, "DataModelSchema")
        layout = leer_parte(zf, "Report/Layout")

    # ── 4. Modelo ────────────────────────────────────────────────────────
    print("\n[4] Modelo tabular")
    modelo = esquema["model"]
    tablas = {t["name"]: t for t in modelo["tables"]}
    medidas = {(t["name"], m["name"]) for t in modelo["tables"] for m in t.get("measures", [])}
    columnas = {(t["name"], c["name"]) for t in modelo["tables"] for c in t.get("columns", [])}
    print(f"       tablas: {len(tablas)} · columnas: {len(columnas)} · medidas: {len(medidas)}")
    ok("al menos 4 medidas definidas") if len(medidas) >= 4 else fallo("menos de 4 medidas")

    relaciones_ok = True
    for rel in modelo.get("relationships", []):
        if (rel["fromTable"], rel["fromColumn"]) not in columnas:
            fallo(f"relación {rel['name']}: columna origen inexistente")
            relaciones_ok = False
        if (rel["toTable"], rel["toColumn"]) not in columnas:
            fallo(f"relación {rel['name']}: columna destino inexistente")
            relaciones_ok = False
    if relaciones_ok:
        ok(f"{len(modelo.get('relationships', []))} relaciones apuntan a columnas existentes")

    # DAX: referencias Tabla[Columna]
    referencias_ok = True
    for tabla, medida in medidas:
        expresion = next(
            m["expression"] for t in modelo["tables"] for m in t.get("measures", [])
            if t["name"] == tabla and m["name"] == medida
        )
        if isinstance(expresion, list):
            expresion = "\n".join(expresion)
        for entidad, propiedad in re.findall(r"([A-Za-zÁÉÍÓÚÑáéíóúñ_]+)\[([^\[\]]+)\]", expresion):
            if (entidad, propiedad) not in columnas:
                fallo(f"medida '{medida}' usa {entidad}[{propiedad}], que no existe")
                referencias_ok = False
        for funcion in re.findall(r"([A-Z]+)\s*\(", expresion):
            if funcion not in {"SUM", "COUNTROWS", "CALCULATE", "DIVIDE", "DISTINCTCOUNT", "BLANK", "IF", "COUNT"}:
                aviso(f"medida '{medida}' usa la función {funcion} (verificar en Desktop)")
    if referencias_ok:
        ok("todas las referencias DAX Tabla[Columna] existen")

    # ── 5. Reporte ───────────────────────────────────────────────────────
    print("\n[5] Reporte")
    secciones = layout.get("sections", [])
    if len(secciones) != 1:
        aviso(f"el reporte tiene {len(secciones)} páginas (se esperaba 1)")
    visuales = []
    for seccion in secciones:
        ancho, alto = seccion.get("width", 0), seccion.get("height", 0)
        for vc in seccion.get("visualContainers", []):
            config = json.loads(vc["config"]) if isinstance(vc["config"], str) else vc["config"]
            visuales.append((seccion["displayName"], vc, config))
            if vc["x"] + vc["width"] > ancho or vc["y"] + vc["height"] > alto:
                fallo(f"visual {config['name']} fuera de la página")
    tipos = [config["singleVisual"]["visualType"] for _, _, config in visuales]
    graficos = [t for t in tipos if t not in ("card", "slicer", "textbox")]
    slicers = [t for t in tipos if t == "slicer"]
    print(f"       visuales: {len(visuales)} · tarjetas: {tipos.count('card')} · gráficos: {len(graficos)} · slicers: {len(slicers)}")
    ok(f"{len(graficos)} gráficos (mínimo 6)") if len(graficos) >= 6 else fallo("menos de 6 gráficos")
    ok("filtro por sede (1 slicer)") if len(slicers) == 1 else fallo("no hay exactamente 1 slicer")
    ok(f"{tipos.count('card')} tarjetas de indicadores (mínimo 4)") if tipos.count("card") >= 4 else fallo("menos de 4 tarjetas")

    # ── 6. Campo de cada visual existe en el modelo ───────────────────────
    print("\n[6] Coherencia modelo ↔ visuales")
    alias_entidad: dict[str, str] = {}
    resueltos = True
    for _, _, config in visuales:
        simple = config["singleVisual"]
        consulta = simple.get("prototypeQuery")
        if not consulta:
            continue
        for origen in consulta["From"]:
            alias_entidad[origen["Name"]] = origen["Entity"]
        entidades = {o["Entity"] for o in consulta["From"]}
        for campo in consulta["Select"]:
            nombre = campo.get("Name", "")
            if "Measure" in campo:
                entidad = alias_entidad[campo["Measure"]["Expression"]["SourceRef"]["Source"]]
                if (entidad, campo["Measure"]["Property"]) not in medidas:
                    fallo(f"visual {config['singleVisual']['visualType']}: medida inexistente {nombre}")
                    resueltos = False
            elif "Column" in campo:
                entidad = alias_entidad[campo["Column"]["Expression"]["SourceRef"]["Source"]]
                if (entidad, campo["Column"]["Property"]) not in columnas:
                    fallo(f"visual {config['singleVisual']['visualType']}: columna inexistente {nombre}")
                    resueltos = False
        for rol, proyecciones in simple.get("projections", {}).items():
            for proyeccion in proyecciones:
                referencia = proyeccion["queryRef"]
                entidad, _, propiedad = referencia.partition(".")
                if (entidad, propiedad) not in columnas and (entidad, propiedad) not in medidas:
                    fallo(f"visual {simple['visualType']}: queryRef sin campo {referencia}")
                    resueltos = False
    if resueltos:
        ok("todos los campos de los visuales existen en el modelo")

    # ── 7. Filtro por sede ────────────────────────────────────────────────
    print("\n[7] Filtro por sede")
    filtros = [
        p["queryRef"]
        for _, _, config in visuales
        if config["singleVisual"]["visualType"] == "slicer"
        for p in config["singleVisual"].get("projections", {}).get("Values", [])
    ]
    ok(f"slicer sobre {filtros}") if filtros == ["Sedes.Sede"] else fallo(f"slicer inesperado: {filtros}")

    return informe()


def informe() -> int:
    print("\n" + "=" * 62)
    if fallos:
        print(f"RESULTADO: {len(fallos)} fallo(s)")
        for f in fallos:
            print(f"  - {f}")
        return 1
    print(f"RESULTADO: todas las validaciones pasaron ({len(avisos)} aviso(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
