#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Genera los CSV del tablero de Power BI a partir de la instantánea real de la API.

Entrada : powerbi/datos/fuente/datos_powerbi.json
          (capturada con GET /libros/, /usuarios/, /loan/, /dispositivos/,
           /prestamos-dispositivos/ y /api/library-access/ con JWT de
           super_administrador; ver docs/POWERBI_TABLERO.md)
Salida  : powerbi/datos/*.csv  +  powerbi/datos/manifiesto.json

Reglas de privacidad (obligatorias):
  * NO se exportan nombres, cédulas, correos, teléfonos, direcciones ni
    identificadores de usuario.
  * Los usuarios se exportan SOLO agregados (sede + rol + carrera + nivel).
  * Los accesos a biblioteca se exportan sin user_id ni user_name.

Reglas de calidad (documentadas, no inventan datos):
  * Se colapsan espacios/saltos de línea en los textos.
  * Las fechas se emiten en ISO 8601.
  * El año del libro se conserva tal cual; el filtrado de valores inválidos
    (< 1000) se hace en Power Query, no aquí (trazabilidad).
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]          # .../powerbi
DATOS = RAIZ / "datos"
FUENTE = DATOS / "fuente" / "datos_powerbi.json"

# Sedes del sistema (Backend del proyecto/services/rbac.py -> SEDES_VALIDAS)
SEDES = ["Soledad", "Barranquilla", "Colsamiro"]


def limpiar(valor) -> str:
    """Colapsa espacios y saltos de línea; None -> cadena vacía."""
    if valor is None:
        return ""
    texto = str(valor)
    texto = re.sub(r"[\r\n\t]+", " ", texto)
    texto = re.sub(r" {2,}", " ", texto)
    return texto.strip()


def iso(valor) -> str:
    """Normaliza fechas a ISO 8601 (sin zona horaria)."""
    if not valor:
        return ""
    texto = str(valor).strip().replace(" ", "T")
    return texto[:19] if "T" in texto else texto[:10]


def escribir(nombre: str, columnas: list[str], filas: list[list]) -> dict:
    destino = DATOS / nombre
    with destino.open("w", encoding="utf-8", newline="") as fh:
        escritor = csv.writer(fh, delimiter=",", quoting=csv.QUOTE_MINIMAL, lineterminator="\r\n")
        escritor.writerow(columnas)
        escritor.writerows(filas)
    contenido = destino.read_bytes()
    return {
        "archivo": nombre,
        "filas": len(filas),
        "columnas": columnas,
        "bytes": len(contenido),
        "sha256": hashlib.sha256(contenido).hexdigest(),
    }


def main() -> int:
    if not FUENTE.exists():
        raise SystemExit(f"No existe la instantánea: {FUENTE}")

    datos = json.loads(FUENTE.read_text(encoding="utf-8"))
    DATOS.mkdir(parents=True, exist_ok=True)

    # ── Libros (sin Autor: el tablero no lo necesita y así no hay nombres) ──
    libros = [
        [
            l.get("ID"),
            limpiar(l.get("Titulo")),
            limpiar(l.get("Programa")),
            limpiar(l.get("Sede")),
            limpiar(l.get("Idioma")),
            limpiar(l.get("Editorial")),
            l.get("Anio") if l.get("Anio") is not None else "",
            l.get("Ejemplar"),
        ]
        for l in datos["libros"]
    ]

    # ── Dispositivos ──────────────────────────────────────────────────────
    dispositivos = [
        [
            d.get("ID"),
            limpiar(d.get("Tipo")),
            limpiar(d.get("Marca")),
            limpiar(d.get("Modelo")),
            limpiar(d.get("Sede")),
            limpiar(d.get("Estado")),
            iso(d.get("Alta")),
        ]
        for d in datos["dispositivos"]
    ]

    # ── Préstamos de libros ───────────────────────────────────────────────
    prestamos_libros = [
        [
            p.get("ID"),
            limpiar(p.get("LibroID")),
            limpiar(p.get("Libro")),
            iso(p.get("FechaPrestamo")),
            iso(p.get("FechaEntrega")),
            iso(p.get("FechaDevolucion")),
            limpiar(p.get("Estado")),
            limpiar(p.get("Solicitud")),
            limpiar(p.get("Sede")),
        ]
        for p in datos["prestamosLibros"]
    ]

    # ── Préstamos de dispositivos ─────────────────────────────────────────
    prestamos_dispositivos = [
        [
            p.get("ID"),
            limpiar(p.get("Dispositivo")),
            iso(p.get("FechaPrestamo")),
            iso(p.get("FechaDevolucion")),
            limpiar(p.get("Estado")),
            limpiar(p.get("Sede")),
        ]
        for p in datos["prestamosDispositivos"]
    ]

    # ── Ingresos a biblioteca (sin user_id / user_name) ───────────────────
    ingresos = [
        [iso(a.get("Fecha")), limpiar(a.get("Estado")), limpiar(a.get("Sede"))]
        for a in datos["ingresos"]
    ]

    # ── Usuarios agregados (sin datos personales) ─────────────────────────
    usuarios = [
        [
            limpiar(u.get("Sede")),
            limpiar(u.get("Rol")),
            limpiar(u.get("Carrera")),
            limpiar(u.get("Nivel")),
            u.get("Cantidad"),
        ]
        for u in datos["usuariosAgregado"]
    ]

    # ── Sedes (tabla de dimensión del filtro) ─────────────────────────────
    sedes = [[s] for s in SEDES]

    manifiesto = {
        "generado_en": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "instantanea": {
            "archivo": "fuente/datos_powerbi.json",
            "capturada_en": datos.get("generado"),
            "fuente": datos.get("fuente"),
            "sha256": hashlib.sha256(FUENTE.read_bytes()).hexdigest(),
        },
        "privacidad": {
            "datos_personales_incluidos": False,
            "excluidos": ["nombre", "identificacion", "email", "phone", "address", "user_id"],
            "usuarios": "agregados por sede + rol + carrera + nivel",
        },
        "tablas": [
            escribir(
                "libros.csv",
                ["ID", "Titulo", "Programa", "Sede", "Idioma", "Editorial", "Anio", "Ejemplar"],
                libros,
            ),
            escribir(
                "dispositivos.csv",
                ["ID", "Tipo", "Marca", "Modelo", "Sede", "Estado", "Alta"],
                dispositivos,
            ),
            escribir(
                "prestamos_libros.csv",
                ["ID", "LibroID", "Libro", "FechaPrestamo", "FechaEntrega", "FechaDevolucion", "Estado", "Solicitud", "Sede"],
                prestamos_libros,
            ),
            escribir(
                "prestamos_dispositivos.csv",
                ["ID", "Dispositivo", "FechaPrestamo", "FechaDevolucion", "Estado", "Sede"],
                prestamos_dispositivos,
            ),
            escribir("ingresos.csv", ["Fecha", "Estado", "Sede"], ingresos),
            escribir(
                "usuarios_agregados.csv",
                ["Sede", "Rol", "Carrera", "Nivel", "Cantidad"],
                usuarios,
            ),
            escribir("sedes.csv", ["Sede"], sedes),
        ],
    }

    (DATOS / "manifiesto.json").write_text(
        json.dumps(manifiesto, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    for tabla in manifiesto["tablas"]:
        print(f"{tabla['archivo']:<32} {tabla['filas']:>4} filas  {tabla['bytes']:>7} bytes")
    print(f"\nmanifiesto.json escrito en {DATOS}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
