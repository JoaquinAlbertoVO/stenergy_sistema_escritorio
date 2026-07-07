import React, { createContext, useContext, useState, useEffect } from 'react';
import { setCurrentUser, getCurrentUser, clearCurrentUser, initializeData, preloadData } from '../utils/storage';
import { logoutUser as logoutWP } from '../services/authService';
import Loader from '../components/Loader';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadApp = async () => {
      initializeData();

      const savedUser = getCurrentUser();
      if (savedUser) {
        setUser(savedUser);
        await preloadData();
      }
      setLoading(false);
    };

    loadApp();
  }, []);

  const login = async (username, password) => {
    try {
      if (window.electronAPI) {
        const response = await window.electronAPI.authenticateUser(username, password);
        if (response.success) {
          setUser(response.user);
          setCurrentUser(response.user);
          await preloadData();
          return { success: true, user: response.user };
        } else {
          return { success: false, error: response.error || 'Credenciales inválidas' };
        }
      }
      return { success: false, error: 'La aplicación no está corriendo en modo Electron.' };
    } catch (error) {
      console.error('Error de autenticación:', error);
      return { success: false, error: 'Error del sistema' };
    }
  };

  const logout = () => {
    setUser(null);
    clearCurrentUser();
    logoutWP();
  };

  const isAdmin = () => user?.role === 'admin';
  const isAsesor = () => user?.role === 'asesor1' || user?.role === 'asesor2';

  if (loading) {
    return <Loader />;
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
