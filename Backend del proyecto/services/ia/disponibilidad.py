"""disponibilidad.py — Consulta DETERMINISTA de disponibilidad de libros
=======================================================================
P0 Fase IA 5.3: usa EXCLUSIVAMENTE los datos actuales de la base:

* ``Libro.Ejemplar``: inventario vigente (el sistema de préstamos lo
  descuenta al aprobar y lo repone al devolver/rechazar).
* ``Prestamos.state`` ('Activo'/'Vencido'): préstamos en curso actualmente.

Reglas:
* Lee la BD en cada solicitud.
* No muta préstamos, libros ni nada.
* No inventa: si el modelo no modela algo (copias individuales por sede),
  lo declara en ``nota_sede``.
* Nunca revela préstamos de terceros: los datos personales del préstamo
  sólo se muestran si se consulta con ``user_id`` propio.
"""

from sqlalchemy import func
from sqlalchemy.orm import Session  # noqa: F401 (tipado)

import difflib
import re
import unicodedata

from database import Libro, Prestamos

SEDES_VALIDAS = ("Soledad", "Barranquilla", "Colsamiro")

NOTA_SEDE = (
    "El modelo vigente registra una sede por título (NO existen copias individuales "
    "por sede), por lo que la disponibilidad se reporta a nivel de título."
)


def _normalizar_titulo(s: str) -> str:
    t = unicodedata.normalize("NFD", (s or "").lower())
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Mn")
    for simbolo in ('»', '«', '"', "'", "“", "”"):
        t = t.replace(simbolo, " ")
    return " ".join(t.replace("\t", " ").split())


def titulo_especifico(texto: str) -> str | None:
    """Detecta si la consulta va dirigida a UN título concreto.

    Devuelve el título extraído SOLO cuando:
    * título entre comillas '«X»' o '"X"' (texto crudo);
    * 'disponibilidad de <X>' / 'disponibilidad del libro <X>'
    * '¿tienes el libro <X>?' (singular 'libro' => título; 'libros de' => tema)
    * 'busca (el|libro) <X>' (singular)
    Las consultas temáticas ('busca libros de X', 'sobre X') NO son título
    específico: pasan por la búsqueda semántica existente.
    """
    crudo = (texto or "").strip()
    for patr in (r"«(.+?)»", r'"(.+?)"'):
        m = re.search(patr, crudo)
        if m:
            t = m.group(1).strip(" .¿?¡!")
            if len(t) >= 3:
                return t
    t = _normalizar_titulo(texto)
    patrones = (
        r"disponibilidad (?:de|del) (?:el )?libro (.+?)[?.!]*$",
        r"disponibilidad (?:de|del) (.+?)[?.!]*$",
        r"tienes el libro (.+?)[?.!]*$",
        r"busca(?:r)? el (?:libro )?(.+?)[?.!]*$",
        r"busca(?:r)? libro (.+?)[?.!]*$",
        r"busca(?:r)? libros (?:sobre |de |del )?(.+?)[?.!]*$",
    )
    for patr in patrones:
        m = re.search(patr, t)
        if m:
            titulo = m.group(1).strip(" .¿?¡!")
            if len(titulo) >= 3:
                # si inicia con preposiciones temáticas, NO es un título específico
                if not re.match(r"^(de|sobre|acerca|con|para)\b", titulo):
                    return titulo
    return None


def _tokens(s: str) -> set:
    return {w for w in re.split(r"[^a-z0-9]+", _normalizar_titulo(s)) if len(w) >= 3}


def determinar_modo(db, titulo: str) -> dict:
    """Estrategia determinista para un título concreto.
    Devuelve {'modo': exacto|parcial|sugerencia|no_encontrado, 'libros', 'por_autor'}:

    * exacto       — coincidencia exacta normalizada (mayúsculas/acentos/tildes).
    * parcial      — el título pedido está contenido en un título de la BD.
    * por_autor    — los tokens coinciden con el campo AUTOR (H-4: nombres de autor).
    * sugerencia   — difflib de título y solapamiento de tokens (≥2 tokens comunes
                     o prefijo incompleto), con umbral ≥0.72/0.78 según longitud.
    * no_encontrado — nada razonable; no se ofrecen alternativas.

    H-4 Fase 5.6: incluye palabras incompletas (prefijo) y cruce con AUTOR;
    mantiene exacto/parcial primeros. NO muestra disponibilidad como si fuera
    coincidencia confirmada (el que presentar aparte corresponde al orquestador).
    """
    libros = db.query(Libro).order_by(Libro.ID).all()
    objetivo = _normalizar_titulo(titulo)
    exacto = [l for l in libros if _normalizar_titulo(l.Titulo) == objetivo]
    if exacto:
        return {"modo": "exacto", "libros": exacto, "por_autor": []}
    parcial = [l for l in libros if objetivo in _normalizar_titulo(l.Titulo)]
    if parcial:
        return {"modo": "parcial", "libros": parcial[:5], "por_autor": []}

    objetivo_tok = _tokens(objetivo)

    # H-4: por autor (nombres de autores, con masa de tokens)
    por_autor = []
    if objetivo_tok:
        por_autor = [
            l for l in libros
            if any("; " not in str(l.Autor or "")) and
            len(objetivo_tok & {_w for _w in _tokens(str(l.Autor or '')) if len(_w) >= 4}) >= 1 and
            objetivo_tok.issubset(
                {_w for _w in _tokens(str(l.Autor or '')) if len(_w) >= 3}.union(
                    {w for tl in _tokens(str(l.Titulo or '')) if False})
            )
        ]
        # Simplificación razonable: autor cuyo texto contiene al menos 1 token (>= 4)
        # del pedido y NO posee ningún token del Título distinto (evita mezclas).
        por_autor = [
            l for l in libros
            if objetivo_tok.intersection({_w for _w in _tokens(str(l.Autor or '')) if len(_w) >= 4})
            and not ({
                _w for _w in _tokens(str(l.Titulo or '')) if len(_w) >= 3
            } and objetivo_tok.difference(
                {_w for _w in _tokens(str(l.Titulo or '')) if len(_w) >= 3}
            ) == set())
        ]

    # H-4: fuzzy de títulos con difflib + solapamiento de tokens incompletos
    pares = []
    for l in libros:
        titulo_n = _normalizar_titulo(l.Titulo)
        ratio_global = difflib.SequenceMatcher(None, objetivo, titulo_n).ratio()
        t_tit = _tokens(l.Titulo)
        # prefijo incompleto: todo token del pedido coincide como prefijo de un token del título
        prefijo_ok = objetivo_tok and all(
            any(t.startswith(w) for t in t_tit) for w in objetivo_tok if len(w) >= 4
        )
        solape = len(objetivo_tok & t_tit)
        lit_igual = abs(len(objetivo) - len(titulo_n)) <= max(2, len(objetivo) // 8)
        if ratio_global >= 0.72 and (solape >= min(2, len(objetivo_tok)) or lit_igual or prefijo_ok):
            pares.append((ratio_global, l))
    pares.sort(key=lambda x: -x[0])
    sugeridos = [l for _, l in pares[:3]]
    if sugeridos or por_autor:
        return {"modo": "sugerencia", "libros": sugeridos, "por_autor": por_autor}
    return {"modo": "no_encontrado", "libros": [], "por_autor": []}


def prestados_activos_count(db, libro_id) -> int:
    """Préstamos ACTUALES en préstamo sobre un libro (agregado, sin datos personales)."""
    activos = db.query(func.count(Prestamos.id)).filter(
        Prestamos.book_id == str(libro_id),
        Prestamos.state == "Activo",
    ).scalar()
    return int(activos or 0)


def de_libro(db, libro, user_id=None) -> dict:
    """Resumen de disponibilidad de un libro concreto."""
    disponibles = int(libro.Ejemplar or 0)
    activos = prestados_activos_count(db, libro.ID)
    datos = {
        "id": libro.ID,
        "titulo": libro.Titulo,
        "autor": libro.Autor,
        "programa": libro.Programa,
        "signatura": getattr(libro, "Signatura", None),
        "sede": str(getattr(libro, "sede", "")),
        "disponibles": disponibles,
        "prestadosActivos": activos,
        "puedePrestar": disponibles > 0,
        "nota_sede": NOTA_SEDE,
    }
    if user_id:
        propios = db.query(Prestamos).filter(
            Prestamos.user_id == user_id,
            Prestamos.book_id == str(libro.ID),
            Prestamos.state == "Activo",
        ).all()
        datos["misPrestamos"] = [
            {"entrega": str(p.delivery_date), "estado": str(p.prestamo_state)} for p in propios
        ]
    return datos


def por_busqueda(db, texto: str, top_k: int = 5, user_id=None, sede_filtro: str = None) -> list:
    """Encuentra libros por texto (búsqueda semántica existente, sin modificarla)
    y adjunta su disponibilidad determinista. Incluye libros SIN ejemplares
    (para responder fielmente 'sin ejemplares' en vez de ocultarlos)."""
    from services.ia.busqueda_semantica import buscar

    resultados = buscar(db, texto, top_k=max(top_k * 2, 8), min_score=0.05, solo_disponibles=False)
    salida = []
    for r in resultados:
        libro = r["libro"]
        if sede_filtro and str(getattr(libro, "sede", "")) != sede_filtro:
            continue
        salida.append({"score": r["score"], **de_libro(db, libro, user_id=user_id)})
        if len(salida) >= top_k:
            break
    return salida


def resumen_por_sede(db) -> list:
    """Resumen por sede: títulos registrados y ejemplares disponibles (sum)."""
    filas = (
        db.query(
            Libro.sede,
            func.count(Libro.ID),
            func.sum(func.coalesce(Libro.Ejemplar, 0)),
        )
        .group_by(Libro.sede)
        .all()
    )
    return [
        {"sede": str(s), "titulos": int(t or 0), "ejemplaresDisponibles": int(e or 0)}
        for (s, t, e) in filas
    ]


def sede_en_texto(texto: str) -> str | None:
    """Detecta si el usuario menciona una sede válida (sin inventarla)."""
    t = (texto or "").lower()
    for sede in SEDES_VALIDAS:
        if sede.lower() in t:
            return sede
    return None
