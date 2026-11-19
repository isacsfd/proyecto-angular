# Power BI — Tablero Biblioteca IUB

Entregable del Parcial Corte 2 («Tablero en Power BI»). Documentación
completa en [`docs/POWERBI_TABLERO.md`](../docs/POWERBI_TABLERO.md).

```
powerbi/
├─ entrega/                    ← ENTREGABLES:
│                                 · TableroBibliotecaIUB.pbix (archivo final, con datos cargados)
│                                 · TableroBibliotecaIUB.pbit (proyecto maestro editable)
│                                 · TableroBibliotecaIUB.bim (esquema TMSL del modelo)
├─ TableroBibliotecaIUB/       ← proyecto fuente editable (PbixProj: TMSL + Report)
├─ datos/
│  ├─ fuente/datos_powerbi.json   ← instantánea real de la API (anonimizada)
│  ├─ *.csv                       ← tablas que lee el modelo (UTF-8, sin PII)
│  └─ manifiesto.json             ← conteos y SHA-256 de cada CSV
├─ herramientas/
│  ├─ generar_datos.py            ← JSON de la API → CSV + manifiesto
│  ├─ construir_proyecto.py       ← genera el proyecto PbixProj (determinista)
│  └─ validar_entregables.py      ← validador automático (datos, paquete, visuales)
└─ consultas/api.pq               ← Power Query/M para conectar directo a la API
```

## Uso rápido

1. Abrir `entrega/TableroBibliotecaIUB.pbix` en Power BI Desktop: el tablero
   **ya contiene los datos reales cargados** (5 tarjetas, 6 gráficos y filtro
   por sede).
2. Para actualizar datos: `python herramientas/generar_datos.py` (tras
   reponer `datos/fuente/datos_powerbi.json`) y `Inicio → Actualizar` en
   Desktop.
3. Para regenerar/editar el modelo: abrir `entrega/TableroBibliotecaIUB.pbit`
   (carga los CSV de `datos/` vía el parámetro `RutaDatos`) y volver a
   guardar como `.pbix` tras los cambios.

## Requisitos cubiertos

- **Indicadores (≥ 4):** 5 tarjetas (Total Libros, Total Ejemplares,
  Préstamos de Libros, Dispositivos Disponibles, Ingresos Registrados).
- **Gráficos (≥ 6):** 6 (barras, línea, 2 columnas, 2 anillos).
- **Filtro por sede:** slicer sobre `Sedes[Sede]` (RBAC:
  Soledad / Barranquilla / Colsamiro).
- **Datos reales** de la API de Render; sin métricas inventadas y sin datos
  personales.
- **Archivo editable:** `TableroBibliotecaIUB.pbix` entregado, con los datos
  reales cargados (producido abriendo el `.pbit` en Power BI Desktop, que
  cargó las tablas y renderizó el reporte, y guardando con *Guardar como*).
  El `.pbit` se conserva como proyecto maestro.

Validación: `python herramientas/validar_entregables.py`
