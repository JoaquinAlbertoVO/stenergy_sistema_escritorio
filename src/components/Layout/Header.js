import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

function Header() {
  const { logout } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    switch(location.pathname) {
      case '/': return 'Dashboard';
      case '/ventas': return 'Panel de Ventas';
      case '/deudas': return 'Deudas Pendientes';
      case '/calendario': return 'Calendario de Cursos';
      default: return 'Dashboard';
    }
  };

  const getPageDescription = () => {
    switch(location.pathname) {
      case '/': return 'Resumen general del sistema';
      case '/ventas': return 'Gestión y registro de ventas';
      case '/deudas': return 'Control de pagos pendientes';
      case '/calendario': return 'Programación de cursos';
      default: return '';
    }
  };

  return (
    <header className="main-header">
      <div className="header-left">
        <div className="header-title-group">
          <h1 className="header-title">{getPageTitle()}</h1>
          <p className="header-description">{getPageDescription()}</p>
        </div>
      </div>

      <div className="header-right">
        <div className="header-date">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>{new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>

        <button className="header-logout" onClick={logout} title="Cerrar sesión">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Salir</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
