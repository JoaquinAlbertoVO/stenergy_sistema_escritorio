import os
import paramiko
from dotenv import load_dotenv
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

# Cargar las variables de entorno desde el archivo .env
load_dotenv()

# Configuración obtenida del archivo .env
SFTP_HOST = os.getenv("SFTP_HOST")
SFTP_PORT = int(os.getenv("SFTP_PORT", 22))
SFTP_USER = os.getenv("SFTP_USER")
SFTP_PASS = os.getenv("SFTP_PASS")
REMOTE_DIR = os.getenv("REMOTE_DIR", "/public_html/mis_pdfs_generados")

def generar_pdf(nombre_archivo):
    """Genera un PDF de prueba básico localmente."""
    print(f"Generando el archivo PDF localmente: {nombre_archivo}")
    c = canvas.Canvas(nombre_archivo, pagesize=letter)
    c.drawString(100, 700, "¡Hola! Este es un PDF de prueba generado automáticamente.")
    c.drawString(100, 680, "El sistema se ha conectado exitosamente al cPanel.")
    c.save()
    print("PDF generado con éxito en tu computadora.")

def crear_directorio_si_no_existe(sftp, ruta_remota):
    """Verifica si un directorio existe en el servidor y si no, lo crea de forma recursiva."""
    try:
        sftp.chdir(ruta_remota)
        print(f"El directorio remoto '{ruta_remota}' ya existe.")
    except IOError:
        print(f"El directorio remoto '{ruta_remota}' no existe. Intentando crearlo...")
        
        # Para crear directorios anidados (ej. /public_html/mis_pdfs_generados)
        carpetas = ruta_remota.strip("/").split("/")
        ruta_actual = ""
        for carpeta in carpetas:
            ruta_actual += "/" + carpeta
            try:
                sftp.chdir(ruta_actual)
            except IOError:
                print(f"Creando la subcarpeta: {ruta_actual}")
                sftp.mkdir(ruta_actual)
                sftp.chdir(ruta_actual)
        print(f"Directorio remoto '{ruta_remota}' creado con éxito.")

def subir_pdf_sftp(archivo_local, ruta_remota):
    """Sube un archivo al servidor usando SFTP."""
    print("Iniciando conexión SFTP...")
    
    # Crear cliente SSH
    ssh = paramiko.SSHClient()
    # Aceptar automáticamente claves de servidores desconocidos (necesario para la primera vez)
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        # Conectar al servidor usando las credenciales del .env
        ssh.connect(hostname=SFTP_HOST, port=SFTP_PORT, username=SFTP_USER, password=SFTP_PASS)
        print("Conexión SSH/SFTP establecida.")
        
        # Iniciar sesión SFTP para transferir archivos
        sftp = ssh.open_sftp()
        
        # Verificar o crear el directorio remoto
        crear_directorio_si_no_existe(sftp, ruta_remota)
        
        # Asegurarse de que la ruta remota termine en /
        if not ruta_remota.endswith("/"):
            ruta_remota += "/"
            
        ruta_archivo_remoto = ruta_remota + os.path.basename(archivo_local)
        
        # Subir el archivo
        print(f"Subiendo archivo a: {ruta_archivo_remoto}")
        sftp.put(archivo_local, ruta_archivo_remoto)
        print("¡Archivo subido exitosamente a tu cPanel!")
        
    except paramiko.ssh_exception.AuthenticationException:
        print("ERROR: Fallo de autenticación. Verifica tu usuario y contraseña en el archivo .env.")
    except Exception as e:
        print(f"Ocurrió un error inesperado: {e}")
    finally:
        # Siempre cerrar las conexiones al terminar
        if 'sftp' in locals():
            sftp.close()
        ssh.close()
        print("Conexión finalizada.")

if __name__ == "__main__":
    nombre_pdf = "prueba_documento.pdf"
    
    # 1. Generar el PDF
    generar_pdf(nombre_pdf)
    
    # 2. Conectarse al cPanel y subir el PDF
    subir_pdf_sftp(nombre_pdf, REMOTE_DIR)
