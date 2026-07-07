import React, { useState, useEffect } from 'react';

function MysqlConfigModal({ onClose }) {
  const [config, setConfig] = useState({
    host: 'https://', // We'll repurpose 'host' as 'apiUrl'
    password: ''      // We'll repurpose 'password' as 'apiSecret'
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadConfig() {
      if (window.electronAPI) {
        const saved = await window.electronAPI.getMysqlConfig();
        if (saved) {
          setConfig(saved);
        }
      }
    }
    loadConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveMysqlConfig(config);
        setMessage('Configuración guardada exitosamente.');
        setTimeout(() => onClose(), 1500);
      }
    } catch (err) {
      setMessage('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <button className="modal-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div className="modal-header">
          <h2>Configuración de Nube (API)</h2>
          <p>Ingresa la URL de tu API y la Clave Secreta para sincronizar ventas y certificados.</p>
        </div>

        <div className="modal-body form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>URL de la API</label>
            <input type="text" name="host" value={config.host} onChange={handleChange} placeholder="Ej: https://midominio.com/api.php" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Clave Secreta (API Secret)</label>
            <input type="password" name="password" value={config.password} onChange={handleChange} placeholder="La clave configurada en tu api.php" />
          </div>

          {message && (
            <div className={`form-alert ${message.includes('Error') ? 'error' : 'success'}`} style={{ gridColumn: '1 / -1' }}>
              {message}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MysqlConfigModal;
