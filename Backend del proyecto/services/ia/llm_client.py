"""
llm_client.py — Cliente de modelos de lenguaje locales (Ollama)
================================================================
Motor de IA compatible con Python y 100% local/privado.

Si Ollama no está instalado o no responde, todas las funciones devuelven
None y los servicios de IA caen automáticamente a algoritmos deterministas
(TF-IDF, reglas, estadística clásica). Así el sistema funciona siempre.

Configuración vía variables de entorno:
  OLLAMA_HOST     (default http://localhost:11434)
  OLLAMA_MODEL    (default llama3.2)
  OLLAMA_EMBED_MODEL (default nomic-embed-text)
  OLLAMA_TIMEOUT  (default 2.0)   — timeout del chequeo de disponibilidad
  OLLAMA_GEN_TIMEOUT (default 60.0) — timeout de generación de respuestas
  OLLAMA_CHECK_TTL (default 30)   — segundos que se cachea la disponibilidad
"""

import os
import time
import logging

import httpx

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
CHECK_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "2.0"))
GEN_TIMEOUT = float(os.getenv("OLLAMA_GEN_TIMEOUT", "60.0"))
CHECK_TTL = float(os.getenv("OLLAMA_CHECK_TTL", "30"))

logger = logging.getLogger("ia.llm")

_cache = {"disponible": None, "check": 0.0}


def disponible() -> bool:
    """Indica si Ollama responde. El resultado se cachea durante CHECK_TTL."""
    ahora = time.time()
    if _cache["disponible"] is not None and ahora - _cache["check"] < CHECK_TTL:
        return _cache["disponible"]
    try:
        r = httpx.get(f"{OLLAMA_HOST}/api/tags", timeout=CHECK_TIMEOUT)
        ok = r.status_code == 200
    except Exception:
        ok = False
    _cache.update({"disponible": ok, "check": ahora})
    return ok


def estado() -> dict:
    """Estado del motor LLM para exponer en /api/ia/estado."""
    return {
        "motor_llm": "ollama" if disponible() else "determinista",
        "host": OLLAMA_HOST,
        "modelo": DEFAULT_MODEL,
        "disponible": disponible(),
    }


def chat(prompt: str, system: str | None = None, model: str = DEFAULT_MODEL) -> str | None:
    """
    Envía un prompt al LLM local. Devuelve el texto de la respuesta o None
    si el modelo no está disponible (el llamador usa su fallback).
    """
    if not disponible():
        return None

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.3, "num_ctx": 4096},
    }

    try:
        r = httpx.post(f"{OLLAMA_HOST}/api/chat", json=payload, timeout=GEN_TIMEOUT)
        if r.status_code == 200:
            texto = (r.json().get("message", {}) or {}).get("content", "").strip()
            return texto or None
        logger.warning("Ollama respondió status=%s", r.status_code)
    except Exception as e:
        logger.warning("Ollama chat falló: %s", e)
    return None


def embeddings(textos: list[str], model: str = EMBED_MODEL) -> list[list[float]] | None:
    """
    Genera embeddings para una lista de textos. Devuelve None si no hay
    Ollama o el modelo de embeddings no está descargado.
    """
    if not disponible() or not textos:
        return None
    try:
        r = httpx.post(
            f"{OLLAMA_HOST}/api/embed",
            json={"model": model, "input": textos},
            timeout=GEN_TIMEOUT,
        )
        if r.status_code == 200:
            return r.json().get("embeddings") or None
    except Exception as e:
        logger.warning("Ollama embed falló: %s", e)
    return None