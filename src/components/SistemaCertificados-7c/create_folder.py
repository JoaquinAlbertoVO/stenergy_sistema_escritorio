"""Script temporal para crear la carpeta de certificados en cPanel."""
import os
import paramiko
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("SFTP_HOST")
port = int(os.getenv("SFTP_PORT", "22"))
user = os.getenv("SFTP_USER")
password = os.getenv("SFTP_PASS")
# Ruta relativa desde el home del usuario
remote_dir = os.getenv("REMOTE_DIR", "public_html/stenergy-certificados")

print(f"Conectando a {host}:{port} con usuario '{user}'...")

try:
    transport = paramiko.Transport((host, port))
    transport.connect(username=user, password=password)
    sftp = paramiko.SFTPClient.from_transport(transport)

    print(f"[OK] Conectado. Ruta inicial: {sftp.getcwd()}")

    # Navegar carpeta a carpeta (ruta relativa)
    parts = remote_dir.strip("/").split("/")
    for part in parts:
        try:
            sftp.chdir(part)
            print(f"   [YA EXISTE] {part}")
        except IOError:
            sftp.mkdir(part)
            sftp.chmod(part, 0o755)
            sftp.chdir(part)
            print(f"   [CREADA] {part}")

    print(f"\n[LISTO] Carpeta creada exitosamente!")
    print(f"   URL publica: https://stenergyedu.com/stenergy-certificados/")

    sftp.close()
    transport.close()

except Exception as e:
    print(f"[ERROR] {e}")
