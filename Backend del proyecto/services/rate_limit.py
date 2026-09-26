"""
rate_limit.py — Limitador de peticiones en memoria (ventana deslizante)
=======================================================================
Protege endpoints públicos (p. ej. el registro de acceso QR) contra spam
y enumeración de DNIs sin añadir dependencias externas.

Configuración por variables de entorno:
  MM_RATE_LIMIT_MAX     (default 20)  — máx. de peticiones por ventana
  MM_RATE_LIMIT_WINDOW  (default 60)  — ventana en segundos
"""

import os
import threading
import time
from collections import defaultdict, deque

_MAX = int(os.getenv("MM_RATE_LIMIT_MAX", "20"))
_WINDOW = int(os.getenv("MM_RATE_LIMIT_WINDOW", "60"))


class RateLimiter:
    """Ventana deslizante por clave (IP, etc.). Seguro para hilos."""

    def __init__(self, max_requests: int = _MAX, window_seconds: int = _WINDOW):
        self.max_requests = max_requests
        self.window = window_seconds
        self._registros: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def permitir(self, clave: str) -> bool:
        """
        Registra la petición para 'clave'. Devuelve True si está dentro del
        límite de la ventana; False si excede (debe devolverse 429).
        """
        ahora = time.monotonic()
        with self._lock:
            cola = self._registros[clave]
            # Podar timestamps fuera de la ventana
            while cola and cola[0] <= ahora - self.window:
                cola.popleft()
            if len(cola) >= self.max_requests:
                return False
            cola.append(ahora)
            return True

    def reiniciar(self) -> None:
        """Limpia todos los registros (usado por los tests)."""
        with self._lock:
            self._registros.clear()


# Instancia global para el endpoint público de acceso QR
limitador_qr = RateLimiter()


def clave_por_ip(request) -> str:
    """Devuelve la IP del cliente como clave de rate-limit."""
    return request.client.host if request.client else "desconocido"