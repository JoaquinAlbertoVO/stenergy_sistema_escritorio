import api from './api';
import { apiFetch } from '../utils/storage';

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
    const response = await api.post('/wp-json/stenergy/v1/enroll', {
      email,
      name,
      course_id: courseId,
      dni
    });
    
    if (response.data?.error || response.data?.message === 'Lo siento, no tienes permisos para hacer eso.') {
       return { success: false, error: response.data.error || response.data.message };
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`Error inscribiendo al estudiante ${email}:`, error);
    return { success: false, error: error.response?.data?.message || error.message || 'Error en la inscripción a TutorLMS' };
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
