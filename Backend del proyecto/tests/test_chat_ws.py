"""Chat en tiempo real (WebSocket): autenticación, presencia y sincronización.

Cubre el requisito del parcial 2: comunicación entre dos clientes conectados
simultáneamente, presencia actualizada al conectar/desconectar y persistencia
de la conexión (ping/pong).
"""

import pytest
from starlette.websockets import WebSocketDisconnect

from .conftest import crear_usuario, token_de

URL = "/api/chat/ws?token={token}"


def _abrir(client, token):
    return client.websocket_connect(URL.format(token=token))


def test_ws_rechaza_conexion_sin_token(client):
    with pytest.raises(WebSocketDisconnect) as info:
        with client.websocket_connect("/api/chat/ws"):
            pass
    assert info.value.code == 4401


def test_ws_rechaza_token_invalido(client):
    with pytest.raises(WebSocketDisconnect) as info:
        with client.websocket_connect("/api/chat/ws?token=token-falso-123"):
            pass
    assert info.value.code == 4401


def test_ws_dos_clientes_sincronizan_mensajes(client, db):
    """Evidencia del parcial: dos clientes conectados reciben el mismo mensaje
    en tiempo real y la presencia refleja conexión/desconexión."""
    admin = crear_usuario(db, rol="Administrador", identificacion="3001", nombre="Admin Chat")
    estudiante = crear_usuario(db, rol="Estudiante", identificacion="3002", nombre="Estudiante Chat")
    token_admin = token_de(client, admin)
    token_est = token_de(client, estudiante)

    with _abrir(client, token_admin) as a:
        # Presencia inicial: solo el admin.
        presencia_a = a.receive_json()
        assert presencia_a["type"] == "presence"
        assert len(presencia_a["users"]) == 1

        with _abrir(client, token_est) as b:
            presencia_b = b.receive_json()
            assert presencia_b["type"] == "presence"
            assert {u["name"] for u in presencia_b["users"]} == {"Admin Chat", "Estudiante Chat"}

            # El admin también recibe la presencia actualizada.
            presencia_a2 = a.receive_json()
            assert len(presencia_a2["users"]) == 2

            # Mensaje del admin → llega a AMBOS clientes.
            a.send_json({"message": "hola desde el administrador"})
            eco_a = a.receive_json()
            assert eco_a["type"] == "message"
            assert eco_a["message"] == "hola desde el administrador"
            assert eco_a["name"] == "Admin Chat"
            eco_b = b.receive_json()
            assert eco_b["type"] == "message"
            assert eco_b["message"] == "hola desde el administrador"

        # El estudiante se desconecta → la presencia del admin se actualiza.
        presencia_a3 = a.receive_json()
        assert presencia_a3["type"] == "presence"
        assert len(presencia_a3["users"]) == 1


def test_ws_mismo_usuario_varias_pestanas(client, db):
    """Varias conexiones del mismo usuario: presencia sin duplicar y la
    primera pestaña sigue viva cuando se cierra la segunda."""
    usuario = crear_usuario(db, rol="Estudiante", identificacion="3003", nombre="Dos Pestanas")
    token = token_de(client, usuario)

    with _abrir(client, token) as a:
        assert len(a.receive_json()["users"]) == 1
        with _abrir(client, token) as b:
            assert len(b.receive_json()["users"]) == 1  # deduplicado por usuario
            assert len(a.receive_json()["users"]) == 1

            b.send_json({"message": "mensaje desde la segunda pestana"})
            assert a.receive_json()["message"] == "mensaje desde la segunda pestana"
            assert b.receive_json()["message"] == "mensaje desde la segunda pestana"

        # Al cerrar la segunda pestaña el usuario sigue conectado por la
        # primera: no hay broadcast de presencia y el canal sigue operativo.
        a.send_json({"message": "la primera pestana sigue viva"})
        assert a.receive_json()["message"] == "la primera pestana sigue viva"


def test_ws_ping_pong_mantiene_conexion(client, db):
    usuario = crear_usuario(db, rol="Estudiante", identificacion="3004", nombre="Usuario Ping")
    token = token_de(client, usuario)
    with _abrir(client, token) as ws:
        ws.receive_json()  # presencia inicial
        ws.send_json({"type": "ping"})
        assert ws.receive_json() == {"type": "pong"}


def test_ws_mensaje_vacio_no_se_difunde(client, db):
    usuario = crear_usuario(db, rol="Estudiante", identificacion="3005", nombre="Usuario Vacio")
    token = token_de(client, usuario)
    with _abrir(client, token) as ws:
        ws.receive_json()  # presencia inicial
        ws.send_json({"message": "   "})
        # Lo siguiente que llega es el pong: el mensaje vacío no se difundió.
        ws.send_json({"type": "ping"})
        assert ws.receive_json() == {"type": "pong"}


def test_ws_recorta_mensajes_muy_largos(client, db):
    usuario = crear_usuario(db, rol="Estudiante", identificacion="3006", nombre="Usuario Largo")
    token = token_de(client, usuario)
    with _abrir(client, token) as ws:
        ws.receive_json()
        ws.send_json({"message": "x" * 5000})
        eco = ws.receive_json()
        assert eco["type"] == "message"
        assert len(eco["message"]) == 1000
