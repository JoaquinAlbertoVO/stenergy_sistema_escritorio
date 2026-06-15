import React, { useState, useEffect } from 'react';
import { addCourse, updateCourse } from '../../utils/storage';

const COLORS = [
  '#ff6b35', '#00d4aa', '#7c5cfc', '#ff4757', 
  '#ffba0d', '#00b4d8', '#e056a0', '#f59e0b',
  '#2ed573', '#1e90ff'
];

const ICONS = ['⚡', '🔧', '📋', '🏗️', '🤖', '🛡️', '🌍', '☀️', '💻', '📚', '⚙️', '🔌'];

const CPANEL_FOLDERS = [
  "TERMINACIÓN TERMOCONTRAIBLE",
  "TERMINACIÓN TERMOCONTRAIBLE VIRTUAL",
  "EMPALME TERMOCONTRAIBLE",
  "EMPALME TERMOCONTRAIBLE VIRTUAL",
  "ANALIZADOR DE REDES",
  "ANALIZADOR DE REDES VIRTUAL",
  "MANTENIMIENTO DE SUBESTACION",
  "MANTENIMIENTO DE SUBESTACION VIRTUAL",
  "PROTECCIONES SISTEMAS",
  "TERMINACION AUTOCONTRAIBLE",
  "EMPALME AUTOCONTRAIBLE",
  "CANALIZACION TUBERIA CONDUIT",
  "CANALIZACION TUBERIA CONDUIT VIR",
  "BANCO DE CONDENSADORES",
  "BANCO DE CONDENSADORES VIRTUAL",
  "ANALISIS DE FACTURACIÓN",
  "ANALISIS DE FACTURACIÓN VIRTUAL",
  "DETECTOR DE CABLES",
  "DETECTOR DE CABLES VIR",
  "EXPEDIENTE MT",
  "EXPEDIENTE MT VIRUTAL"
];

function CourseFormModal({ courseToEdit, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    courseCode: '',
    price: '',
    color: COLORS[0],
    icon: ICONS[0],
    academicHours: '120 horas académicas',
    descriptionText: 'Por haber aprobado satisfactoriamente el curso.',
    cpanelFolder: CPANEL_FOLDERS[0]
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (courseToEdit) {
      setFormData({
        name: courseToEdit.name || '',
        shortName: courseToEdit.shortName || '',
        courseCode: courseToEdit.courseCode || '',
        price: courseToEdit.price || '',
        color: courseToEdit.color || COLORS[0],
        icon: courseToEdit.icon || ICONS[0],
        academicHours: courseToEdit.academicHours || '120 horas académicas',
        descriptionText: courseToEdit.descriptionText || 'Por haber aprobado satisfactoriamente el curso.',
        cpanelFolder: courseToEdit.cpanelFolder || CPANEL_FOLDERS[0]
      });
    }
  }, [courseToEdit]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Nombre requerido';
    if (!formData.shortName.trim()) newErrors.shortName = 'Nombre corto requerido';
    if (!formData.courseCode.trim()) newErrors.courseCode = 'Código requerido';
    if (!formData.price || isNaN(formData.price)) newErrors.price = 'Precio inválido';
    if (!formData.academicHours.trim()) newErrors.academicHours = 'Horas requeridas';
    if (!formData.descriptionText.trim()) newErrors.descriptionText = 'Descripción requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const courseData = {
      ...formData,
      price: Number(formData.price)
    };

    if (courseToEdit) {
      updateCourse(courseToEdit.id, courseData);
    } else {
      addCourse(courseData);
    }
    
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{courseToEdit ? 'Editar Curso' : 'Nuevo Curso'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Información Básica</h3>
            <div className="form-grid">
              <div className={`form-group form-group-full ${errors.name ? 'error' : ''}`}>
                <label>Nombre Completo del Curso</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Mantenimiento Eléctrico Industrial"
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>
              <div className={`form-group ${errors.shortName ? 'error' : ''}`}>
                <label>Nombre Corto (Etiquetas)</label>
                <input
                  type="text"
                  value={formData.shortName}
                  onChange={e => setFormData({...formData, shortName: e.target.value})}
                  placeholder="Ej: Mant. Eléctrico"
                  maxLength="20"
                />
                {errors.shortName && <span className="form-error">{errors.shortName}</span>}
              </div>
              <div className={`form-group ${errors.courseCode ? 'error' : ''}`}>
                <label>Código del Curso</label>
                <input
                  type="text"
                  value={formData.courseCode}
                  onChange={e => setFormData({...formData, courseCode: e.target.value.toUpperCase()})}
                  placeholder="Ej: BDC, BDCVIR"
                  maxLength="10"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Se usará en el certificado: CERT-{formData.courseCode || 'XXX'}-DNI</span>
                {errors.courseCode && <span className="form-error">{errors.courseCode}</span>}
              </div>
              <div className={`form-group ${errors.price ? 'error' : ''}`}>
                <label>Precio Regular (S/)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  placeholder="0.00"
                  step="0.01"
                />
                {errors.price && <span className="form-error">{errors.price}</span>}
              </div>
            </div>
            
            <div className="form-grid" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label>Ícono</label>
                <div className="color-picker-grid">
                  {ICONS.map(icon => (
                    <div 
                      key={icon}
                      className={`color-swatch ${formData.icon === icon ? 'selected' : ''}`}
                      onClick={() => setFormData({...formData, icon})}
                      style={{ background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
                    >
                      {icon}
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Color Identificador</label>
                <div className="color-picker-grid">
                  {COLORS.map(c => (
                    <div 
                      key={c}
                      className={`color-swatch ${formData.color === c ? 'selected' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setFormData({...formData, color: c})}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Datos para Certificado</h3>
            <div className="form-grid">
              <div className={`form-group form-group-full ${errors.academicHours ? 'error' : ''}`}>
                <label>Horas Académicas</label>
                <input
                  type="text"
                  value={formData.academicHours}
                  onChange={e => setFormData({...formData, academicHours: e.target.value})}
                  placeholder="Ej: 120 horas académicas"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Este texto aparecerá en el PDF del certificado.</span>
                {errors.academicHours && <span className="form-error">{errors.academicHours}</span>}
              </div>
              <div className={`form-group form-group-full ${errors.descriptionText ? 'error' : ''}`}>
                <label>Descripción del Certificado</label>
                <textarea
                  rows="3"
                  value={formData.descriptionText}
                  onChange={e => setFormData({...formData, descriptionText: e.target.value})}
                  placeholder="Ej: Por haber participado satisfactoriamente..."
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>El sistema agregará automáticamente el nombre del curso y las fechas.</span>
                {errors.descriptionText && <span className="form-error">{errors.descriptionText}</span>}
              </div>
              <div className="form-group form-group-full">
                <label>Carpeta cPanel (URL del PDF)</label>
                <select
                  name="cpanelFolder"
                  value={formData.cpanelFolder}
                  onChange={e => setFormData({...formData, cpanelFolder: e.target.value})}
                  className="form-control"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                >
                  {CPANEL_FOLDERS.map(folder => (
                    <option key={folder} value={folder}>{folder}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Esta carpeta se asociará individualmente a este curso.</span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">
              {courseToEdit ? 'Guardar Cambios' : 'Crear Curso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CourseFormModal;
