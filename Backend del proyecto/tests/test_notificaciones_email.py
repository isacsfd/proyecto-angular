"""Notificaciones por correo (parcial 2): reportes al correo registrado,
seguimiento administrativo del estado y evento automático de registro."""

from services.email_service import AdjuntoCorreo, ErrorEnvioCorreo, leer_config_smtp
from models.models import NotificacionEmail, UserTable

import services.notificaciones_service as noti_service

from .conftest import crear_usuario, headers, token_de


def _usuario_api_payload(identificacion):
    return {
        "nombre": "Usuario Notificado",
        "username": "un" + identificacion,
        "email": f"un{identificacion}@iub.edu.co",
        "phone": "3000000001",
        "address": "Calle 1 #2-3",
        "rol": "Estudiante",
        "password": "Clave1234!",
        "identificacion": identificacion,
        "sede": "Soledad",
    }


def _crear_usuario_api(client, token, identificacion):
    return client.post(
        "/usuarios/", headers=headers(token), json=_usuario_api_payload(identificacion)
    )


def _post_reporte(client, token, contenido, formato="pdf", titulo="Cat%C3%A1logo%20de%20libros"):
    return client.post(
        f"/api/notificaciones/reporte?formato={formato}&titulo={titulo}",
        headers={**headers(token), "Content-Type": "application/octet-stream"},
        content=contenido,
    )


# ─── Evento automático: registro de usuarios ─────────────────────────────────

def test_registro_de_usuario_genera_notificacion(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="3100", nombre="Admin Notif")
    token = token_de(client, admin)

    respuesta = _crear_usuario_api(client, token, "31001")
    assert respuesta.status_code == 201, respuesta.text

    filas = db.query(NotificacionEmail).all()
    assert len(filas) == 1
    fila = filas[0]
    assert fila.tipo == "registro_usuario"
    assert fila.destinatario_email == "un31001@iub.edu.co"
    # Sin SMTP en el entorno de pruebas: el intento queda registrado, no falla.
    assert fila.estado == "no_configurado"
    assert fila.enviado_en is None


def test_registro_no_falla_si_el_correo_explota(client, db, monkeypatch):
    """El flujo de registro NUNCA se rompe por el correo (best-effort)."""
    admin = crear_usuario(db, rol="Administrador", identificacion="3110", nombre="Admin Robusto")
    token = token_de(client, admin)

    def explotar(*args, **kwargs):
        raise RuntimeError("SMTP explotó")

    monkeypatch.setattr(noti_service, "enviar_correo", explotar)
    monkeypatch.setattr(noti_service, "smtp_configurado", lambda env=None: True)

    respuesta = _crear_usuario_api(client, token, "31011")
    assert respuesta.status_code == 201, respuesta.text


# ─── Envío de reportes al correo registrado ──────────────────────────────────

def test_reporte_enviado_con_adjunto(client, db, monkeypatch):
    usuario = crear_usuario(db, rol="Estudiante", identificacion="3201", nombre="Usu Reporte")
    token = token_de(client, usuario)
    capturado = {}

    def enviar_fake(destinatario, asunto, texto, html=None, adjunto=None):
        capturado["destinatario"] = destinatario
        capturado["asunto"] = asunto
        capturado["adjunto"] = adjunto

    monkeypatch.setattr(noti_service, "enviar_correo", enviar_fake)
    monkeypatch.setattr(noti_service, "smtp_configurado", lambda env=None: True)

    contenido = b"%PDF-1.4 contenido de prueba del reporte"
    respuesta = _post_reporte(client, token, contenido, formato="pdf")
    assert respuesta.status_code == 202, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo["estado"] == "enviado"
    assert cuerpo["destinatario"] == "u3201@iub.edu.co"

    assert isinstance(capturado["adjunto"], AdjuntoCorreo)
    assert capturado["adjunto"].nombre == "reporte_biblioteca.pdf"
    assert capturado["adjunto"].contenido == contenido
    assert capturado["adjunto"].mime == "application/pdf"

    fila = db.query(NotificacionEmail).first()
    assert fila.tipo == "reporte_generado"
    assert fila.estado == "enviado"
    assert fila.enviado_en is not None


def test_reporte_fallido_registra_motivo(client, db, monkeypatch):
    usuario = crear_usuario(db, rol="Estudiante", identificacion="3202", nombre="Usu Fallo")
    token = token_de(client, usuario)

    def enviar_fallo(destinatario, asunto, texto, html=None, adjunto=None):
        raise ErrorEnvioCorreo("SMTPResponseException (550) buzón no aceptado")

    monkeypatch.setattr(noti_service, "enviar_correo", enviar_fallo)
    monkeypatch.setattr(noti_service, "smtp_configurado", lambda env=None: True)

    respuesta = _post_reporte(client, token, b"PK\x03\x04 hoja de calculo", formato="xlsx")
    assert respuesta.status_code == 202
    assert respuesta.json()["estado"] == "fallido"

    fila = db.query(NotificacionEmail).first()
    assert fila.estado == "fallido"
    assert "550" in (fila.detalle or "")


def test_reporte_sin_smtp_queda_no_configurado(client, db):
    usuario = crear_usuario(db, rol="Estudiante", identificacion="3203", nombre="Usu Sin SMTP")
    token = token_de(client, usuario)

    respuesta = _post_reporte(client, token, b"%PDF-1.4 datos")
    assert respuesta.status_code == 202
    cuerpo = respuesta.json()
    assert cuerpo["estado"] == "no_configurado"
    assert "SMTP" in cuerpo["mensaje"]

    fila = db.query(NotificacionEmail).first()
    assert fila.estado == "no_configurado"


def test_reporte_validaciones(client, db):
    usuario = crear_usuario(db, rol="Estudiante", identificacion="3204", nombre="Usu Valid")
    token = token_de(client, usuario)

    # Formato inválido.
    assert _post_reporte(client, token, b"datos", formato="docx").status_code == 400
    # Archivo vacío.
    assert _post_reporte(client, token, b"").status_code == 400
    # Excede 5 MB.
    grande = b"x" * (5 * 1024 * 1024 + 1)
    assert _post_reporte(client, token, grande).status_code == 413
    # Ninguna fila registrada: los rechazos de validación no generan seguimiento.
    assert db.query(NotificacionEmail).count() == 0


def test_reporte_exige_correo_registrado(client, db):
    from .conftest import _rol_id
    from app import hash_password

    usuario = UserTable(
        nombre="Sin Correo",
        identificacion="3205",
        password=hash_password("Clave1234!"),
        rol_id=_rol_id(db, "Estudiante"),
        phone="3000000000",
        address="Calle 1",
        username="sin_correo",
        email=None,
        sede="Soledad",
    )
    db.add(usuario)
    db.commit()
    token = token_de(client, usuario)

    respuesta = _post_reporte(client, token, b"%PDF-1.4 datos")
    assert respuesta.status_code == 400
    assert "correo" in respuesta.json()["detail"]


# ─── Seguimiento administrativo ──────────────────────────────────────────────

def test_listado_solo_administradores(client, db):
    estudiante = crear_usuario(db, rol="Estudiante", identificacion="3301", nombre="Est Lista")
    admin = crear_usuario(db, rol="Administrador", identificacion="3302", nombre="Admin Lista")
    token_est = token_de(client, estudiante)
    token_admin = token_de(client, admin)

    # El propio estudiante genera un registro (sin SMTP queda no_configurado).
    _post_reporte(client, token_est, b"%PDF-1.4 datos")

    prohibido = client.get("/api/notificaciones/", headers=headers(token_est))
    assert prohibido.status_code == 403

    permitido = client.get("/api/notificaciones/", headers=headers(token_admin))
    assert permitido.status_code == 200
    filas = permitido.json()
    assert len(filas) == 1
    assert filas[0]["tipo"] == "reporte_generado"
    assert filas[0]["estado"] == "no_configurado"
    assert filas[0]["destinatario_email"] == "u3301@iub.edu.co"


def test_listado_con_filtros(client, db):
    admin = crear_usuario(db, rol="Administrador", identificacion="3310", nombre="Admin Filtros")
    token_admin = token_de(client, admin)
    estudiante = crear_usuario(db, rol="Estudiante", identificacion="3311", nombre="Est Filtros")
    token_est = token_de(client, estudiante)

    _post_reporte(client, token_est, b"%PDF-1.4 datos")
    _crear_usuario_api(client, token_admin, "33012")

    por_tipo = client.get(
        "/api/notificaciones/?tipo=registro_usuario", headers=headers(token_admin)
    ).json()
    assert len(por_tipo) == 1 and por_tipo[0]["tipo"] == "registro_usuario"

    por_estado = client.get(
        "/api/notificaciones/?estado=no_configurado", headers=headers(token_admin)
    ).json()
    assert len(por_estado) == 2

    vacio = client.get(
        "/api/notificaciones/?estado=enviado", headers=headers(token_admin)
    ).json()
    assert vacio == []


def test_estado_smtp_sin_exponer_secreto(client, db):
    usuario = crear_usuario(db, rol="Estudiante", identificacion="3320", nombre="Est SMTP")
    token = token_de(client, usuario)
    respuesta = client.get("/api/notificaciones/estado-smtp", headers=headers(token))
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo == {"configurado": False}
    assert "password" not in respuesta.text.lower()


# ─── Configuración SMTP (unitario) ───────────────────────────────────────────

def test_leer_config_smtp_completa():
    cfg = leer_config_smtp(
        {
            "MM_SMTP_HOST": "smtp.gmail.com",
            "MM_SMTP_PORT": "587",
            "MM_SMTP_USER": "biblioteca@iub.edu.co",
            "MM_SMTP_PASSWORD": "secreto-no-se-escribe",
            "MM_SMTP_FROM": "Biblioteca IUB <biblioteca@iub.edu.co>",
        }
    )
    assert cfg is not None
    assert cfg.host == "smtp.gmail.com"
    assert cfg.puerto == 587
    assert cfg.modo == "starttls"
    assert cfg.remitente == "Biblioteca IUB <biblioteca@iub.edu.co>"


def test_leer_config_smtp_puerto_465_implica_ssl():
    cfg = leer_config_smtp(
        {
            "MM_SMTP_HOST": "smtp.ejemplo.com",
            "MM_SMTP_PORT": "465",
            "MM_SMTP_USER": "usuario",
            "MM_SMTP_PASSWORD": "clave",
        }
    )
    assert cfg is not None
    assert cfg.modo == "ssl"


def test_leer_config_smtp_incompleta_devuelve_none():
    assert leer_config_smtp({}) is None
    assert (
        leer_config_smtp(
            {"MM_SMTP_HOST": "smtp.ejemplo.com", "MM_SMTP_USER": "usuario"}
        )
        is None
    )
