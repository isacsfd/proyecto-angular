"""
chatbot.py — Asistente virtual de la Biblioteca IUB
====================================================
Responde preguntas de estudiantes y funcionarios sobre:

  - Búsqueda de libros en el catálogo (por tema, título, autor).
  - Recomendaciones personalizadas.
  - Estado de préstamos y devoluciones.
  - Disponibilidad de dispositivos (computadores/tabletas).
  - Reglamento, horarios y sanciones.

Arquitectura "RAG-lite":
  1. Detecta la intención de la consulta con palabras clave.
  2. Consulta la base de datos y construye un contexto relevante
     (libros encontrados, préstamos del usuario, reglamento).
  3. Si Ollama está disponible, el LLM redacta la respuesta con ese
     contexto (respuestas naturales). Si no, se usa una plantilla
     determinista que igualmente responde con datos reales.
"""

from database import Libro, Prestamos
from models.models import UserTable
from services.ia import llm_client
from services.ia.busqueda_semantica import buscar
from services.ia.recomendador import recomendar

REGLAMENTO = (
    "Horario de la biblioteca: lunes a viernes de 7:00 a.m. a 8:00 p.m. y "
    "sábados de 8:00 a.m. a 1:00 p.m. "
    "Préstamo de libros: de 4 a 6 días. "
    "Préstamo de dispositivos (computadores y tabletas): franja horaria de MÁXIMO 2 horas, "
    "entre las 8:00 a.m. y las 8:00 p.m. "
    "El estudiante solicita el préstamo (libro o dispositivo) y un administrador debe aprobarlo. "
    "Las solicitudes fuera de estas reglas (duración de libros o franja de dispositivos) son rechazadas. "
    "Las tabletas y computadores dañados por mal uso generan reposición. "
    "Para acceder a la biblioteca debes presentar tu código QR institucional."
)

INTENCIONES = {
    "saludo": ["hola", "buenos dias", "buenas tardes", "buenas noches", "buenas", "hello", "hey", "hi"],
    "ayuda": ["ayuda", "que puedes hacer", "como funciona", "que sabes", "ayudame", "como usas", "opciones", "menu"],
    "recomendar": ["recomienda", "recomiendame", "sugiere", "sugerencia", "que libro", "cual me recomiendas",
                   "que deberia", "que me recomiendas", "para mi carrera", "para mi programa"],
    "prestamos": ["prestamo", "prestamos", "devolver", "devolucion", "vencio", "vencido", "renovar",
                  "solicitar", "entrega", "mis prestamos", "cuando entrego", "estado de mi prestamo"],
    "dispositivos": ["computador", "tablet", "tableta", "dispositivo", "equipo", "pc", "portatil", "laptop",
                     "prestamo de equipo", "computadores"],
    "reglamento": ["reglamento", "horario", "hora", "abierto", "abren", "cierran", "sancion", "multa",
                   "reglas", "normas", "permiso", "requisito", "qr"],
    "buscar": ["buscar", "busca", "libro", "titulo", "autor", "tema", "necesito", "quiero", "tienes",
               "busco", "investigacion", "ensayo", "texto", "lectura", "encontrar", "catalogo", "consulta"],
    "gracias": ["gracias", "muchas gracias", "genial", "excelente", "perfecto"],
    "despedida": ["adios", "chao", "bye", "hasta luego", "nos vemos"],
}


def _detectar_intencion(mensaje: str) -> str:
    """Detecta la intención principal del mensaje."""
    texto = mensaje.lower()
    for intencion, claves in INTENCIONES.items():
        if any(clave in texto for clave in claves):
            return intencion
    return "desconocido"


def _buscar_en_catalogo(db, mensaje: str, top: int = 3) -> list[dict]:
    """Devuelve libros relevantes a la consulta con disponibilidad."""
    resultados = buscar(db, mensaje, top_k=top, min_score=0.05, solo_disponibles=False)
    return [
        {
            "titulo": r["libro"].Titulo,
            "autor": r["libro"].Autor,
            "programa": r["libro"].Programa,
            "ejemplares": r["libro"].Ejemplar or 0,
        }
        for r in resultados
    ]


def _prestamos_usuario(db, user_id: int | None) -> list[dict]:
    """Préstamos activos del usuario (si está autenticado)."""
    if not user_id:
        return []
    resultado = []
    for p in db.query(Prestamos).filter(Prestamos.user_id == user_id, Prestamos.state == "Activo").all():
        libro = db.query(Libro).filter(Libro.ID == p.book_id).first()
        resultado.append({
            "libro": libro.Titulo if libro else "N/A",
            "entrega": p.delivery_date,
            "estado": p.prestamo_state,
        })
    return resultado


def _respuesta_determinista(db, intencion: str, mensaje: str, user_id: int | None) -> str:
    """Plantillas de respuesta sin LLM, usando datos reales de la BD."""
    if intencion == "saludo":
        return (
            "¡Hola! Soy el asistente virtual de la Biblioteca IUB. Puedo ayudarte a buscar "
            "libros, recomendarte lecturas, consultar tus préstamos o resolver dudas del "
            "reglamento. Escribe, por ejemplo: 'buscar libros de administración'."
        )
    if intencion == "ayuda":
        return (
            "Puedo ayudarte con:\n"
            "  • Buscar libros por tema, título o autor.\n"
            "  • Recomendarte lecturas para tu programa.\n"
            "  • Consultar tus préstamos y fechas de entrega.\n"
            "  • Información de computadores y tabletas.\n"
            "  • Reglamento, horarios y sanciones."
        )
    if intencion == "buscar":
        libros = _buscar_en_catalogo(db, mensaje)
        if not libros:
            return "No encontré libros relacionados con esa consulta en el catálogo. Prueba con otro tema o palabras más generales."
        lineas = []
        for i, libro in enumerate(libros, 1):
            estado = f"{libro['ejemplares']} ejemplar(es) disponible(s)" if libro["ejemplares"] > 0 else "sin ejemplares disponibles"
            lineas.append(f"{i}. {libro['titulo']} — {libro['autor']} ({libro['programa']}). {estado}.")
        return "Encontré estos libros en el catálogo:\n" + "\n".join(lineas)
    if intencion == "recomendar":
        recs = recomendar(db, user_id=user_id, top_k=3)
        if not recs:
            return "Aún no tengo suficientes datos para recomendarte. Explora el catálogo en la sección Libros."
        lineas = [f"{i}. {r['libro'].Titulo} — {r['libro'].Autor} ({r['razon']})." for i, r in enumerate(recs, 1)]
        return "Según tu perfil e historial, te recomiendo:\n" + "\n".join(lineas)
    if intencion == "prestamos":
        prestamos = _prestamos_usuario(db, user_id)
        if not prestamos:
            return "No tienes préstamos activos en este momento. Si necesitas un libro o dispositivo, puedes solicitarlo en la sección correspondiente."
        lineas = [f"• '{p['libro']}' — entrega: {p['entrega']} (estado: {p['estado']})." for p in prestamos]
        return "Tus préstamos activos son:\n" + "\n".join(lineas)
    if intencion == "dispositivos":
        return (
            "La biblioteca presta computadores y tabletas en franjas de MÁXIMO 2 horas, "
            "entre las 8:00 a.m. y las 8:00 p.m. El estudiante hace la solicitud y un "
            "administrador la aprueba. El estado de cada equipo lo puedes consultar en "
            "la sección Dispositivos. Los equipos dañados por mal uso generan reposición."
        )
    if intencion == "reglamento":
        return REGLAMENTO
    if intencion == "gracias":
        return "¡Con gusto! Estoy aquí para ayudarte con la Biblioteca IUB. 🙂"
    if intencion == "despedida":
        return "¡Hasta luego! Recuerda traer tu código QR para ingresar a la biblioteca."
    return (
        "No estoy seguro de haber entendido. Puedes preguntarme por libros, recomendaciones, "
        "préstamos, dispositivos o el reglamento. Por ejemplo: 'recomiéndame libros de mi carrera'."
    )


def _contexto_para_llm(db, intencion: str, mensaje: str, user_id: int | None) -> str:
    """Construye el contexto factual que el LLM usará para responder."""
    partes = []
    if intencion in ("buscar", "recomendar"):
        libros = _buscar_en_catalogo(db, mensaje, top=5)
        if libros:
            lista = "\n".join(
                f"- {l['titulo']} | {l['autor']} | {l['programa']} | {l['ejemplares']} ejemplar(es)"
                for l in libros
            )
            partes.append("LIBROS EN EL CATÁLOGO:\n" + lista)
    if intencion == "recomendar":
        recs = recomendar(db, user_id=user_id, top_k=5)
        if recs:
            lista = "\n".join(f"- {r['libro'].Titulo} | {r['razon']}" for r in recs)
            partes.append("RECOMENDACIONES PARA EL USUARIO:\n" + lista)
    if intencion == "prestamos":
        prestamos = _prestamos_usuario(db, user_id)
        if prestamos:
            lista = "\n".join(f"- {p['libro']} | entrega {p['entrega']} | {p['estado']}" for p in prestamos)
            partes.append("PRÉSTAMOS ACTIVOS DEL USUARIO:\n" + lista)
    partes.append("REGLAMENTO:\n" + REGLAMENTO)
    return "\n\n".join(partes)


SYSTEM_PROMPT = (
    "Eres 'IUBot', el asistente virtual oficial de la Biblioteca de la Institución "
    "Universitaria de Barranquilla (IUB). Respondes SOLO con datos del contexto "
    "entregado o con conocimiento institucional general. Sé breve, amable y en "
    "español. Si el contexto contiene libros, menciónalos tal cual. Si no tienes "
    "información, dilo y sugiere hablar con el personal de la biblioteca."
)


def responder(
    db,
    mensaje: str,
    user_id: int | None = None,
    historial: list[dict] | None = None,
) -> dict:
    """
    Procesa un mensaje del usuario y devuelve:
      {"respuesta": str, "motor": "ollama"|"determinista", "intencion": str}
    """
    mensaje = (mensaje or "").strip()
    if not mensaje:
        return {"respuesta": "¿En qué puedo ayudarte?", "motor": "determinista", "intencion": "desconocido"}

    intencion = _detectar_intencion(mensaje)
    contexto = _contexto_para_llm(db, intencion, mensaje, user_id)

    # 1. Intentar con el LLM local (Ollama)
    if llm_client.disponible():
        prompt = (
            f"Consulta del usuario: {mensaje}\n\n"
            f"Contexto (datos reales):\n{contexto}\n\n"
            "Responde de forma natural y útil."
        )
        respuesta_llm = llm_client.chat(prompt, system=SYSTEM_PROMPT)
        if respuesta_llm:
            return {
                "respuesta": respuesta_llm,
                "motor": "ollama",
                "intencion": intencion,
            }

    # 2. Fallback determinista
    return {
        "respuesta": _respuesta_determinista(db, intencion, mensaje, user_id),
        "motor": "determinista",
        "intencion": intencion,
    }