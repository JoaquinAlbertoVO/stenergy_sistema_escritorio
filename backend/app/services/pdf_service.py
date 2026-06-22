from pathlib import Path

from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


def draw_centered_paragraph(
    c,
    text,
    x,
    y,
    width,
    height,
    font_name="Helvetica",
    font_size=16,
):
    style = ParagraphStyle(
        name="CenteredStyle",
        fontName=font_name,
        fontSize=font_size,
        leading=font_size + 4,
        alignment=TA_CENTER,
        textColor="black",
    )

    paragraph = Paragraph(text, style)
    _, h = paragraph.wrap(width, height)
    paragraph.drawOn(c, x, y - h)


def generate_certificate_pdf(
    output_pdf: str,
    front_template_path: str,
    back_template_path: str,
    qr_path: str,
    student_name: str,
    dni: str,
    academic_hours: str,
    issue_date: str,
    description_text: str,
    registry_number: str,
) -> str:
    output = Path(output_pdf)
    output.parent.mkdir(parents=True, exist_ok=True)

    page_width = 1462
    page_height = 1024

    c = canvas.Canvas(str(output), pagesize=(page_width, page_height))

    front_file = Path(front_template_path)
    back_file = Path(back_template_path)
    qr_file = Path(qr_path)

    if not front_file.exists():
        raise FileNotFoundError(
            f"No se encontró la plantilla frontal: {front_file.resolve()}"
        )

    if not back_file.exists():
        raise FileNotFoundError(
            f"No se encontró la plantilla posterior: {back_file.resolve()}"
        )

    if not qr_file.exists():
        raise FileNotFoundError(f"No se encontró el QR: {qr_file.resolve()}")

    front = ImageReader(str(front_file))
    back = ImageReader(str(back_file))
    qr = ImageReader(str(qr_file))

    # -------------------------
    # PAGINA 1 - FRENTE
    # -------------------------
    c.drawImage(front, 0, 0, width=page_width, height=page_height)

    # Horas académicas - arriba de "CERTIFICADO DE PARTICIPACIÓN"
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Oblique", 22)
    c.drawString(116, 660, academic_hours)

    # Fecha de emisión - debajo de "CERTIFICADO DE PARTICIPACIÓN"
    if not issue_date.strip().lower().startswith("lima,"):
        issue_date = f"Lima, {issue_date}"

    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Oblique", 18)
    c.drawString(116, 530, issue_date)

    # Nombre
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 34)
    c.drawCentredString(1000, 580, student_name)

    # DNI
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(970, 530, dni)

    # Texto descriptivo debajo del DNI
    # Reemplazamos el espacio normal por un espacio sin salto (non-breaking space)
    # para evitar que "ST ENERGY" se separe en dos líneas distintas.
    description_text = description_text.replace("ST ENERGY", "ST\xa0ENERGY")
    description_text = description_text.replace("ST Energy", "ST\xa0Energy")
    
    draw_centered_paragraph(
        c,
        text=description_text,
        x=640,
        y=470,
        width=700,
        height=180,
        font_name="Helvetica",
        font_size=18,
    )

    # Número de registro pequeño en la parte frontal
    c.setFont("Helvetica-Bold", 12)
    c.drawString(1170, 80, registry_number)

    c.showPage()

    # -------------------------
    # PAGINA 2 - REVERSO
    # -------------------------
    c.drawImage(back, 0, 0, width=page_width, height=page_height)

    # QR
    c.drawImage(qr, 600, 550, width=240, height=240)

    # Número de registro
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(
        731,
        110,
        f"N° de registro: {registry_number} - www.stenergyedu.com"
    )

    c.save()
    return str(output)