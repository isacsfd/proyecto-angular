"""
busqueda_semantica.py — Búsqueda por intención sobre el catálogo
================================================================
Convierte cada libro en un "documento" (título + autor + programa +
editorial + signatura + idioma + observaciones) y usa TF-IDF con
similitud coseno para encontrar los más relevantes a la consulta del
usuario. Funciona aunque la consulta no coincida palabra por palabra
con el título (búsqueda por intención).

Compatible con Python: usa scikit-learn, sin dependencias externas.
"""

import re
from typing import Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session

from database import Libro

STOP_WORDS = [
    "de", "la", "el", "los", "las", "un", "una", "unos", "unas", "y", "o", "u",
    "a", "ante", "bajo", "con", "contra", "para", "por", "que", "del", "al",
    "en", "es", "son", "como", "cual", "mas", "me", "mi", "se", "su",
    "libro", "libros", "cualquier", "todos", "todo", "sobre", "tambien",
    "hay", "dame", "buscar", "busca", "recomienda", "recomiendame", "quiero",
    "necesito", "porfavor", "cuales", "tiene", "dime", "muestra", "muestrame",
    "te", "para",
]

CAMPOS = ("Titulo", "Autor", "Programa", "Editorial", "Signatura", "Idioma", "Observaciones")

_acumulador = {"n": None, "hash": None, "vectorizer": None, "matriz": None, "libros": None}


def reiniciar_cache() -> None:
    """Limpia el índice TF-IDF cacheado (usado por los tests)."""
    _acumulador.update({"n": None, "hash": None, "vectorizer": None, "matriz": None, "libros": None})


def _normalizar(texto: str) -> str:
    """Normaliza: minúsculas, sin acentos y con caracteres válidos."""
    texto = texto.lower()
    mapa = {
        "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u",
        "ü": "u", "ñ": "n", "à": "a", "è": "e", "ì": "i", "ò": "o", "ù": "u",
    }
    for a, b in mapa.items():
        texto = texto.replace(a, b)
    texto = re.sub(r"[^a-z0-9\s]", " ", texto)
    return re.sub(r"\s+", " ", texto).strip()


def _texto_libro(libro) -> str:
    partes = [str(getattr(libro, campo) or "") for campo in CAMPOS]
    return _normalizar(" ".join(partes))


def _indice(db: Session):
    """Construye (y cachea) el índice TF-IDF del catálogo. Se reconstruye si cambia."""
    libros = db.query(Libro).order_by(Libro.ID.desc()).all()
    n = len(libros)
    hash_actual = hash(tuple(getattr(l, "ID") for l in libros))
    if _acumulador["hash"] == hash_actual and _acumulador["n"] == n:
        return _acumulador["libros"], _acumulador["vectorizer"], _acumulador["matriz"]

    if not libros:
        return [], None, None

    vectorizer = TfidfVectorizer(
        lowercase=True,
        strip_accents="unicode",
        token_pattern=r"[a-z0-9]{2,}",
        stop_words=STOP_WORDS,
    )
    matriz = vectorizer.fit_transform([_texto_libro(l) for l in libros])

    _acumulador.update(
        {"n": n, "hash": hash_actual, "vectorizer": vectorizer, "matriz": matriz, "libros": libros}
    )
    return libros, vectorizer, matriz


def buscar(
    db: Session,
    query: str,
    top_k: int = 8,
    min_score: float = 0.0,
    solo_disponibles: bool = False,
) -> list[dict]:
    """
    Busca libros por intención. Devuelve lista de dicts:
      {"libro": <model Libro>, "score": float, "coincide": bool}
    `coincide` indica si la consulta produjo al menos una coincidencia útil.
    """
    libros, vectorizer, matriz = _indice(db)
    if not libros or not vectorizer:
        return []

    q_vec = vectorizer.transform([_normalizar(query)])
    sims = cosine_similarity(q_vec, matriz).flatten()

    indices = sims.argsort()[::-1]
    resultados = []
    for i in indices:
        score = float(sims[i])
        if score <= min_score:
            continue
        libro = libros[i]
        if solo_disponibles and (not libro.Ejemplar or libro.Ejemplar <= 0):
            continue
        resultados.append({"libro": libro, "score": round(score, 4)})
        if len(resultados) >= top_k:
            break
    return resultados


def sugerencias(db: Session, top_k: int = 6) -> list[dict]:
    """Libros populares para mostrar cuando no hay consulta (página de inicio)."""
    libros, vectorizer, matriz = _indice(db)
    if not libros:
        return []
    # Popularidad = frecuencia en préstamos (se calcula en el recomendador);
    # aquí simplemente devolvemos los más recientes con ejemplares disponibles.
    sugeridos = [l for l in libros if l.Ejemplar > 0][:top_k]
    return [{"libro": l, "score": 1.0} for l in sugeridos]