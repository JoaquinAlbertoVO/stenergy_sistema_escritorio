import { getCalendarData, getCourses } from './storage';

// En desarrollo usa localhost, en producción usa la URL de Render
const CERTIFICATE_API_URL = process.env.REACT_APP_CERT_API_URL || 'http://localhost:8000';

/**
 * Busca las fechas del curso en el calendario.
 * @param {string} courseId - ID del curso
 * @returns {object|null} - { startDate, endDate } o null si no se encuentra
 */
export function getCourseDates(courseId) {
  const calendar = getCalendarData();
  const entry = calendar.find(c => c.courseId === courseId);
  if (!entry) return null;
  return { startDate: entry.startDate, endDate: entry.endDate };
}

/**
 * Calcula la fecha de emisión según la modalidad:
 * - Semipresencial: "del {startDate} al {endDate}"
 * - Virtual: "del {endDate + 1 día} al {endDate + 1 día}"
 */
export function calculateCertificateDates(courseId, modality) {
  const dates = getCourseDates(courseId);

  if (!dates) {
    // Si no hay fechas en el calendario, usar la fecha actual
    const today = new Date();
    const formatted = formatDateSpanish(today);
    return {
      issueDate: formatted,
      description: `realizado el ${formatted}`,
    };
  }

  const start = new Date(dates.startDate + 'T00:00:00');
  const end = new Date(dates.endDate + 'T00:00:00');

  if (modality === 'virtual') {
    // Virtual: fecha = endDate + 1 día
    const virtualDate = new Date(end);
    virtualDate.setDate(virtualDate.getDate() + 1);
    const formatted = formatDateSpanish(virtualDate);
    return {
      issueDate: formatted,
      description: `realizado el ${formatted}`,
    };
  } else {
    // Semipresencial: rango completo del curso
    const startFormatted = formatDateSpanish(start);
    const endFormatted = formatDateSpanish(end);
    return {
      issueDate: endFormatted,
      description: `realizado del ${startFormatted} al ${endFormatted}`,
    };
  }
}

/**
 * Formatea una fecha en español: "15 de junio de 2026"
 */
function formatDateSpanish(date) {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

/**
 * Genera un número de registro basado en el código del curso y el DNI.
 * Formato: CERT-{COURSE_CODE}-{DNI}
 * Si no hay código de curso, usa un fallback con timestamp.
 */
function generateRegistryNumber(courseCode, dni) {
  if (courseCode && dni) {
    // Limpiar DNI de caracteres no numéricos
    const cleanDni = dni.replace(/\D/g, '');
    // Quitar espacios del código de curso (ej: "MSE VIR" -> "MSEVIR")
    const cleanCode = courseCode.replace(/\s+/g, '').toUpperCase();
    return `CERT-${cleanCode}-${cleanDni}`;
  }
  // Fallback si no hay código de curso
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `CERT-${y}${m}${d}-${rand}`;
}

/**
 * Calcula las horas académicas del curso basándose en la configuración del curso dinámico o predeterminadas.
 * @param {string} courseId - ID del curso
 * @param {string} courseName - Nombre del curso
 * @returns {string} - Horas académicas formateadas
 */
function getAcademicHours(courseId, courseName) {
  const courses = getCourses();
  const course = courses.find(c => c.id === courseId);
  if (course && course.academicHours) {
    return course.academicHours;
  }

  // Horas predeterminadas por curso (pueden personalizarse)
  const hoursMap = {
    'Subestaciones Eléctricas': '120 horas académicas',
    'Mantenimiento Eléctrico Industrial': '180 horas académicas',
    'Tableros Eléctricos': '90 horas académicas',
    'Instalaciones Eléctricas': '150 horas académicas',
    'Automatización Industrial': '180 horas académicas',
    'Protecciones Eléctricas': '120 horas académicas',
    'Sistemas de Puesta a Tierra': '90 horas académicas',
    'Energía Solar Fotovoltaica': '150 horas académicas',
  };
  return hoursMap[courseName] || '120 horas académicas';
}

/**
 * Solicita la generación de un certificado al backend Python.
 * @param {object} sale - Datos de la venta
 * @returns {Promise<object>} - Resultado con URL de descarga
 */
export async function generateCertificate(sale) {
  const overrides = sale.certificateOverrides || {};

  const { issueDate: defaultIssueDate, description } = calculateCertificateDates(sale.courseId, sale.modality);
  const defaultAcademicHours = getAcademicHours(sale.courseId, sale.courseName);

  const courses = getCourses();
  const course = courses.find(c => c.id === sale.courseId);
  
  // Obtener código del curso para el número de registro
  const courseCode = course?.courseCode || '';
  const studentDni = overrides.dni || sale.clientDni;
  const registryNumber = generateRegistryNumber(courseCode, studentDni);
  
  // Usar la descripción dinámica del curso o un texto por defecto
  let defaultDescriptionText = `Por haber participado en el curso de "${sale.courseName}", ${description}.`;
  if (course && course.descriptionText) {
    defaultDescriptionText = course.descriptionText;
  }

  const payload = {
    student_name: overrides.studentName || sale.clientName,
    dni: overrides.dni ? `DNI: ${overrides.dni}` : `DNI: ${sale.clientDni}`,
    academic_hours: overrides.academicHours || defaultAcademicHours,
    issue_date: overrides.issueDate || defaultIssueDate,
    description_text: overrides.descriptionText || defaultDescriptionText,
    registry_number: registryNumber,
    course_name: overrides.cpanelFolder || course?.cpanelFolder || sale.courseName,
  };

  const response = await fetch(`${CERTIFICATE_API_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al generar el certificado');
  }

  const result = await response.json();
  return result;
}

/**
 * Descarga el PDF del certificado generado.
 * @param {string} registryNumber - Número de registro del certificado
 */
export async function downloadCertificatePdf(registryNumber) {
  const response = await fetch(`${CERTIFICATE_API_URL}/api/download/${registryNumber}`);

  if (!response.ok) {
    throw new Error('No se pudo descargar el certificado');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${registryNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  return blob;
}
