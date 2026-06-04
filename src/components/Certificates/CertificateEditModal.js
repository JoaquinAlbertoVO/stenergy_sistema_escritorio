import React, { useState, useEffect } from 'react';
import { updateSale, getCourses } from '../../utils/storage';
import { generateCertificate, downloadCertificatePdf, calculateCertificateDates } from '../../utils/certificateUtils';
import { linkCertificateToWP } from '../../services/courseService';

function CertificateEditModal({ sale, onClose, onSave }) {
  const [formData, setFormData] = useState({
    studentName: '',
    dni: '',
    issueDate: '',
    academicHours: '',
    descriptionText: '',
    cpanelFolder: ''
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (sale) {
      // Si ya hay overrides guardados, los usamos
      const overrides = sale.certificateOverrides || {};
      
      // Si no hay overrides, calculamos los valores por defecto
      const courses = getCourses();
      const course = courses.find(c => c.id === sale.courseId);
      
      // Default Dates
      const { issueDate, description: defaultDesc } = calculateCertificateDates(sale.courseId, sale.modality);
      
      // Default Hours
      let defaultHours = '120 horas académicas';
      if (course && course.academicHours) {
        defaultHours = course.academicHours;
      }
      
      // Default Description
      let defaultDescriptionText = `Por haber participado en el curso de "${sale.courseName}", ${defaultDesc}.`;
      if (course && course.descriptionText) {
        defaultDescriptionText = course.descriptionText;
      }

      setFormData({
        studentName: overrides.studentName || sale.clientName,
        dni: overrides.dni || sale.clientDni,
        issueDate: overrides.issueDate || issueDate,
        academicHours: overrides.academicHours || defaultHours,
        descriptionText: overrides.descriptionText || defaultDescriptionText,
        cpanelFolder: overrides.cpanelFolder || course?.cpanelFolder || ''
      });
    }
  }, [sale]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    
    // Guardar los overrides en la venta
    await updateSale(sale.id, {
      certificateOverrides: formData
    });
    
    setMessage({ type: 'success', text: 'Cambios guardados correctamente.' });
    setTimeout(() => setMessage(null), 3000);
    
    if (onSave) onSave();
  };

  const handleGenerate = async () => {
    // Primero guardamos
    await handleSave();
    
    setIsGenerating(true);
    setMessage(null);

    try {
      // Generar certificado pasando la venta actualizada
      const updatedSale = { ...sale, certificateOverrides: formData };
      const result = await generateCertificate(updatedSale);

      if (result.success) {
        await updateSale(sale.id, { certificateGenerated: true });
        await downloadCertificatePdf(result.registry_number);
        
        // Enlazar la URL pública del certificado al perfil del alumno en WordPress
        // El PDF ya existe en stenergyedu.com/CERTIFICADOS_2026/, solo guardamos la referencia
        linkCertificateToWP(
          result.public_url,
          sale.courseId,
          updatedSale.certificateOverrides?.dni || sale.clientDni
        ).then(wpRes => {
          if(!wpRes.success) console.error("Error enlazando a WP:", wpRes.error);
        });

        setMessage({ type: 'success', text: `✅ Certificado generado y enlazado a WP: ${result.registry_number}` });
        if (onSave) onSave();
      } else {
        setMessage({ type: 'error', text: `❌ ${result.error || 'Error al generar'}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Error de conexión con el servidor.` });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Revisar y Editar Certificado</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="cert-modal-body">
          {message && (
            <div style={{
              padding: '12px', marginBottom: '16px', borderRadius: '6px', fontSize: '0.9rem',
              background: message.type === 'success' ? 'rgba(46,213,115,0.1)' : 'rgba(255,71,87,0.1)',
              color: message.type === 'success' ? '#2ed573' : '#ff4757',
              border: `1px solid ${message.type === 'success' ? '#2ed573' : '#ff4757'}`
            }}>
              {message.text}
            </div>
          )}

          <div className="cert-preview-card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--color-primary)' }}>
              Previsualización de Datos
            </h3>
            
            <form id="cert-edit-form" onSubmit={handleSave}>
              <div className="form-grid">
                <div className="form-group form-group-full">
                  <label>Nombre del Alumno (Como aparecerá en el PDF)</label>
                  <input type="text" name="studentName" value={formData.studentName} onChange={handleChange} required />
                </div>
                
                <div className="form-group">
                  <label>DNI</label>
                  <input type="text" name="dni" value={formData.dni} onChange={handleChange} required />
                </div>

                <div className="form-group">
                  <label>Fecha de Emisión (Texto)</label>
                  <input type="text" name="issueDate" value={formData.issueDate} onChange={handleChange} required />
                </div>

                <div className="form-group form-group-full">
                  <label>Horas Académicas</label>
                  <input type="text" name="academicHours" value={formData.academicHours} onChange={handleChange} required />
                </div>

                <div className="form-group form-group-full">
                  <label>Descripción y Fechas del Curso</label>
                  <textarea rows="3" name="descriptionText" value={formData.descriptionText} onChange={handleChange} required />
                </div>

                <div className="form-group form-group-full">
                  <label>Carpeta del Curso en cPanel (Ruta del PDF)</label>
                  <input 
                    type="text" 
                    name="cpanelFolder" 
                    value={formData.cpanelFolder} 
                    onChange={handleChange} 
                    list="cpanel-folders"
                    placeholder="Ej: MANTENIMIENTO_DE_SUBESTACIONES"
                    required 
                  />
                  <datalist id="cpanel-folders">
                    <option value="ANALISIS_DE_FACTURACIÓN" />
                    <option value="ANALIZADOR_DE_REDES" />
                    <option value="BANCO_DE_CONDENSADORES" />
                    <option value="CANALIZACION_TUBERIA_CONDUIT" />
                    <option value="DETECTOR_DE_CABLES" />
                    <option value="EMPALME_AUTOCONTRAIBLE" />
                    <option value="EMPALME_TERMOCONTRAIBLE" />
                    <option value="EMPALMES_TERMINACIONES_3M" />
                    <option value="EXPENDIENTE_MT" />
                    <option value="MANTENIMIENTO_DE_SUBESTACIONES" />
                    <option value="PROTECCIONES_SISTEMAS" />
                    <option value="TERMINACION_AUTOCONTRAIBLE" />
                    <option value="TERMINACIONES_TERMOCONTRAIBLES" />
                  </datalist>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Debe coincidir EXACTAMENTE con el nombre de la carpeta en el cPanel para que el enlace funcione.
                  </span>
                </div>
              </div>
            </form>
          </div>

          <div className="form-actions" style={{ marginTop: '24px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cerrar</button>
            <button type="submit" form="cert-edit-form" className="btn-secondary" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
              Guardar Cambios
            </button>
            <button 
              type="button" 
              className={`btn-primary ${isGenerating ? 'generating' : ''}`} 
              onClick={handleGenerate} 
              disabled={isGenerating}
            >
              {isGenerating ? 'Generando...' : (sale.certificateGenerated ? 'Volver a Generar' : 'Generar Certificado')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CertificateEditModal;
