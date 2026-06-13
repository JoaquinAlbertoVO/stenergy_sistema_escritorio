import React, { createContext, useContext, useState, useEffect } from 'react';
import { setCurrentUser, getCurrentUser, clearCurrentUser, initializeData, invalidateCache, preloadData } from '../utils/storage';

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
      // Intentar autenticar con el backend
      const response = await fetch(`${process.env.REACT_APP_CERT_API_URL || 'http://localhost:8000'}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setCurrentUser(userData);
        await preloadData();
        return { success: true, user: userData };
      } else {
        return { success: false, error: 'Credenciales inválidas' };
      }
    } catch (error) {
      console.error('Error de autenticación:', error);
      // Fallback: intentar con usuarios locales (para compatibilidad)
      const localUsers = localStorage.getItem('st_energy_users');
      if (localUsers) {
        const users = JSON.parse(localUsers);
        const found = users.find(u => u.username === username && u.password === password);
        if (found) {
          const userData = { id: found.id, name: found.name, username: found.username, role: found.role };
          setUser(userData);
          setCurrentUser(userData);
          await preloadData();
          return { success: true, user: userData };
        }
      }
      return { success: false, error: 'No se pudo conectar al servidor' };
    }
  };

  const logout = () => {
    setUser(null);
    clearCurrentUser();
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
