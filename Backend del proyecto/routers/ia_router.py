"""
ia_router.py — Endpoints de Inteligencia Artificial
====================================================
Expone las capacidades de IA del sistema:

  POST /api/ia/chat           → asistente virtual (IUBot)
  GET  /api/ia/buscar         → búsqueda semántica del catálogo
  GET  /api/ia/recomendaciones→ recomendaciones por perfil/historial
  GET  /api/ia/dashboard      → insights predictivos (solo admin)
  GET  /api/ia/estado         → estado del motor de IA
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, Libro
from auth import verificar_token, requiere_modulo
from services.rbac import sede_efectiva
from services.ia import chatbot, predictivo, asistente
from services.ia.busqueda_semantica import buscar
from services.ia.recomendador import recomendar
from services.ia import llm_client

ia_router = APIRouter(prefix="/api/ia", tags=["IA"])


# ─── Esquemas ────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    mensaje: str


class ChatResponse(BaseModel):
    respuesta: str
    motor: str
    intencion: str
    fuentes: Optional[List[str]] = None


class LibroResultado(BaseModel):
    id: int
    titulo: str
    autor: str
    programa: str
    editorial: Optional[str] = None
    idioma: Optional[str] = None
    ejemplares: int
    score: float


class Recomendacion(BaseModel):
    id: int
    titulo: str
    autor: str
    programa: str
    ejemplares: int
    score: float
    razon: str


def _a_resultado(libro, score: float) -> LibroResultado:
    return LibroResultado(
        id=libro.ID,
        titulo=libro.Titulo,
        autor=libro.Autor,
        programa=libro.Programa,
        editorial=libro.Editorial,
        idioma=libro.Idioma,
        ejemplares=libro.Ejemplar or 0,
        score=score,
    )


# ─── Chat / asistente virtual ────────────────────────────────────────────
@ia_router.post("/chat", response_model=ChatResponse, summary="Asistente Bibliotecario IUB (orquestador)")
def chat(
    data: ChatRequest,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verificar_token),
):
    """
    Envía un mensaje al asistente bibliotecario integral (Fase IA 5.3):
    INSTITUCIONAL (RAG e5+guard) / CATÁLOGO / DISPONIBILIDAD / RECOMENDACIONES /
    PRÉSTAMOS propios / dispositivos. Usa token_data para identidad (user_id
    revalidado en BD); no expone datos de terceros ni hace operaciones
    administrativas. Contrato idéntico al anterior.
    """
    user_id = token_data.get("id")
    return asistente.atender(db, data.mensaje, user_id=user_id, canal="web")


# ─── Búsqueda semántica ──────────────────────────────────────────────────
@ia_router.get("/buscar", response_model=List[LibroResultado], summary="Búsqueda semántica del catálogo")
def buscar_catalogo(
    q: str = Query(..., description="Consulta por intención, ej: 'administración de empresas'"),
    top_k: int = Query(8, ge=1, le=50),
    db: Session = Depends(get_db),
    _: dict = Depends(verificar_token),
):
    """Busca libros por intención, no solo por coincidencia de palabras."""
    resultados = buscar(db, q, top_k=top_k, min_score=0.05)
    return [_a_resultado(r["libro"], r["score"]) for r in resultados]


# ─── Recomendaciones ─────────────────────────────────────────────────────
@ia_router.get("/recomendaciones", response_model=List[Recomendacion], summary="Recomendaciones personalizadas")
def recomendaciones(
    top_k: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    token_data: dict = Depends(verificar_token),
):
    """Recomienda libros según la carrera, historial y popularidad del usuario."""
    user_id = token_data.get("id")
    resultados = recomendar(db, user_id=user_id, top_k=top_k)
    return [
        Recomendacion(
            id=r["libro"].ID,
            titulo=r["libro"].Titulo,
            autor=r["libro"].Autor,
            programa=r["libro"].Programa,
            ejemplares=r["libro"].Ejemplar or 0,
            score=r["score"],
            razon=r["razon"],
        )
        for r in resultados
    ]


# ─── Dashboard predictivo (solo admin) ───────────────────────────────────
@ia_router.get("/dashboard", summary="Panel de insights predictivos (solo administradores)")
def dashboard_ia(
    db: Session = Depends(get_db),
    token_data: dict = Depends(requiere_modulo("dashboard")),
):
    """Reportes inteligentes: tendencia, morosidad, demanda y disponibilidad.

    El super administrador ve todas las sedes; el resto solo la suya.
    """
    return predictivo.resumen(db, sede=sede_efectiva(token_data))


# ─── Estado del motor de IA ──────────────────────────────────────────────
@ia_router.get("/estado", summary="Estado del motor de IA")
def estado_ia(
    _: dict = Depends(verificar_token),
):
    """Indica si el LLM local (Ollama) está disponible o si se usa el motor determinista."""
    return llm_client.estado()