"""Entrada del bot de Telegram (Fase IA 5).

Uso local (PowerShell):
    cd "Backend del proyecto"
    $env:TELEGRAM_BOT_TOKEN = 'TU_TOKEN'              # token de BotFather por ENV (nunca en archivos)
    $env:TELEGRAM_AUTHORIZED_USERS = 'id,@usuario'    # lista configurable
    .\\venv\\Scripts\\python.exe scripts\\bot_telegram.py

Puede opcionalmente leer un archivo .env en la raíz del backend (no versionado).
"""
import os
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))


def cargar_dot_env(path: Path):
    """Carga variables NO presentes del archivo .env (sin imprimir secretos)."""
    if not path.is_file():
        return
    for linea in path.read_text(encoding='utf-8', errors='ignore').splitlines():
        linea = linea.strip()
        if not linea or linea.startswith('#') or '=' not in linea:
            continue
        k, _, v = linea.partition('=')
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


if __name__ == '__main__':
    for candidato in (RAIZ / '.env', Path(os.getcwd()) / '.env', RAIZ.parent / '.env'):
        cargar_dot_env(candidato)

    from services.telegram.bot_telegram import iniciar
    iniciar()
