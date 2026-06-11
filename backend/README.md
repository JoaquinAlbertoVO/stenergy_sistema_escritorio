# SistemaCertificados - ST Energy API

API FastAPI para generar certificados PDF con QR para ST Energy.

## Variables de entorno necesarias en Render:

- `FTP_HOST` - Host FTP de tu cPanel (ej: stenergyedu.com)
- `FTP_USER` - Usuario FTP de cPanel
- `FTP_PASS` - Contraseña FTP de cPanel

## Despliegue en Render:
1. Conectar el repositorio de GitHub
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
