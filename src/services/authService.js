import api from './api';

export const loginUser = async (username, password) => {
  try {
    // Este endpoint es el que expone el plugin "JWT Authentication for WP REST API"
    const response = await api.post('/wp-json/jwt-auth/v1/token', {
      username,
      password,
    });
    
    const { token, user_email, user_nicename, user_display_name } = response.data;
    
    // Guardar token y datos básicos del usuario
    localStorage.setItem('wp_token', token);
    
    // Lo guardamos con la clave que ya usabas en tu sistema
    localStorage.setItem('st_energy_current_user', JSON.stringify({
      username: user_nicename,
      email: user_email,
      name: user_display_name
    }));
    
    return { success: true, user: response.data };
  } catch (error) {
    console.error("Error en el login:", error);
    return { success: false, error: error.response?.data?.message || 'Error de autenticación' };
  }
};

export const logoutUser = () => {
  localStorage.removeItem('wp_token');
  localStorage.removeItem('st_energy_current_user');
};

export const validateToken = async () => {
  try {
    const response = await api.post('/wp-json/jwt-auth/v1/token/validate');
    return response.data; 
  } catch (error) {
    logoutUser(); // Si el token es inválido o expiró, cerramos sesión localmente
    throw error;
  }
};
