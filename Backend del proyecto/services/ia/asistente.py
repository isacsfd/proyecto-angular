"""asistente.py — Orquestador ÚNICO del Asistente Bibliotecario IUB
==================================================================
P0 Fase IA 5.3. Ambos canales (chatbot web /api/ia/chat y bot de Telegram)
consumen ESTE módulo. Reutiliza servicios existentes (nada duplicado):

* INSTITUCIONAL  → services/ia/rag_definitivo.consultar()  (Open WebUI pipe:
                   e5-small → top-5 → GUARDA determinista → llama3.2:1b).
                   Fallback: chatbot.responder (IUBot existente) si el canal
                   Open WebUI no está disponible.
* CATÁLOGO       → services/ia/busqueda_semantica.buscar() (existente).
* DISPONIBILIDAD → services/ia/disponibilidad.py (determinista, sólo lectura).
* RECOMENDACIONES→ services/ia/recomendador.recomendar()/para_invitado().
* PRÉSTAMOS      → Prestamos del USUARIO autenticado (jamás de terceros).
* dispositivos/reglamento/saludo/ayuda/gracias/despedida → respuestas
  deterministas existentes de chatbot.py.

Garantías: ningún dato de libro/sede/cantidad se inventa (todo sale de la
BD); "recomendar" no implica "disponible" (se reporta disponibilidad real).
"""

from services.ia import chatbot as iubot, rag_definitivo
from services.ia.busqueda_semantica import buscar as buscar_semantica
from services.ia.disponibilidad import (
    NOTA_SEDE,
    de_libro as disponibilidad_de_libro,
    por_busqueda as disponibilidad_por_busqueda,
    resumen_por_sede as disponibilidad_resumen_sede,
    sede_en_texto,
)
from services.ia.recomendador import recomendar, para_invitado
from services.ia.disponibilidad import determinar_modo as _determinar_modo_titulo
from services.ia.disponibilidad import titulo_especifico as _titulo_especifico
from database import Prestamos, Libro  # sólo lectura

MOTOR_RAG = "rag_e5"
MOTOR_DET = "determinista"

INTENCIONES_LOCALES = {
    "saludo": ["hola", "buenos dias", "buenas tardes", "buenas noches", "buenas", "hello", "hey", "hi"],
    "ayuda": ["ayuda", "que puedes hacer", "como funciona", "que sabes", "ayudame", "menu", "opciones"],
    "recomendar": ["recomienda", "recomiendame", "sugiere", "sugerencia", "recomendacion",
                   "que libro me", "cual me recomiendas", "para mi carrera", "para mi programa",
                   "que deveria leer", "que me recomiendas"],
    "disponibilidad": ["disponible", "disponibilidad", "ejemplar", "ejemplares", "quedan",
                       "se puede llevar", "prestar", "en prestamo", "hay disponible",
                       "cuantos libros quedan", "estado del libro", "esta prestado"],
    "prestamos": ["mis prestamos", "mis préstamos", "prestamos activos", "estado de mi prestamo",
                  "cuando entrego", "cuándo entrego", "debo devolver", "que tengo prestado",
                  "mis prestamos activos"],
    "dispositivos": ["computador", "tablet", "tableta", "dispositivo", "equipo", "pc",
                     "portatil", "laptop", "computadores"],
}

# 'institucional' toma el resto (manuales/reglamentos/requisitos/servicios/...)


def _texto_normalizado(mensaje: str) -> str:
    return (mensaje or "").lower().replace("á", "a").replace("é", "e").replace("í", "i") \
        .replace("ó", "o").replace("ú", "u")


def clasificar(mensaje: str) -> str:
    """Clasificador de intención determinista (transparente y ampliable)."""
    t = _texto_normalizado(mensaje)

    # 1) préstamos personales (identidad requerida aguas abajo)
    for kw in INTENCIONES_LOCALES["prestamos"]:
        if kw in t:
            return "prestamos"

    # 2) recomendaciones explícitas
    for kw in INTENCIONES_LOCALES["recomendar"]:
        if kw in t:
            return "recomendar"

    # 3) disponibilidad explícita
    for kw in INTENCIONES_LOCALES["disponibilidad"]:
        if kw in t:
            return "disponibilidad"

    # 4) localizables deterministas (saludo/ayuda/dispositivos/gracias/despedida)
    local = iubot._detectar_intencion(mensaje)
    if local in ("saludo", "ayuda", "dispositivos", "gracias", "despedida"):
        return local
    if local == "buscar":
        return "catalogo"

    # 5) resto → institucional (RAG documental e5 + guard)
    return "institucional"


# ---------------------------------------------------------------- catálogo ----

def _linea_catalogo(i, d) -> str:
    estado = f"{d['disponibles']} ejemplar(es) disponibles ahora" if d["disponibles"] > 0 \
        else "sin ejemplares disponibles ahora"
    prest = f"; en préstamo activo: {d['prestadosActivos']}" if d["prestadosActivos"] else ""
    sede = f" | sede: {d['sede']}" if d.get("sede") else ""
    return f"{i}. {d['titulo']} — {d['autor']} ({d['programa']}){sede}. {estado}{prest}."


def _atender_catalogo(db, mensaje: str) -> dict:
    # título específico: NO usar semántica como confirmación de existencia
    titulo = _titulo_especifico(mensaje)
    if titulo:
        modo = _determinar_modo_titulo(db, titulo)
        if modo["modo"] in ("exacto", "parcial"):
            rotulo = "coincidencia exacta" if modo["modo"] == "exacto" else "coincidencia parcial"
            lineas = []
            fuentes = []
            for i, libro in enumerate(modo["libros"], 1):
                d = disponibilidad_de_libro(db, libro)
                lineas.append(_linea_catalogo(i, d))
                fuentes.append(f"{d['titulo']} (disponibles: {d['disponibles']}, sede: {d['sede']})")
            return {
                "respuesta": f"Resultados del catálogo ({rotulo}):\n" + "\n".join(lineas),
                "motor": MOTOR_DET, "intencion": "catalogo", "fuentes": fuentes,
            }
        if modo["modo"] == "sugerencia":
            lineas = [f"- {l.Titulo} — {l.Autor}." for l in modo["libros"]]
            return {
                "respuesta": (f"No se encontró el título «{titulo}» en el catálogo real "
                              "(no se confirma ninguna coincidencia con tu pedido).\n"
                              "SUGERENCIAS del catálogo (NO son coincidencia confirmada):\n" +
                              "\n".join(lineas)),
                "motor": MOTOR_DET, "intencion": "catalogo", "fuentes": [],
            }
        return {
            "respuesta": f"No se encontró el título «{titulo}» en el catálogo real. "
                         "Verifica la ortografía o consulta la sección Libros.",
            "motor": MOTOR_DET, "intencion": "catalogo", "fuentes": [],
        }
    # temática: búsqueda semántica existente, con cabecera explícita
    resultados = buscar_semantica(db, mensaje, top_k=5, min_score=0.05, solo_disponibles=False)
    if not resultados:
        return {
            "respuesta": "No encontré libros que coincidan con esa consulta en el catálogo. "
                         "Prueba con otro título, autor o tema.",
            "motor": MOTOR_DET, "intencion": "catalogo", "fuentes": [],
        }
    lineas = []
    fuentes = []
    for i, r in enumerate(resultados, 1):
        d = disponibilidad_de_libro(db, r["libro"])
        lineas.append(_linea_catalogo(i, d))
        fuentes.append(f"{d['titulo']} (ejemplares: {d['disponibles']}, sede: {d['sede']})")
    return {
        "respuesta": "Coincidencias semánticas APROXIMADAS del catálogo (no validan la "
                     "existencia de un título específico) — disponibilidad consultada en "
                     "tiempo real:\n" + "\n".join(lineas),
        "motor": MOTOR_DET, "intencion": "catalogo", "fuentes": fuentes,
    }


# --------------------------------------------------------- disponibilidad ----

def _atender_disponibilidad(db, mensaje: str, user_id) -> dict:
    # a) título específico: estrategia determinista exacto/parcial/sugerencia
    titulo = _titulo_especifico(mensaje)
    if titulo:
        modo = _determinar_modo_titulo(db, titulo)
        if modo["modo"] in ("exacto", "parcial"):
            lineas = []
            fuentes = []
            rotulo = "coincidencia exacta" if modo["modo"] == "exacto" else "coincidencia parcial"
            for i, libro in enumerate(modo["libros"], 1):
                d = disponibilidad_de_libro(db, libro, user_id=user_id)
                lineas.append(_linea_catalogo(i, d))
                if d.get("misPrestamos"):
                    for mp in d["misPrestamos"]:
                        lineas.append(f"   ↳ tienes un préstamo ACTIVO de este título "
                                      f"(entrega: {mp['entrega']}, estado: {mp['estado']}).")
                fuentes.append(f"{d['titulo']} (disponibles: {d['disponibles']}, sede: {d['sede']})")
            return {
                "respuesta": f"Disponibilidad consultada en tiempo real ({rotulo}):\n" + "\n".join(lineas) +
                             f"\n\nNota: {NOTA_SEDE}. Las cantidades reflejan el registro del sistema "
                             "(no son inventario físico verificado en estante).",
                "motor": MOTOR_DET, "intencion": "disponibilidad", "fuentes": fuentes,
            }
        if modo["modo"] == "sugerencia":
            lineas = [f"- {l.Titulo} — {l.Autor}." for l in modo["libros"]]
            return {
                "respuesta": (f"No se encontró el título «{titulo}» en el catálogo real "
                              "(no se confirma ninguna coincidencia con tu pedido).\n"
                              "SUGERENCIAS del catálogo (NO son coincidencia confirmada "
                              "y NO se muestra disponibilidad hasta identificar el título):\n" +
                              "\n".join(lineas)),
                "motor": MOTOR_DET, "intencion": "disponibilidad", "fuentes": [],
            }
        return {
            "respuesta": f"No se encontró el título «{titulo}» en el catálogo real. "
                         "Verifica la ortografía o consulta la sección Libros.",
            "motor": MOTOR_DET, "intencion": "disponibilidad", "fuentes": [],
        }

    # b) si el usuario menciona una sede y pregunta 'por sede', resumen de esa sede
    sede = sede_en_texto(mensaje)
    if sede and ("por sede" in _texto_normalizado(mensaje) or "en la sede" in _texto_normalizado(mensaje)
                 or "sede " in _texto_normalizado(mensaje) and 'disponib' in _texto_normalizado(mensaje)):
        resumen = disponibilidad_resumen_sede(db)
        esp = [f"• {r['sede']}: {r['titulos']} título(s), {r['ejemplaresDisponibles']} ejemplar(es) disponibles"
               for r in resumen]
        return {
            "respuesta": "Detalle por sede (modelo vigente: una sede por título):\n" + "\n".join(esp) +
                         f"\n\nNota: {NOTA_SEDE}",
            "motor": MOTOR_DET, "intencion": "disponibilidad", "fuentes": [],
        }

    # b) disponibilidad de libros por consulta/texto
    d = disponibilidad_por_busqueda(db, mensaje, top_k=5, user_id=user_id, sede_filtro=sede)
    if not d:
        return {
            "respuesta": "No encontré ese libro en el catálogo con los datos disponibles. "
                         "Intenta con el título exacto o consulta el catálogo en la sección Libros.",
            "motor": MOTOR_DET, "intencion": "disponibilidad", "fuentes": [],
        }
    lineas = []
    fuentes = []
    for i, item in enumerate(d, 1):
        lineas.append(_linea_catalogo(i, item))
        if item.get("misPrestamos"):
            for mp in item["misPrestamos"]:
                lineas.append(f"   ↳ tienes un préstamo ACTIVO de este título (entrega: {mp['entrega']}, estado: {mp['estado']}).")
        fuentes.append(f"{item['titulo']} (disponibles: {item['disponibles']}, sede: {item['sede']})")
    return {
        "respuesta": "Disponibilidad consultada en tiempo real en la base de datos:\n" + "\n".join(lineas) +
                     f"\n\nNota: {NOTA_SEDE}. Las cantidades reflejan el registro del sistema "
                     "(no son inventario físico verificado en estante).",
        "motor": MOTOR_DET, "intencion": "disponibilidad", "fuentes": fuentes,
    }


# ------------------------------------------------------- recomendaciones ----

def _tema_en_mensaje(mensaje: str):
    """Extrae la temática pedida tras 'de/sobre' (ej. 'recomiéndame libros de física')."""
    import re
    msg = _texto_normalizado(mensaje)
    m = re.search(r'(?:libros?|lecturas?|temas?|materiales?)\s+(?:de|sobre|acerca de)\s+([a-z0-9 n\-]{3,42})', msg)
    if m:
        tema = m.group(1).strip(' ?¿¡.!')
        if tema and tema not in ('interes', 'tematicas', 'libros', 'obras', 'lecturas'):
            return tema
    return None


def _atender_recomendaciones(db, mensaje: str, user_id) -> dict:
    tema = _tema_en_mensaje(mensaje)

    # a) temática explícita en la consulta: recomendaciones por tema (catálogo real)
    if tema:
        matches = buscar_semantica(db, tema, top_k=4, min_score=0.05, solo_disponibles=False)
        if not matches:
            return {
                "respuesta": f"No encontré títulos de la temática '{tema}' en el catálogo real. "
                             "Puedo buscar por otro título, autor o área, o consultarlo en la sección Libros.",
                "motor": MOTOR_DET, "intencion": "recomendar", "fuentes": [],
            }
        lineas = []
        for i, r in enumerate(matches, 1):
            d = disponibilidad_de_libro(db, r["libro"])
            estado = f"{d['disponibles']} ejemplar(es) disponibles ahora" if d["disponibles"] > 0 \
                else "sin ejemplares disponibles ahora"
            lineas.append(f"{i}. {d['titulo']} — {d['autor']}. Disponibilidad: {estado}.")
        return {
            "respuesta": f"Recomendaciones por temática '{tema}' (NO personalizadas; catálogo real):\n" +
                         "\n".join(lineas) + "\n\nNota: recomendar no garantiza ejemplar disponible; "
                         "consulta su disponibilidad antes de solicitarlo.",
            "motor": MOTOR_DET, "intencion": "recomendar", "fuentes": [],
        }

    # b) usuario identificado: recomendaciones personalizadas (carrera/historial)
    user_id_efectivo = user_id
    if user_id_efectivo:
        from models.models import UserTable
        existe = db.query(UserTable.id).filter(UserTable.id == user_id).first()
        if not existe:
            user_id_efectivo = None

    if user_id_efectivo:
        recs = recomendar(db, user_id=user_id_efectivo, top_k=4)
        if not recs:
            return {
                "respuesta": "Aún no tengo datos suficientes para recomendarte por tu perfil. "
                             "Indícame una temática de interés (ej. 'recomiéndame libros de física').",
                "motor": MOTOR_DET, "intencion": "recomendar", "fuentes": [],
            }
        lineas = []
        for i, r in enumerate(recs, 1):
            d = disponibilidad_de_libro(db, r["libro"])
            estado = f"{d['disponibles']} ejemplar(es) disponibles ahora" if d["disponibles"] > 0 \
                else "sin ejemplares disponibles ahora"
            lineas.append(f"{i}. {d['titulo']} — {d['autor']} ({d['programa']}). Motivo: {r['razon']}. "
                          f"Disponibilidad: {estado}.")
        return {
            "respuesta": "Recomendaciones PERSONALIZADAS con tu perfil académico e historial "
                         "(catálogo real; tener recomendación NO equivale a tener ejemplar "
                         "reservado):\n" + "\n".join(lineas),
            "motor": MOTOR_DET, "intencion": "recomendar", "fuentes": [],
        }

    # c) sin identidad/tema: PREGUNTAR + sugerencias populares etiquetadas
    pop = para_invitado(db, top_k=3)
    lineas = []
    for i, r in enumerate(pop, 1):
        lineas.append(f"{i}. {r['libro'].Titulo} — {r['libro'].Autor}.")
    return {
        "respuesta": ("¿Qué área o temática te interesa? Dímelo en tu próxima consulta "
                      "(ej. 'recomiéndame libros de física') y te daré recomendaciones de esa "
                      "temática con disponibilidad real.\n\n"
                      "Mientras eliges, sugerencias POPULARES del catálogo (NO personalizadas):\n" +
                      "\n".join(lineas)),
        "motor": MOTOR_DET, "intencion": "recomendar", "fuentes": [],
    }


# ------------------------------------------------------------- préstamos ----

def _atender_prestamos(db, mensaje: str, user_id, canal: str) -> dict:
    if not user_id:
        return {
            "respuesta": (
                "Para consultas sobre tus préstamos necesito tu identidad verificada:\n"
                "• En la web: inicia sesión con tu usuario institucional.\n"
                "• En Telegram: requiere vinculación segura de tu cuenta (pendiente de "
                "autorización; no se vincula sólo por nombre o usuario)."
            ),
            "motor": MOTOR_DET, "intencion": "prestamos", "fuentes": [],
        }
    prestamos = (
        db.query(Prestamos)
        .filter(Prestamos.user_id == user_id, Prestamos.state == "Activo")
        .all()
    )
    if not prestamos:
        return {
            "respuesta": "No tienes préstamos activos en este momento.",
            "motor": MOTOR_DET, "intencion": "prestamos", "fuentes": [],
        }
    lineas = []
    for p in prestamos:
        libro = db.query(Libro).filter(Libro.ID == p.book_id).first()
        titulo = libro.Titulo if libro else "N/A"
        lineas.append(f"• {titulo} — compromiso de entrega: {p.delivery_date} "
                      f"(solicitud: {p.prestamo_state}).")
    return {
        "respuesta": "Tus préstamos activos (sólo los tuyos):\n" + "\n".join(lineas),
        "motor": MOTOR_DET, "intencion": "prestamos", "fuentes": [],
    }


# ---------------------------------------------------------- institucional ----

def _atender_institucional(db, mensaje: str, user_id, canal: str) -> dict:
    """RAG e5 + guard. Fallback: IUBot existente si el canal Open WebUI falla."""
    try:
        resultado = rag_definitivo.consultar(mensaje)
        if resultado.respuesta and not resultado.error:
            fuentes = [f.documento for f in resultado.fuentes] if resultado.fuentes else []
            motor = MOTOR_RAG if not resultado.respuesta.startswith(
                "La información solicitada") else MOTOR_RAG
            return {
                "respuesta": resultado.respuesta,
                "motor": motor,
                "intencion": "institucional",
                "fuentes": fuentes,
                "guarda": resultado.fue_bloqueada() if hasattr(resultado, "fue_bloqueada") else True,
            }
    except Exception:  # noqa: BLE001 — el fallback mantiene el servicio vivo
        pass
    # Fallback determinista existente (IUBot). Respeta el contrato actual.
    return iubot.responder(db, mensaje, user_id=user_id)


# ---------------------------------------------------------------- buses ----

def atender(db, mensaje: str, user_id=None, canal: str = "web") -> dict:
    """Entrada ÚNICA de ambos canales. Devuelve
    {respuesta, motor, intencion, fuentes} (contrato de /api/ia/chat)."""
    mensaje = (mensaje or "").strip()
    if not mensaje:
        return {"respuesta": "¿En qué puedo ayudarte?", "motor": MOTOR_DET,
                "intencion": "saludo", "fuentes": []}

    intencion = clasificar(mensaje)

    if intencion == "saludo":
        return {"respuesta": iubot._respuesta_determinista(db, "saludo", mensaje, user_id),
                "motor": MOTOR_DET, "intencion": "saludo", "fuentes": []}
    if intencion == "ayuda":
        return {"respuesta": iubot._respuesta_determinista(db, "ayuda", mensaje, user_id),
                "motor": MOTOR_DET, "intencion": "ayuda", "fuentes": []}
    if intencion == "dispositivos":
        return {"respuesta": iubot._respuesta_determinista(db, "dispositivos", mensaje, user_id),
                "motor": MOTOR_DET, "intencion": "dispositivos", "fuentes": []}
    if intencion == "gracias":
        return {"respuesta": iubot._respuesta_determinista(db, "gracias", mensaje, user_id),
                "motor": MOTOR_DET, "intencion": "gracias", "fuentes": []}
    if intencion == "despedida":
        return {"respuesta": iubot._respuesta_determinista(db, "despedida", mensaje, user_id),
                "motor": MOTOR_DET, "intencion": "despedida", "fuentes": []}
    if intencion == "catalogo":
        return _atender_catalogo(db, mensaje)
    if intencion == "disponibilidad":
        return _atender_disponibilidad(db, mensaje, user_id)
    if intencion == "recomendar":
        return _atender_recomendaciones(db, mensaje, user_id)
    if intencion == "prestamos":
        return _atender_prestamos(db, mensaje, user_id, canal)
    return _atender_institucional(db, mensaje, user_id, canal)
