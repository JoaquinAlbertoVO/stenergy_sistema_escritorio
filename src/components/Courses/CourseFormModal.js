import React, { useState, useEffect } from 'react';
import { addCourse, updateCourse, getCalendarData, addCalendarEntry, updateCalendarEntry } from '../../utils/storage';
import Loader from '../Loader';

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
  "EXPEDIENTE MT VIRUTAL",
  "ESPECIALIZACION EN ELECTRICIDAD INDUSTRIAL"
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
  const [calDates, setCalDates] = useState({ startDate: '', endDate: '', daysOfWeek: [] });
  const [calEntryId, setCalEntryId] = useState(null);
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      const calendar = getCalendarData();
      const entry = calendar.find(e => e.courseId === courseToEdit.id);
      if (entry) {
        setCalEntryId(entry.id);
        let days = [];
        if (entry.selectedDates && entry.selectedDates.length > 0) {
          const uniqueDays = new Set();
          entry.selectedDates.forEach(ds => {
            const d = new Date(ds + 'T00:00:00');
            uniqueDays.add(d.getDay());
          });
          days = Array.from(uniqueDays);
        }
        setCalDates({
          startDate: entry.startDate || '',
          endDate: entry.endDate || '',
          daysOfWeek: days
        });
      }
    }
  }, [courseToEdit]);

  const toggleDayOfWeek = (dayId) => {
    setCalDates(prev => {
      const days = [...prev.daysOfWeek];
      if (days.includes(dayId)) return { ...prev, daysOfWeek: days.filter(d => d !== dayId) };
      return { ...prev, daysOfWeek: [...days, dayId] };
    });
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const courseData = {
        ...formData,
        price: Number(formData.price)
      };

      if (courseToEdit) {
        await updateCourse(courseToEdit.id, courseData);
        courseData.id = courseToEdit.id;
      } else {
        await addCourse(courseData);
      }
      
      if (calDates.startDate && calDates.endDate) {
        const selectedDates = [];
        let current = new Date(calDates.startDate + 'T00:00:00');
        const end = new Date(calDates.endDate + 'T00:00:00');
        
        while (current <= end) {
          if (calDates.daysOfWeek.length === 0 || calDates.daysOfWeek.includes(current.getDay())) {
            selectedDates.push(current.toISOString().split('T')[0]);
          }
          current.setDate(current.getDate() + 1);
        }

        const calPayload = {
          courseId: courseData.id,
          courseName: courseData.name,
          startDate: calDates.startDate,
          endDate: calDates.endDate,
          selectedDates: selectedDates.length > 0 ? selectedDates : null,
          color: courseData.color
        };

        if (calEntryId) {
          await updateCalendarEntry(calEntryId, calPayload);
        } else {
          const calendar = getCalendarData();
          const existing = calendar.find(e => e.courseId === courseData.id);
          if (existing) {
             await updateCalendarEntry(existing.id, calPayload);
          } else {
             await addCalendarEntry(calPayload);
          }
        }
      }
      
      onSave();
    } catch (error) {
      console.error("Error saving course", error);
      alert("Error guardando el curso: " + (error.message || error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isSubmitting && <Loader />}
      <div className="modal-overlay">
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
                <label>Ícono o URL de Imagen</label>
                <input
                  type="text"
                  name="icon"
                  value={formData.icon}
                  onChange={e => setFormData({...formData, icon: e.target.value})}
                  className="form-control"
                  placeholder="Ej: ⚡ o https://misitio.com/foto.jpg"
                />
                {formData.icon.startsWith('http') && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={formData.icon} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                  </div>
                )}
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

          <div className="form-section">
            <h3 className="form-section-title">Programación (Calendario y Certificados)</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Fecha de Inicio</label>
                <input type="date" value={calDates.startDate} onChange={e => setCalDates({...calDates, startDate: e.target.value})} className="form-control" />
              </div>
              <div className="form-group">
                <label>Fecha de Fin</label>
                <input type="date" value={calDates.endDate} onChange={e => setCalDates({...calDates, endDate: e.target.value})} className="form-control" />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label>Días de clase en este rango</label>
              <div className="days-checkbox-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {[{id: 1, label: 'L'}, {id: 2, label: 'M'}, {id: 3, label: 'X'}, {id: 4, label: 'J'}, {id: 5, label: 'V'}, {id: 6, label: 'S'}, {id: 0, label: 'D'}].map(day => (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDayOfWeek(day.id)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      border: '1px solid var(--border-color)', 
                      background: calDates.daysOfWeek.includes(day.id) ? 'var(--color-primary)' : 'var(--bg-card)',
                      color: calDates.daysOfWeek.includes(day.id) ? '#000' : 'var(--text-secondary)',
                      cursor: 'pointer', fontWeight: 'bold'
                    }}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>Si no marcas ningún día, se asignarán todos los días entre la fecha de inicio y fin.</small>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className={`btn-primary ${isSubmitting ? 'generating' : ''}`} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : (courseToEdit ? 'Guardar Cambios' : 'Crear Curso')}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}

export default CourseFormModal;
