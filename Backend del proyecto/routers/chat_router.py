"""Chat en tiempo real para usuarios autenticados (parcial 2).

Contrato del WebSocket /api/chat/ws:
  - Conexión:  wss://host/api/chat/ws?token=<JWT>  (los navegadores no pueden
    enviar headers Authorization en WebSocket, por eso el token viaja en la
    consulta; se valida igual que un Bearer: firma, vigencia y usuario activo).
  - Entrante:  {"type": "ping"}  → mantiene viva la conexión tras proxys.
                {"message": "texto"} → difusión a todos los conectados.
  - Saliente:  {"type": "presence", "users": [{id, name}, ...]}
                {"type": "message", "user_id", "name", "message", "sent_at"}
                {"type": "pong"}

Un mismo usuario puede abrir varias pestañas: todas sus conexiones reciben
los mensajes y la presencia se deduplica por usuario (no hay conexiones
huérfanas). El hub vive en memoria: válido para el despliegue actual de una
sola instancia en Render.
"""
import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from auth import _decodificar_token
from database import SessionLocal
from models.models import UserTable

router = APIRouter(tags=["Chat en tiempo real"])

LARGO_MAX_MENSAJE = 1000
CODIGO_NO_AUTENTICADO = 4401
CODIGO_MENSAJE_INVALIDO = 4403


class ChatHub:
    """Registro de conexiones activas por usuario (soporta varias pestañas)."""

    def __init__(self) -> None:
        self.conexiones: dict[int, list[WebSocket]] = {}
        self.nombres: dict[int, str] = {}

    def conectar(self, websocket: WebSocket, user_id: int, nombre: str) -> None:
        self.conexiones.setdefault(user_id, []).append(websocket)
        self.nombres[user_id] = nombre

    def desconectar(self, websocket: WebSocket, user_id: int) -> bool:
        """Quita una conexión. Devuelve True si el usuario quedó sin conexiones."""
        sockets = self.conexiones.get(user_id)
        if sockets is None:
            return True
        restantes = [s for s in sockets if s is not websocket]
        if restantes:
            self.conexiones[user_id] = restantes
            return False
        self.conexiones.pop(user_id, None)
        self.nombres.pop(user_id, None)
        return True

    def usuarios(self) -> list[dict[str, Any]]:
        return [{"id": uid, "name": self.nombres[uid]} for uid in self.conexiones]

    async def difundir(self, payload: dict[str, Any]) -> None:
        caidas: list[tuple[int, WebSocket]] = []
        for uid, sockets in self.conexiones.items():
            for socket in sockets:
                try:
                    await socket.send_text(json.dumps(payload, ensure_ascii=False))
                except Exception:
                    caidas.append((uid, socket))
        for uid, socket in caidas:
            self.desconectar(socket, uid)

    async def entrar(self, websocket: WebSocket, user_id: int, nombre: str) -> None:
        await websocket.accept()
        self.conectar(websocket, user_id, nombre)
        await self.difundir({"type": "presence", "users": self.usuarios()})

    async def salir(self, websocket: WebSocket, user_id: int) -> None:
        quedo_sin_conexiones = self.desconectar(websocket, user_id)
        if quedo_sin_conexiones:
            # Solo cambia la presencia si el usuario se fue del todo.
            await self.difundir({"type": "presence", "users": self.usuarios()})


hub = ChatHub()


def _identidad_por_token(db, token: str) -> tuple[int, str] | None:
    """Valida el JWT y devuelve (user_id, nombre) o None con el motivo en None.

    Levanta HTTPException(401) con el motivo concreto: el llamador la traduce
    a un cierre limpio del WebSocket (código 4401).
    """
    if not token:
        raise HTTPException(status_code=401, detail="Autenticación requerida")
    try:
        claims = _decodificar_token(token)
    except HTTPException as exc:
        # _decodificar_token reporta token inválido/expirado como HTTPException.
        raise HTTPException(status_code=401, detail=str(exc.detail)) from exc
    user_id = claims.get("id")
    if not isinstance(user_id, int) or user_id <= 0:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = db.query(UserTable).filter(UserTable.id == user_id).first()
    if not user or not user.rol:
        raise HTTPException(status_code=401, detail="Usuario no autorizado")
    return user.id, user.nombre


@router.websocket("/api/chat/ws")
async def realtime_chat(websocket: WebSocket, token: str = ""):
    db = SessionLocal()
    user_id: int | None = None
    try:
        try:
            identidad = _identidad_por_token(db, token)
        except HTTPException as exc:
            await websocket.close(
                code=CODIGO_NO_AUTENTICADO, reason=str(exc.detail)[:120]
            )
            return
        assert identidad is not None
        user_id, nombre = identidad

        await hub.entrar(websocket, user_id, nombre)
        while True:
            try:
                payload = await websocket.receive_json()
            except ValueError:
                # JSON malformado: se cierra con código de protocolo, sin romper
                # el bucle de los demás usuarios.
                await websocket.close(
                    code=CODIGO_MENSAJE_INVALIDO, reason="Mensaje inválido"
                )
                return
            if not isinstance(payload, dict):
                await websocket.close(
                    code=CODIGO_MENSAJE_INVALIDO, reason="Mensaje inválido"
                )
                return
            if str(payload.get("type", "")) == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue
            mensaje = str(payload.get("message", "")).strip()[:LARGO_MAX_MENSAJE]
            if mensaje:
                await hub.difundir(
                    {
                        "type": "message",
                        "user_id": user_id,
                        "name": nombre,
                        "message": mensaje,
                        "sent_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
    except WebSocketDisconnect:
        pass
    finally:
        if user_id is not None:
            await hub.salir(websocket, user_id)
        db.close()
