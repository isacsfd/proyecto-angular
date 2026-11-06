"""rag_definitivo.py — Interfaz compartida de recuperación y generación (Fase IA 4)
================================================================================
Canal único y determinista para chat documental (Open WebUI vía Pipe y futuro
bot de Telegram compartiendo exactamente: mismo modelo `llama3.2:1b`, misma
colección e5 (`37edddd0-…`), mismos embeddings, misma guarda y mismas reglas
de citación).

USO PENSADO (Telegram Fase 5):
    from services.ia.rag_definitivo import consultar
    res = consultar("¿Cuál es el horario de la biblioteca?")
    # res = {respuesta, fuentes, guarda, distancia_top1, latencia_ms, canal}

Funcionamiento:
  * En/Fase actual este módulo es la INTERFAZ COMPARTE; la ejecución real en
    producción vive en la Function pipe `biblioteca_iub_rag_guarda` dentro de
    Open WebUI (misma lógica, misma guarda, mismo umbral). Telegram consumirá
    el chat completions de Open WebUI contra ese modelo pipe (alternativa
    documentada a fondo en docs/informe_fase_ia4_rag_definitivo.md) — el bot
    no necesita implementar retrieval/LMM própios y herede 100% de las reglas.
  * Este módulo encapsula la llamada e parseo de respuesta, con variables de
    entorno_OWUI_URL y OWUI_TOKEN (nunca hardcodeadas) para el canal Open WebUI.
  * La guarda está dentro del pipe: la respuesta que llega ya fue decidida con
    determinismo (el módulo además conserva el veredicto del pipeline cuando
    el servidor lo expone en el texto institucional).

Restricciones: sin tokens en el código; sin nueva infraestructura; sin exponer
servicios; sin eliminar el chatbot TF-IDF clásico (se conservan ambos canales).
"""

import io
import json
import os
import time
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .rag_guard import FRASE_AUSENCIA, evaluate_evidence

# Identificadores estables del sistema documental (Fase IA 4)
MODELO_CHAT = 'biblioteca_iub_rag_guarda'          # Function pipe en Open WebUI
COLECCION_E5 = '37edddd0-ec75-4215-9b1f-f9472b66818c'
EMBEDDINGS = 'intfloat/multilingual-e5-small'
MODELO_LLM = 'llama3.2:1b'
UMBRAL_EVIDENCIA = 0.1572

_URL = os.environ.get('OWUI_URL', 'http://127.0.0.1:3000').rstrip('/')


@dataclass
class ResultadoDocumental:
    pregunta: str
    respuesta: str = ''
    fuentes: List[Dict[str, Any]] = field(default_factory=list)
    guarda: bool = False
    distancia_top1: Optional[float] = None
    latencia_ms: int = 0
    canal: str = 'open_webui_pipe'
    error: Optional[str] = None

    def fue_bloqueada(self) -> bool:
        """True si la resposta institucional de ausencia (guarda bloqueo)."""
        if not self.respuesta:
            return False
        return self.respuesta.startswith(FRASE_AUSENCIA)


def _token_actual() -> str:
    # Solo por entorno (y por descanso, para pruebas locales); nunca en código.
    return os.environ.get('OWUI_TOKEN', '')


def _auth_headers() -> Dict[str, str]:
    if not _token_actual():
        raise RuntimeError('OWUI_TOKEN no configurado (usar variable de entorno, nunca código)')
    return {'Authorization': f'Bearer {_token_actual()}', 'Content-Type': 'application/json'}


def _stream_respuesta(pregunta: str, timeout_s: int):
    """Yield eventos SSE (dict) del canal Open WebUIpipe. Stdlib únicamente
    (el paquete local `requests/` del backend hace sombra al lib externo)."""
    req = urllib.request.Request(
        f'{_URL}/api/chat/completions',
        data=json.dumps({
            'model': MODELO_CHAT,
            'stream': True,
            'messages': [{'role': 'user', 'content': pregunta}],
        }).encode('utf-8'),
        headers=_auth_headers(),
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        if getattr(resp, 'status', getattr(resp, 'code', 200)) != 200:
            cuerpo = resp.read(400).decode('utf-8', 'ignore')
            yield {'status': resp.status_code, 'cuerpo': cuerpo, '__error__': True}
            return
        buf = b''
        while True:
            chunk = resp.read(4096)
            if not chunk:
                break
            buf += chunk
            while b'\n' in buf:
                linea, buf = buf.split(b'\n', 1)
                linea = linea.decode('utf-8', 'ignore').strip()
                if not linea.startswith('data: ') or linea.strip() == 'data: [DONE]':
                    continue
                try:
                    yield json.loads(linea[6:])
                except Exception:
                    continue


def _parse_fuentes(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    fuentes = []
    for el in data or []:
        metas = el.get('metadata') or []
        docs = el.get('document') or []
        for i, md in enumerate(metas):
            md = md or {}
            fuentes.append({
                'documento': md.get('source') or (el.get('source') or {}).get('name'),
                'start_index': md.get('start_index'),
                'distancia': md.get('distance'),
                'texto': (docs[i] if i < len(docs) else '')[:2000],
            })
    return fuentes


def consultar(pregunta: str, timeout_s: int = 900) -> ResultadoDocumental:
    """Canal compartido: Open WebUI pipe (guarda + RAG e5 + llama3.2:1b)."""
    t0 = time.perf_counter()
    res = ResultadoDocumental(pregunta=pregunta)
    try:
        contenido = []
        fuentes_exc = None
        for j in _stream_respuesta(pregunta, timeout_s):
            if j.get('__error__'):
                res.error = f"HTTP {j.get('status')}: {j.get('cuerpo', '')[:200]}"
                break
            if j.get('sources') and fuentes_exc is None:
                s = j['sources']
                fuentes_exc = s if isinstance(s, list) else [s]
            ch = (j.get('choices') or [{}])[0]
            txt = (((ch.get('message') or {}).get('content')) or
                   ((ch.get('delta') or {}).get('content')) or '')
            if txt:
                contenido.append(txt)
        res.respuesta = ''.join(contenido)
        res.fuentes = _parse_fuentes(fuentes_exc or [])
        if res.fuentes:
            dist = [f.get('distancia') for f in res.fuentes if f.get('distancia') is not None]
            if dist:
                res.distancia_top1 = min(float(d) for d in dist)
                ev = evaluate_evidence([res.distancia_top1])
                res.guarda = bool(ev['evidencia'])
        if res.respuesta.startswith(FRASE_AUSENCIA):
            res.guarda = False
    except Exception as exc:  # noqa: BLE001
        res.error = str(exc)[:300]
    res.latencia_ms = round((time.perf_counter() - t0) * 1000)
    return res


def resumen_para_telegram(res: ResultadoDocumental) -> str:
    """Convierte el resultado en el texto final del bot (misma regla de citación)."""
    if not res.respuesta:
        return FRASE_AUSENCIA
    return res.respuesta
