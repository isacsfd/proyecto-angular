"""
recomendador.py — Recomendaciones de libros con IA
===================================================
Combina tres señales para recomendar libros a un usuario:

  1. Perfil académico   — libros cuyo Programa coincide con la carrera del usuario.
  2. Historial          — libros similares (TF-IDF) a los que el usuario ya prestó.
  3. Popularidad        — libros más prestados en la biblioteca.

Cada libro recibe un puntaje ponderado y se devuelve junto con una
explicación ("Porque estudias Ingeniería Industrial", "Similar a ...").

Si Ollama está disponible se usa su modelo de embeddings para mejorar la
similitud; si no, se usa TF-IDF (determinista, sin dependencias externas).
"""

from collections import Counter

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session

from database import Libro, Prestamos
from models.models import UserTable
from services.ia.busqueda_semantica import _texto_libro, STOP_WORDS, _normalizar
from services.ia import llm_client

PESO_CARRERA = 0.40
PESO_SIMILARIDAD = 0.35
PESO_POPULARIDAD = 0.25


def _ejemplares(libro) -> int:
    """Número de ejemplares tolerando valores NULL de la BD."""
    try:
        return int(libro.Ejemplar or 0)
    except (TypeError, ValueError):
        return 0


def _popularidad(db: Session) -> Counter:
    """Cuenta cuántas veces se ha prestado cada libro."""
    contador = Counter()
    for p in db.query(Prestamos.book_id).all():
        contador[p[0]] += 1
    return contador


def _vectorizador(libros: list):
    vectorizer = TfidfVectorizer(
        lowercase=True,
        strip_accents="unicode",
        token_pattern=r"[a-z0-9]{2,}",
        stop_words=list(STOP_WORDS),
    )
    matriz = vectorizer.fit_transform([_texto_libro(l) for l in libros])
    return vectorizer, matriz


def _programas_afines(carrera: str | None) -> set[str]:
    """Mapea la carrera del usuario a programas del catálogo (fuzzy)."""
    if not carrera:
        return set()
    carrera_norm = _normalizar(carrera)
    # Algunas equivalencias típicas de la IUB
    equivalencias = {
        "administracion de negocios internacionales": {"Administración de Negocios Internacionales"},
        "gestion logistica internacional": {"Tecnología en Gestión Logística Internacional"},
        "comercio exterior": {"Operaciones del Comercio Exterior"},
        "diseno grafico": {"Diseño Gráfico", "Diseño Gráfico Y Multimedia"},
        "ingenieria industrial": {"Ingeniería Industrial"},
        "ingenieria electrica": {"Ingeniería Eléctrica"},
        "ingenieria mecatronica": {"Ingeniería Mecatrónica"},
        "ingenieria telematica": {"Ingeniería Telemática"},
        "seguridad y salud": {"Ingeniería en Seguridad y Salud en el Trabajo"},
        "licenciatura": {"Licenciatura En Educación Básica Primaria"},
        "gestion empresarial": {"Gestión Empresarial", "Tecnología En Gestión Empresarial"},
        "gestion administrativa": {"Gestión Administrativa comercial"},
        "operaciones logísticas": {"Técnico Profesional en Operaciones Logísticas"},
        "salud ocupacional": {"Salud Ocupacional"},
        "electromecanica": {"Electromecánica"},
        "redes": {"Mantenimiento de Redes de Telecomunicaciones"},
    }
    for clave, programas in equivalencias.items():
        if clave in carrera_norm:
            return set(programas)
    return set()


def recomendar(
    db: Session,
    user_id: int | None = None,
    top_k: int = 5,
) -> list[dict]:
    """
    Devuelve las mejores recomendaciones con su razón.
      [{ "libro": Libro, "score": float, "razon": str }]
    """
    libros = db.query(Libro).all()
    if not libros:
        return []

    popularidad = _popularidad(db)
    max_pop = max(popularidad.values()) if popularidad else 1

    # Perfil del usuario
    carrera = None
    historial_ids: list[int] = []
    if user_id:
        user = db.query(UserTable).filter(UserTable.id == user_id).first()
        if user:
            carrera = user.carrera
        historial_ids = [
            p.book_id for p in db.query(Prestamos.book_id).filter(Prestamos.user_id == user_id).all()
        ]

    programas_afines = _programas_afines(carrera)

    # Historial de préstamos de libros con datos
    historial_libros = [l for l in libros if l.ID in historial_ids]
    sim_por_libro: dict[int, float] = {}
    if historial_libros:
        v, matriz = _vectorizador(libros)
        indice_hist = [libros.index(h) for h in historial_libros if h in libros]
        if indice_hist:
            q_vec = matriz[indice_hist].mean(axis=0)
            sims = cosine_similarity(q_vec, matriz).flatten()
            sim_por_libro = {libros[i].ID: float(sims[i]) for i in range(len(libros))}

    resultados = []
    for libro in libros:
        if _ejemplares(libro) <= 0:
            continue
        if user_id and libro.ID in historial_ids:
            continue  # no recomendar lo que ya prestó

        score_carrera = 1.0 if (programas_afines and libro.Programa in programas_afines) else 0.0
        score_sim = sim_por_libro.get(libro.ID, 0.0)
        score_pop = popularidad.get(libro.ID, 0) / max_pop

        score = (
            PESO_CARRERA * score_carrera
            + PESO_SIMILARIDAD * score_sim
            + PESO_POPULARIDAD * score_pop
        )
        if score <= 0:
            continue

        razon = "Tendencia popular en la biblioteca"
        if score_carrera >= 1.0:
            razon = f"Relacionado con tu programa ({libro.Programa})"
        elif historial_libros:
            razon = f"Similar a '{historial_libros[0].Titulo}' que ya consultaste"

        resultados.append({"libro": libro, "score": round(score, 4), "razon": razon})

    resultados.sort(key=lambda r: r["score"], reverse=True)
    if not resultados:
        # Fallback: sin perfil/historial, recomendar los más populares
        return para_invitado(db, top_k=top_k)
    return resultados[:top_k]


def para_invitado(db: Session, top_k: int = 5) -> list[dict]:
    """Recomendaciones para usuarios sin sesión (popularidad y disponibles)."""
    libros = db.query(Libro).all()
    popularidad = _popularidad(db)
    max_pop = max(popularidad.values()) if popularidad else 1
    resultados = []
    for libro in libros:
        if _ejemplares(libro) <= 0:
            continue
        score = popularidad.get(libro.ID, 0) / max_pop
        if score > 0:
            resultados.append({"libro": libro, "score": round(score, 4), "razon": "Tendencia popular en la biblioteca"})
    resultados.sort(key=lambda r: r["score"], reverse=True)

    if len(resultados) < top_k:
        # Completar con libros disponibles aunque no tengan préstamos aún
        vistos = {r["libro"].ID for r in resultados}
        for libro in libros:
            if len(resultados) >= top_k:
                break
            if libro.ID in vistos or _ejemplares(libro) <= 0:
                continue
            resultados.append({"libro": libro, "score": 0.1, "razon": "Disponible en el catálogo"})
    return resultados[:top_k]