import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import SpotlightCard from '../ui/SpotlightCard/SpotlightCard';
import ElectricBorder from '../ui/ElectricBorder/ElectricBorder';
import './Settings.css';

function SettingsPanel() {
  const { theme, toggleTheme, fontSize, setFontSize, language, setLanguage } = useSettings();

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Configuración</h1>
        <p>Ajusta las preferencias del sistema a tu medida</p>
      </div>

      <div className="settings-grid">
        
        {/* APARIENCIA Y TEMAS */}
        <ElectricBorder borderRadius={12} color={theme === 'dark' ? "#ffba0d" : "#4A7F3C"} speed={3}>
          <SpotlightCard className="setting-card" spotlightColor={theme === 'dark' ? "rgba(255, 186, 13, 0.15)" : "rgba(74, 127, 60, 0.15)"}>
            <div className="setting-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M12 2.69l5.66 4.2c.2.15.34.39.34.65v9.92a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7.54c0-.26.14-.5.34-.65L12 2.69z"/>
                <path d="M12 2.69v15.77"/>
              </svg>
              Apariencia
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Tema del Sistema</span>
                <span className="setting-desc">{theme === 'dark' ? 'Modo Oscuro activado' : 'Modo Claro activado'}</span>
              </div>
              <div 
                className={`theme-switch ${theme === 'dark' ? 'active' : ''}`}
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                <div className="theme-switch-knob"></div>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Tamaño de Letra</span>
                <span className="setting-desc">Ajusta la escala de toda la interfaz</span>
              </div>
              <select 
                className="settings-select" 
                value={fontSize} 
                onChange={(e) => setFontSize(e.target.value)}
              >
                <option value="small">Pequeño</option>
                <option value="medium">Mediano</option>
                <option value="large">Grande</option>
              </select>
            </div>
          </SpotlightCard>
        </ElectricBorder>

        {/* IDIOMA Y REGIÓN */}
        <ElectricBorder borderRadius={12} color={theme === 'dark' ? "#00E5FF" : "#8FBE4D"} speed={3}>
          <SpotlightCard className="setting-card" spotlightColor={theme === 'dark' ? "rgba(0, 229, 255, 0.15)" : "rgba(143, 190, 77, 0.15)"}>
            <div className="setting-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              Idioma y Región
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Idioma Preferido</span>
                <span className="setting-desc">Cambia el idioma (Maqueta Inicial)</span>
              </div>
              <select 
                className="settings-select" 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="es">Español (Perú)</option>
                <option value="en">English (US)</option>
                <option value="pt">Português (Brasil)</option>
              </select>
            </div>
          </SpotlightCard>
        </ElectricBorder>

        {/* SISTEMA E INFO */}
        <ElectricBorder borderRadius={12} color={theme === 'dark' ? "#ff4757" : "#4A7F3C"} speed={3}>
          <SpotlightCard className="setting-card" spotlightColor={theme === 'dark' ? "rgba(255, 71, 87, 0.15)" : "rgba(74, 127, 60, 0.15)"}>
            <div className="setting-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              Acerca del Sistema
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Versión</span>
                <span className="setting-desc">Stenergy Dashboard V1</span>
              </div>
              <span className="version-badge">v1.0.0 (Estable)</span>
            </div>

            <div className="setting-row" style={{ marginTop: 'auto' }}>
              <div className="setting-info">
                <span className="setting-label">Desarrollo Web</span>
                <span className="setting-desc">Mantenido por Equipo TI Stenergy</span>
              </div>
            </div>
          </SpotlightCard>
        </ElectricBorder>

      </div>
    </div>
  );
}

export default SettingsPanel;
