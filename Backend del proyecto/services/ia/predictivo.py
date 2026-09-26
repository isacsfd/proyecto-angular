"""
predictivo.py — Análisis predictivo y reportes inteligentes
============================================================
Genera un panel de insights para el dashboard del administrador:

  - Tendencia de préstamos por mes y proyección del próximo mes
    (regresión lineal simple).
  - Libros más solicitados y con disponibilidad crítica.
  - Demanda de dispositivos por sede y estado del inventario.
  - Morosidad: préstamos vencidos y usuarios que los tienen.
  - Préstamos pendientes de aprobación.

Compatible con Python: usa pandas + scikit-learn. Si la historia es muy
corta (< 2 meses) la proyección se degrada a un promedio móvil.
"""

from collections import Counter
from datetime import datetime

import numpy as np
from sklearn.linear_model import LinearRegression
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import Libro, Prestamos, Dispositivo, PrestamoDispositivo
from models.models import UserTable


def _parsear_fecha(valor) -> datetime | None:
    """Parsea fechas almacenadas (string o datetime) de forma tolerante."""
    if isinstance(valor, datetime):
        return valor
    if isinstance(valor, str):
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%Y-%m-%d %H:%M"):
            try:
                return datetime.strptime(valor, fmt)
            except ValueError:
                continue
    return None


def _etiqueta_mes(fecha: datetime) -> str:
    return fecha.strftime("%Y-%m")


def tendencia_prestamos(db: Session) -> dict:
    """Préstamos por mes + proyección del próximo mes."""
    conteo: Counter = Counter()
    for p in db.query(Prestamos.created_at).all():
        fecha = _parsear_fecha(p[0])
        if fecha:
            conteo[_etiqueta_mes(fecha)] += 1

    meses = sorted(conteo.keys())
    series = [{"mes": m, "total": conteo[m]} for m in meses]

    proyeccion = None
    metodo = "sin datos"
    if len(meses) >= 2:
        x = np.arange(len(series)).reshape(-1, 1)
        y = np.array([s["total"] for s in series])
        modelo = LinearRegression().fit(x, y)
        siguiente = int(round(modelo.predict([[len(series)]])[0]))
        proyeccion = max(0, siguiente)
        metodo = "regresión lineal"
    elif len(meses) == 1:
        proyeccion = series[0]["total"]
        metodo = "promedio histórico"

    return {
        "series": series,
        "proyeccion_proximo_mes": proyeccion,
        "metodo": metodo,
        "ultimo_mes": meses[-1] if meses else None,
    }


def libros_top(db: Session, top: int = 5) -> list[dict]:
    """Libros más prestados con su disponibilidad actual (consulta en lote)."""
    conteo: Counter = Counter()
    for p in db.query(Prestamos.book_id).all():
        if p[0] is not None:
            conteo[p[0]] += 1

    if not conteo:
        return []

    top_ids = [bid for bid, _ in conteo.most_common(top)]
    libros = {
        l.ID: l
        for l in db.query(Libro).filter(Libro.ID.in_(top_ids)).all()
    }
    resultados = []
    for libro_id, veces in conteo.most_common(top):
        libro = libros.get(libro_id)
        if not libro:
            continue
        resultados.append({
            "id": libro.ID,
            "titulo": libro.Titulo,
            "autor": libro.Autor,
            "programa": libro.Programa,
            "prestamos": veces,
            "ejemplares": libro.Ejemplar,
            "disponible": bool(libro.Ejemplar and libro.Ejemplar > 0),
        })
    return resultados


def disponibilidad_critica(db: Session, top: int = 5) -> list[dict]:
    """Libros con 0 o 1 ejemplares (riesgo de agotarse)."""
    criticos = db.query(Libro).filter(Libro.Ejemplar <= 1).order_by(Libro.Ejemplar.asc(), Libro.ID.desc()).all()
    return [
        {
            "id": l.ID,
            "titulo": l.Titulo,
            "autor": l.Autor,
            "programa": l.Programa,
            "ejemplares": l.Ejemplar,
        }
        for l in criticos[:top]
    ]


def demanda_dispositivos(db: Session) -> dict:
    """Uso de dispositivos por tipo/sede y estado del inventario."""
    conteo_sede: Counter = Counter()
    conteo_tipo: Counter = Counter()
    for p in db.query(PrestamoDispositivo.dispositivo_id).all():
        d = db.query(Dispositivo).filter(Dispositivo.id == p[0]).first()
        if d:
            conteo_sede[d.sede] += 1
            conteo_tipo[d.tipo] += 1

    total = db.query(Dispositivo).count()
    filas = (
        db.query(Dispositivo.estado, func.count(Dispositivo.id))
        .group_by(Dispositivo.estado)
        .all()
    )
    por_estado = {estado: int(conteo) for estado, conteo in filas}

    return {
        "total_dispositivos": total,
        "por_sede": dict(conteo_sede.most_common()),
        "por_tipo": dict(conteo_tipo.most_common()),
        "por_estado": por_estado,
    }


def morosidad(db: Session, top: int = 10) -> dict:
    """Préstamos vencidos (activos y con fecha de entrega pasada). Carga en lote."""
    hoy = datetime.now()
    activos = db.query(Prestamos).filter(Prestamos.state == "Activo").all()

    vencidos = []
    for p in activos:
        fecha_entrega = _parsear_fecha(p.delivery_date)
        if fecha_entrega is None or fecha_entrega >= hoy:
            continue
        vencidos.append((p, (hoy - fecha_entrega).days))
    vencidos.sort(key=lambda v: v[1], reverse=True)

    users = {
        u.id: u
        for u in db.query(UserTable).filter(UserTable.id.in_([p.user_id for p, _ in vencidos])).all()
    } if vencidos else {}
    libros = {
        l.ID: l
        for l in db.query(Libro).filter(Libro.ID.in_([p.book_id for p, _ in vencidos])).all()
    } if vencidos else {}

    lista = [
        {
            "id": p.id,
            "usuario": users[p.user_id].nombre if p.user_id in users else "N/A",
            "identificacion": users[p.user_id].identificacion if p.user_id in users else "N/A",
            "libro": libros[p.book_id].Titulo if p.book_id in libros else "N/A",
            "fecha_entrega": p.delivery_date,
            "dias_vencido": dias,
        }
        for p, dias in vencidos[:top]
    ]
    return {"total": len(vencidos), "lista": lista}


def pendientes_aprobacion(db: Session) -> list[dict]:
    """Préstamos en estado 'No Aprobado' esperando revisión. Carga en lote."""
    pendientes = db.query(Prestamos).filter(Prestamos.prestamo_state == "No Aprobado").all()
    if not pendientes:
        return []

    users = {
        u.id: u
        for u in db.query(UserTable).filter(UserTable.id.in_([p.user_id for p in pendientes])).all()
    }
    libros = {
        l.ID: l
        for l in db.query(Libro).filter(Libro.ID.in_([p.book_id for p in pendientes])).all()
    }
    return [
        {
            "id": p.id,
            "usuario": users[p.user_id].nombre if p.user_id in users else "N/A",
            "libro": libros[p.book_id].Titulo if p.book_id in libros else "N/A",
            "fecha_solicitud": p.loan_date,
        }
        for p in pendientes
    ]


def resumen(db: Session) -> dict:
    """Ensambla todos los insights en un solo panel para el dashboard."""
    return {
        "tendencia": tendencia_prestamos(db),
        "libros_top": libros_top(db),
        "disponibilidad_critica": disponibilidad_critica(db),
        "demanda_dispositivos": demanda_dispositivos(db),
        "morosidad": morosidad(db),
        "pendientes_aprobacion": pendientes_aprobacion(db),
    }