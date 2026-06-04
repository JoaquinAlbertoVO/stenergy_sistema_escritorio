
from app.services.pdf_service import generate_certificate_pdf

# Prueba de generación de PDF
pdf_path = generate_certificate_pdf(
    output_pdf="certificado_prueba.pdf",
    front_template_path="ruta/a/tu/plantilla/frontal.jpg",  # Cambia por tu ruta real
    back_template_path="ruta/a/tu/plantilla/trasera.jpg",   # Cambia por tu ruta real
    qr_path="ruta/a/tu/qr.png",                             # Cambia por tu ruta real
    student_name="Juan Pérez",
    dni="12345678",
    academic_hours="40 horas",
    issue_date="29/04/2026",
    description_text="Por haber completado satisfactoriamente el curso de ejemplo",
    registry_number="REG-2026-001"
)

print(f"PDF generado: {pdf_path}")
