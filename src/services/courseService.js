import api from './api';


// Obtener todos los cursos (Público)
export const getCourses = async () => {
  try {
    // En WordPress, los cursos de TutorLMS suelen registrarse como un Custom Post Type llamado "courses"
    const response = await api.get('/wp-json/wp/v2/courses');
    return response.data;
  } catch (error) {
    console.error("Error obteniendo los cursos de WP:", error);
    return [];
  }
};

// Obtener los cursos en los que el usuario logueado está inscrito
export const getUserEnrollments = async () => {
  try {
    // Esta petición usa automáticamente el Token JWT gracias a nuestro interceptor en api.js
    const response = await api.get('/wp-json/tutor/v1/enrollments');
    return response.data;
  } catch (error) {
    console.error("Error obteniendo las inscripciones del usuario:", error);
    return [];
  }
};

// Obtener los detalles de un curso específico por ID o Slug
export const getCourseById = async (courseId) => {
  try {
    const response = await api.get(`/wp-json/wp/v2/courses/${courseId}`);
    return response.data;
  } catch (error) {
    console.error(`Error obteniendo el curso ${courseId}:`, error);
    return null;
  }
};

// Inscribir a un usuario en un curso (Llamada directa a WordPress)
export const enrollStudent = async (email, name, courseId, dni) => {
  try {
    const API_URL = process.env.REACT_APP_CERT_API_URL || 'http://localhost:8000';
    // Hacer la petición a nuestro propio backend (FastAPI) para que él hable con WordPress de forma segura
    const response = await fetch(`${API_URL}/api/wp/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name,
        course_id: courseId,
        dni
      })
    });
    
    const data = await response.json();
    
    // WordPress REST API errors usually have 'code' and 'message' (e.g. code: "missing_data" or "existing_user_email")
    if (data?.error || data?.code === 'missing_data' || data?.code === 'rest_forbidden' || (data?.code && data?.data?.status >= 400)) {
       return { success: false, error: data.error || data.message || 'Error desconocido de WordPress' };
    }
    
    return { success: true, data: data };
  } catch (error) {
    console.error(`Error inscribiendo al estudiante ${email}:`, error);
    return { success: false, error: error.message || 'Error en la inscripción a TutorLMS' };
  }
};

// Enlazar el certificado ya generado en el servidor al perfil del alumno en WordPress (Llamada directa a WordPress)
export const linkCertificateToWP = async (publicUrl, courseId, dni) => {
  try {
    const response = await api.post('/wp-json/stenergy/v1/link-certificate', {
      public_url: publicUrl,
      course_id: courseId,
      dni
    });
    
    if (response.data?.error) {
       return { success: false, error: response.data.error };
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`Error enlazando certificado a WP:`, error);
    return { success: false, error: error.response?.data?.message || error.message || 'Error enlazando certificado a WP' };
  }
};
