from pathlib import Path
import traceback
import os
import paramiko
import threading

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.services.qr_service import generate_qr
from app.services.pdf_service import generate_certificate_pdf
from app import models, schemas, crud
from app.database import SessionLocal, engine, get_db
from sqlalchemy.orm import Session
from fastapi import Depends

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# 🌐 CORS - Permitir conexiones desde React (local y producción)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://stenergyedu.com",
        "https://www.stenergyedu.com",
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 📤 Función para subir PDFs al cPanel vía SFTP (puerto 22) (se ejecuta en segundo plano)
def upload_pdf_to_cpanel(pdf_path: str, course_name: str, filename: str):
    """Sube el PDF generado a cPanel vía SFTP para que sea accesible públicamente."""
    ftp_host = os.getenv("FTP_HOST")
    ftp_user = os.getenv("FTP_USER")
    ftp_pass = os.getenv("FTP_PASS")

    if not all([ftp_host, ftp_user, ftp_pass]):
        print("⚠️ SFTP no configurado. El PDF solo se guardó localmente.")
        return

    try:
        # Configurar conexión SFTP por el puerto 22
        transport = paramiko.Transport((ftp_host, 22))
        transport.connect(username=ftp_user, password=ftp_pass)
        sftp = paramiko.SFTPClient.from_transport(transport)

        # 1. Intentar entrar a public_html (si estamos en el home de cPanel)
        try:
            sftp.chdir("public_html")
        except IOError:
            pass  # Si falla, asumimos que la cuenta SFTP ya está dentro de public_html

        # 2. Crear y entrar a la carpeta base de certificados
        try:
            sftp.chdir("CERTIFICADOS_2026")
        except IOError:
            sftp.mkdir("CERTIFICADOS_2026")
            sftp.chdir("CERTIFICADOS_2026")

        # 3. Crear y entrar a la carpeta del curso
        try:
            sftp.chdir(course_name)
        except IOError:
            sftp.mkdir(course_name)
            sftp.chdir(course_name)

        # 4. Subir el archivo
        sftp.put(pdf_path, filename)

        sftp.close()
        transport.close()
        print(f"✅ PDF subido a cPanel por SFTP: /CERTIFICADOS_2026/{course_name}/{filename}")
    except Exception as e:
        print(f"❌ Error subiendo PDF por SFTP: {e}")

# 📁 Base
BASE_DIR = Path(__file__).resolve().parent

# 🔥 Configuración Jinja
env = Environment(
    loader=FileSystemLoader(str(BASE_DIR / "app" / "templates")),
    autoescape=select_autoescape(["html", "xml"])
)

# 📁 Directorios generados
generated_pdf_dir = BASE_DIR / "generated" / "pdf"
generated_qr_dir = BASE_DIR / "generated" / "qr"

generated_pdf_dir.mkdir(parents=True, exist_ok=True)
generated_qr_dir.mkdir(parents=True, exist_ok=True)

# 📁 Static
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "app" / "static")), name="static")

# 📁 Archivos generados
app.mount("/generated", StaticFiles(directory=str(BASE_DIR / "generated")), name="generated")


# 🔹 GET - Mostrar formulario
@app.get("/", response_class=HTMLResponse)
def show_form(request: Request):
    try:
        template = env.get_template("form.html")
        html_content = template.render(
            request=request,
            success=False,
            error=None
        )
        return HTMLResponse(content=html_content)

    except Exception:
        print(traceback.format_exc())
        return HTMLResponse("<h1>Error cargando el formulario</h1>")


# 🔹 POST - Generar certificado (formulario HTML original)
@app.post("/generate", response_class=HTMLResponse)
def generate_certificate(
    request: Request,
    student_name: str = Form(...),
    dni: str = Form(...),
    academic_hours: str = Form(...),
    issue_date: str = Form(...),
    description_text: str = Form(...),
    registry_number: str = Form(...),
    course_name: str = Form(...),  # ✅ Nuevo campo
):
    try:
        # ✅ URL corregida con carpeta por curso
        public_url = f"https://stenergyedu.com/CERTIFICADOS_2026/{course_name}/{registry_number}.pdf"

        qr_path = generated_qr_dir / f"{registry_number}.png"
        pdf_path = generated_pdf_dir / f"{registry_number}.pdf"

        front_template_path = BASE_DIR / "app" / "static" / "front.png"
        back_template_path = BASE_DIR / "app" / "static" / "back.png"

        # 🔹 Generar QR
        generate_qr(public_url, str(qr_path))

        # 🔹 Generar PDF
        generate_certificate_pdf(
            output_pdf=str(pdf_path),
            front_template_path=str(front_template_path),
            back_template_path=str(back_template_path),
            qr_path=str(qr_path),
            student_name=student_name,
            dni=dni,
            academic_hours=academic_hours,
            issue_date=issue_date,
            description_text=description_text,
            registry_number=registry_number,
        )

        template = env.get_template("form.html")
        html_content = template.render(
            request=request,
            success=True,
            error=None,
            registry_number=registry_number,
            public_url=public_url,
            download_url=f"/generated/pdf/{registry_number}.pdf"
        )

        return HTMLResponse(content=html_content)

    except Exception:
        print(traceback.format_exc())

        template = env.get_template("form.html")
        html_content = template.render(
            request=request,
            success=False,
            error="Error interno, revisa la consola"
        )

        return HTMLResponse(content=html_content)


# ✅ API JSON - Endpoint para React
@app.post("/api/generate")
async def api_generate_certificate(request: Request):
    """
    Endpoint API para generar certificados desde la app React.
    Recibe JSON con los datos del estudiante y devuelve la URL de descarga del PDF.
    """
    try:
        data = await request.json()

        student_name = data.get("student_name", "")
        dni = data.get("dni", "")
        academic_hours = data.get("academic_hours", "")
        issue_date = data.get("issue_date", "")
        description_text = data.get("description_text", "")
        registry_number = data.get("registry_number", "")
        course_name = data.get("course_name", "")

        # Validaciones
        if not all([student_name, dni, issue_date, description_text, registry_number, course_name]):
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "Faltan campos obligatorios"}
            )

        public_url = f"https://stenergyedu.com/CERTIFICADOS_2026/{course_name}/{registry_number}.pdf"

        qr_path = generated_qr_dir / f"{registry_number}.png"
        pdf_path = generated_pdf_dir / f"{registry_number}.pdf"

        front_template_path = BASE_DIR / "app" / "static" / "front.png"
        back_template_path = BASE_DIR / "app" / "static" / "back.png"

        # 🔹 Generar QR
        generate_qr(public_url, str(qr_path))

        # 🔹 Generar PDF
        generate_certificate_pdf(
            output_pdf=str(pdf_path),
            front_template_path=str(front_template_path),
            back_template_path=str(back_template_path),
            qr_path=str(qr_path),
            student_name=student_name,
            dni=dni,
            academic_hours=academic_hours,
            issue_date=issue_date,
            description_text=description_text,
            registry_number=registry_number,
        )

        # 📤 Subir al cPanel en segundo plano (no bloquea la respuesta)
        threading.Thread(
            target=upload_pdf_to_cpanel,
            args=(str(pdf_path), course_name, f"{registry_number}.pdf")
        ).start()

        return JSONResponse(content={
            "success": True,
            "registry_number": registry_number,
            "public_url": public_url,
            "download_url": f"/api/download/{registry_number}"
        })

    except Exception:
        print(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Error interno al generar el certificado"}
        )


# ✅ Descarga directa del PDF generado
@app.get("/api/download/{registry_number}")
def download_certificate(registry_number: str):
    """Permite descargar el PDF generado directamente."""
    pdf_path = generated_pdf_dir / f"{registry_number}.pdf"

    if not pdf_path.exists():
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": "Certificado no encontrado"}
        )

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"{registry_number}.pdf"
    )

# ==========================================
# REST API PARA REACT (BASE DE DATOS REAL)
# ==========================================

# ---- Migrate Data Endpoint ----
@app.post("/api/migrate")
def migrate_data(data: dict, db: Session = Depends(get_db)):
    """ Endpoint temporal para migrar datos desde localStorage a SQLite """
    try:
        # Migrate Users
        for user_data in data.get("users", []):
            if not crud.get_user_by_username(db, user_data["username"]):
                crud.create_user(db, schemas.UserCreate(**user_data))
        
        # Migrate Courses
        db.query(models.Course).delete()
        for course_data in data.get("courses", []):
            crud.create_course(db, schemas.CourseCreate(**course_data))
            
        # Migrate Calendar
        db.query(models.CalendarEntry).delete()
        for cal_data in data.get("calendar", []):
            crud.create_calendar_entry(db, schemas.CalendarEntryCreate(**cal_data))
            
        # Migrate Sales
        db.query(models.Sale).delete()
        for sale_data in data.get("sales", []):
            crud.create_sale(db, schemas.SaleCreate(**sale_data))
            
        return {"success": True, "message": "Datos migrados exitosamente"}
    except Exception as e:
        print(traceback.format_exc())
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

# ---- Courses ----
@app.get("/api/courses", response_model=list[schemas.Course])
def read_courses(db: Session = Depends(get_db)):
    return crud.get_courses(db)

@app.post("/api/courses", response_model=schemas.Course)
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    return crud.create_course(db=db, course=course)

@app.put("/api/courses/{course_id}", response_model=schemas.Course)
def update_course(course_id: str, course: dict, db: Session = Depends(get_db)):
    return crud.update_course(db, course_id, course)

@app.delete("/api/courses/{course_id}")
def delete_course(course_id: str, db: Session = Depends(get_db)):
    crud.delete_course(db, course_id)
    return {"success": True}

# ---- Calendar ----
@app.get("/api/calendar", response_model=list[schemas.CalendarEntry])
def read_calendar(db: Session = Depends(get_db)):
    return crud.get_calendar(db)

@app.post("/api/calendar", response_model=schemas.CalendarEntry)
def create_calendar_entry(entry: schemas.CalendarEntryCreate, db: Session = Depends(get_db)):
    return crud.create_calendar_entry(db=db, entry=entry)

@app.put("/api/calendar/{entry_id}", response_model=schemas.CalendarEntry)
def update_calendar_entry(entry_id: str, entry: dict, db: Session = Depends(get_db)):
    return crud.update_calendar_entry(db, entry_id, entry)

@app.delete("/api/calendar/{entry_id}")
def delete_calendar_entry(entry_id: str, db: Session = Depends(get_db)):
    crud.delete_calendar_entry(db, entry_id)
    return {"success": True}

# ---- Sales ----
@app.get("/api/sales", response_model=list[schemas.Sale])
def read_sales(db: Session = Depends(get_db)):
    return crud.get_sales(db)

@app.post("/api/sales", response_model=schemas.Sale)
def create_sale(sale: schemas.SaleCreate, db: Session = Depends(get_db)):
    return crud.create_sale(db=db, sale=sale)

@app.put("/api/sales/{sale_id}", response_model=schemas.Sale)
def update_sale(sale_id: str, sale: schemas.SaleUpdate, db: Session = Depends(get_db)):
    updated_sale = crud.update_sale(db, sale_id, sale)
    if not updated_sale:
        return JSONResponse(status_code=404, content={"error": "Sale not found"})
    return updated_sale

@app.delete("/api/sales/{sale_id}")
def delete_sale(sale_id: str, db: Session = Depends(get_db)):
    crud.delete_sale(db, sale_id)
    return {"success": True}

# ---- Users ----
@app.get("/api/users", response_model=list[schemas.User])
def read_users(db: Session = Depends(get_db)):
    return crud.get_users(db)

@app.post("/api/auth")
def auth_user(data: dict, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, data.get("username"))
    if user and user.password == data.get("password"):
        return {"id": user.id, "name": user.name, "username": user.username, "role": user.role}
    return JSONResponse(status_code=401, content={"error": "Credenciales inválidas"})