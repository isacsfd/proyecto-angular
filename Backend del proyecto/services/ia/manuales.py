"""
manuales.py — Búsqueda en los manuales institucionales (RAG-lite local)
=======================================================================
Indexa los documentos de `docs/` (manuales de pregrado, posgrado, prácticas y
el acuerdo 29/2021) y permite recuperar los fragmentos más relevantes para una
pregunta del chatbot.

- Extrae texto de PDF con `pypdf` (si no está instalado, se omiten los PDF).
- Trocea por página en fragmentos (~900 caracteres, solape 150).
- Índice TF-IDF (scikit-learn) + similitud coseno, con caché por fecha/tamaño.
- No usa servicios externos; si no hay documentos, devuelve lista vacía.

Variables de entorno:
  MM_MANUALES_DIR  (default: <raíz del repo>/docs)
"""

import os
import re
from typing import Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

_EXTENSIONES = (".pdf", ".txt")
_EXCLUIR_PREFIJOS = ("documentacion",)
_CACHE = {"firma": None, "vec": None, "mat": None, "meta": []}


def _directorio() -> str:
    propio = os.getenv("MM_MANUALES_DIR")
    if propio:
        return propio
    raiz = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    return os.path.join(raiz, "docs")


def _archivos() -> list[str]:
    directorio = _directorio()
    if not os.path.isdir(directorio):
        return []
    salida = []
    for nombre in sorted(os.listdir(directorio)):
        ruta = os.path.join(directorio, nombre)
        if not os.path.isfile(ruta):
            continue
        if not nombre.lower().endswith(_EXTENSIONES):
            continue
        if nombre.lower().startswith(_EXCLUIR_PREFIJOS):
            continue  # excluye la documentación generada del proyecto
        salida.append(ruta)
    return salida


def _leer_pdf(ruta: str) -> list[tuple[int, str]]:
    try:
        from pypdf import PdfReader
    except Exception:
        return []
    try:
        lector = PdfReader(ruta)
        paginas = []
        for i, pagina in enumerate(lector.pages, 1):
            try:
                paginas.append((i, pagina.extract_text() or ""))
            except Exception:
                paginas.append((i, ""))
        return paginas
    except Exception:
        return []


def _leer_texto(ruta: str) -> list[tuple[int, str]]:
    try:
        with open(ruta, encoding="utf-8", errors="ignore") as f:
            return [(1, f.read())]
    except Exception:
        return []


def _fragmentos(texto: str, tam: int = 900, solape: int = 150) -> list[str]:
    limpio = re.sub(r"\s+", " ", texto or "").strip()
    if not limpio:
        return []
    piezas = []
    i = 0
    paso = max(1, tam - solape)
    while i < len(limpio):
        piezas.append(limpio[i:i + tam])
        i += paso
    return piezas


def _firma(archivos: list[str]) -> tuple:
    return tuple((r, os.path.getmtime(r), os.path.getsize(r)) for r in archivos)


def _construir():
    archivos = _archivos()
    firma = _firma(archivos)
    if _CACHE["firma"] == firma and _CACHE["vec"] is not None:
        return _CACHE

    meta = []
    for ruta in archivos:
        fuente = os.path.basename(ruta)
        paginas = _leer_pdf(ruta) if ruta.lower().endswith(".pdf") else _leer_texto(ruta)
        for numero, texto in paginas:
            for trozo in _fragmentos(texto):
                meta.append({"texto": trozo, "fuente": fuente, "pagina": numero})

    if not meta:
        _CACHE.update({"firma": firma, "vec": None, "mat": None, "meta": []})
        return _CACHE

    textos = [m["texto"] for m in meta]
    vectorizador = TfidfVectorizer(
        lowercase=True,
        strip_accents="unicode",
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=1,
    )
    matriz = vectorizador.fit_transform(textos)
    _CACHE.update({"firma": firma, "vec": vectorizador, "mat": matriz, "meta": meta})
    return _CACHE


def reiniciar_cache() -> None:
    _CACHE.update({"firma": None, "vec": None, "mat": None, "meta": []})


def buscar(pregunta: str, top_k: int = 4, min_score: float = 0.10) -> list[dict]:
    """Devuelve los fragmentos de manuales más relevantes para la pregunta."""
    pregunta = (pregunta or "").strip()
    if not pregunta:
        return []
    datos = _construir()
    if datos["vec"] is None or not datos["meta"]:
        return []
    try:
        consulta = datos["vec"].transform([pregunta])
        similitudes = cosine_similarity(consulta, datos["mat"]).ravel()
    except Exception:
        return []
    indices = similitudes.argsort()[::-1][: max(1, top_k)]
    resultados = []
    for idx in indices:
        score = float(similitudes[idx])
        if score < min_score:
            continue
        m = datos["meta"][idx]
        resultados.append({"texto": m["texto"], "fuente": m["fuente"], "pagina": m["pagina"], "score": score})
    return resultados


def estado() -> dict:
    datos = _construir()
    return {
        "directorio": _directorio(),
        "archivos": len({m["fuente"] for m in datos["meta"]}),
        "fragmentos": len(datos["meta"]),
    }