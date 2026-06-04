import React, { createContext, useContext, useState, useEffect } from 'react';
import { setCurrentUser, getCurrentUser, clearCurrentUser, initializeData } from '../utils/storage';
import { loginUser as loginWP, logoutUser as logoutWP } from '../services/authService';
import { getCourses as getWPCourses } from '../services/courseService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadApp = async () => {
      initializeData();

      try {
        // 1. Descargamos los cursos reales de WordPress
        const wpCourses = await getWPCourses();
        if (wpCourses && wpCourses.length > 0) {
          // Extraemos los cursos locales actuales para no perder la configuración de certificados
          const localData = localStorage.getItem('st_energy_courses');
          const localCourses = localData ? JSON.parse(localData) : [];

          // 2. Los transformamos al formato que tu React espera, fusionando con lo que ya tenías
          const mappedCourses = wpCourses.map(wp => {
            const existing = localCourses.find(c => c.id === wp.id.toString());
            return {
              id: wp.id.toString(),
              name: wp.title.rendered,
              // Quitamos entidades HTML como &#8211; del nombre corto
              shortName: wp.title.rendered.replace(/&#[0-9]+;/g, '-').substring(0, 20),
              duration: existing?.duration || 'Asíncrono',
              price: existing?.price || 0, 
              color: existing?.color || '#00d4aa',
              icon: existing?.icon || '🎓',
              courseCode: existing?.courseCode || '',
              cpanelFolder: existing?.cpanelFolder || '',
              academicHours: existing?.academicHours || '120 horas académicas',
              descriptionText: existing?.descriptionText || 'Por haber aprobado satisfactoriamente el curso.'
            };
          });

          // También agregamos los cursos creados manualmente de forma local que no existen en WP (si los hubiera)
          const localOnlyCourses = localCourses.filter(lc => !mappedCourses.find(mc => mc.id === lc.id));
          const finalCourses = [...mappedCourses, ...localOnlyCourses];

          // 3. Sobrescribimos el catálogo local preservando los datos extra
          localStorage.setItem('st_energy_courses', JSON.stringify(finalCourses));
        }
      } catch (error) {
        console.error("No se pudieron sincronizar los cursos de WP", error);
      }

      const savedUser = getCurrentUser();
      if (savedUser) {
        setUser(savedUser);
      }
      setLoading(false);
    };

    loadApp();
  }, []);

  const login = async (username, password) => {
    const result = await loginWP(username, password);
    if (result.success) {
      // Como WP no nos devuelve el rol 'admin' o 'asesor' por defecto en el JWT (a menos que se configure),
      // temporalmente asignamos 'admin' o puedes adaptarlo después.
      const userData = { ...result.user, role: 'admin' };
      setUser(userData);
      setCurrentUser(userData); // Mantiene compatibilidad con tu sistema actual
      return { success: true, user: userData };
    }
    return { success: false, error: result.error };
  };

  const logout = () => {
    setUser(null);
    clearCurrentUser();
    logoutWP(); // Limpia el token JWT
  };

  const isAdmin = () => user?.role === 'admin';
  const isAsesor = () => user?.role === 'asesor1' || user?.role === 'asesor2';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f' }}>
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isAsesor }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
