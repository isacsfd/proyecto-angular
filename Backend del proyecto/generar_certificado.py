"""
generar_certificado.py — Genera un certificado SSL local para HTTPS
=====================================================================
Ejecuta este script UNA SOLA VEZ antes de iniciar el servidor con HTTPS.

Requisitos:
  pip install mkcert  (o instalar mkcert desde https://github.com/FiloSottile/mkcert)

Uso:
  python generar_certificado.py

Genera:
  certs/cert.pem  — Certificado público
  certs/key.pem   — Clave privada

Luego inicia el servidor con HTTPS:
  uvicorn app:app --reload --host 127.0.0.1 --port 8443 --ssl-keyfile=certs/key.pem --ssl-certfile=certs/cert.pem
"""

import os
import subprocess
import sys

CERTS_DIR = os.path.join(os.path.dirname(__file__), "certs")
CERT_FILE = os.path.join(CERTS_DIR, "cert.pem")
KEY_FILE  = os.path.join(CERTS_DIR, "key.pem")


def verificar_mkcert():
    """Comprueba si mkcert está instalado en el sistema."""
    try:
        subprocess.run(["mkcert", "--version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def instalar_ca_local():
    """Instala la CA local de mkcert en el sistema (requiere permisos de admin)."""
    print("📋 Instalando CA local de mkcert...")
    subprocess.run(["mkcert", "-install"], check=True)
    print("✅ CA local instalada correctamente.")


def generar_certificado():
    """Genera el certificado y la clave privada en la carpeta certs/."""
    os.makedirs(CERTS_DIR, exist_ok=True)

    print("🔐 Generando certificado SSL para localhost...")
    subprocess.run(
        ["mkcert",
         "-cert-file", CERT_FILE,
         "-key-file",  KEY_FILE,
         "localhost", "127.0.0.1"],
        check=True
    )
    print(f"✅ Certificado generado:")
    print(f"   Certificado : {CERT_FILE}")
    print(f"   Clave       : {KEY_FILE}")


def main():
    print("=" * 60)
    print("  Generador de certificado HTTPS local — Biblioteca IUB")
    print("=" * 60)

    if not verificar_mkcert():
        print("\n❌ mkcert no está instalado.")
        print("   Instálalo con uno de estos comandos según tu sistema:\n")
        print("   Windows (Chocolatey) : choco install mkcert")
        print("   Windows (Scoop)      : scoop install mkcert")
        print("   macOS (Homebrew)     : brew install mkcert")
        print("   Linux                : sudo apt install mkcert")
        print("\n   Luego vuelve a ejecutar este script.")
        sys.exit(1)

    instalar_ca_local()
    generar_certificado()

    print("\n" + "=" * 60)
    print("  ✅ HTTPS listo. Inicia el servidor con:")
    print()
    print("  uvicorn app:app --reload \\")
    print("    --host 127.0.0.1 --port 8443 \\")
    print("    --ssl-keyfile=certs/key.pem \\")
    print("    --ssl-certfile=certs/cert.pem")
    print()
    print("  Luego abre: https://127.0.0.1:8443/docs")
    print("=" * 60)


if __name__ == "__main__":
    main()