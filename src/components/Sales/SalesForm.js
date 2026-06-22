import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { addSale, updateSale, getCourses, getCalendarData, getSales } from '../../utils/storage';
import { enrollStudent } from '../../services/courseService';
import Loader from '../Loader';

function SalesForm({ saleToEdit, onClose, onSave }) {
  const { user } = useAuth();
  
  const coursesList = getCourses();
  const allSales = getSales();
  const calendarEntries = getCalendarData();
  
  const availableMonths = React.useMemo(() => {
    const months = new Set();
    calendarEntries.forEach(e => {
      if (e.startDate) months.add(e.startDate.substring(0, 7)); // YYYY-MM
    });
    return Array.from(months).sort().reverse();
  }, [calendarEntries]);

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const getInitialMonth = (cId) => {
    if (cId) {
      const entry = calendarEntries.find(e => e.courseId === cId);
      if (entry && entry.startDate) return entry.startDate.substring(0, 7);
    }
    return availableMonths.includes(currentMonthStr) ? currentMonthStr : (availableMonths[0] || '');
  };

  const createEmptyCourseBlock = () => ({
    courseId: '',
    totalAmount: '',
    paidAmount: '',
    modality: 'semipresencial',
    paymentType: 'completo',
    paymentAccount: 'PICHINCHA',
    paymentDate: new Date().toISOString().split('T')[0],
    currency: 'PEN',
    selectedMonth: getInitialMonth(null)
  });

  const [clientData, setClientData] = useState({
    clientName: saleToEdit?.clientName || '',
    clientDni: saleToEdit?.clientDni || '',
    clientPhone: saleToEdit?.clientPhone || '',
    clientEmail: saleToEdit?.clientEmail || '',
  });

  const [courseBlocks, setCourseBlocks] = useState(() => {
    if (saleToEdit) {
      return [{
        courseId: saleToEdit.courseId || '',
        totalAmount: saleToEdit.totalAmount?.toString() || '',
        paidAmount: saleToEdit.paidAmount?.toString() || '',
        modality: saleToEdit.modality || 'semipresencial',
        paymentType: saleToEdit.totalAmount === saleToEdit.paidAmount ? 'completo' : 'deuda',
        paymentAccount: saleToEdit.payments?.[0]?.account || 'PICHINCHA',
        paymentDate: saleToEdit.date || new Date().toISOString().split('T')[0],
        currency: saleToEdit.certificateOverrides?.currency || 'PEN',
        selectedMonth: getInitialMonth(saleToEdit.courseId)
      }];
    }
    return [createEmptyCourseBlock()];
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dniAutoFilled, setDniAutoFilled] = useState(false);

  const handleClientChange = (e) => {
    const { name, value } = e.target;
    setClientData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'clientDni' && value.trim().length >= 7 && !saleToEdit) {
        const existingSale = allSales.find(s => s.clientDni === value.trim());
        if (existingSale) {
          newData.clientName = existingSale.clientName || '';
          newData.clientPhone = existingSale.clientPhone || '';
          newData.clientEmail = existingSale.clientEmail || '';
          setDniAutoFilled(true);
        } else {
          setDniAutoFilled(false);
        }
      } else if (name === 'clientDni') {
        setDniAutoFilled(false);
      }
      return newData;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleCourseChange = (index, e) => {
    const { name, value } = e.target;
    
    setCourseBlocks(prev => {
      const newBlocks = [...prev];
      const block = { ...newBlocks[index] };
      block[name] = value;

      if (name === 'selectedMonth') {
        block.courseId = '';
        block.totalAmount = '';
        block.paidAmount = '';
      }

      if (name === 'courseId') {
        const scheduledCourseIds = new Set(
          calendarEntries.filter(entry => entry.startDate && entry.startDate.startsWith(block.selectedMonth)).map(entry => entry.courseId)
        );
        const availableCourses = coursesList.filter(c => scheduledCourseIds.has(c.id));
        const course = availableCourses.find(c => c.id === value);
        if (course) {
          block.totalAmount = course.price.toString();
          if (block.paymentType === 'completo') {
            block.paidAmount = course.price.toString();
          }
        }
      }

      if (name === 'paymentType') {
        if (value === 'completo') {
          block.paidAmount = block.totalAmount;
        } else {
          block.paidAmount = '';
        }
      }

      newBlocks[index] = block;
      return newBlocks;
    });

    const errorKey = `${name}_${index}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
    if (name === 'courseId' && errors.duplicate) {
      setErrors(prev => ({ ...prev, duplicate: '' }));
    }
  };

  const addCourseBlock = () => {
    setCourseBlocks(prev => [...prev, createEmptyCourseBlock()]);
  };

  const removeCourseBlock = (index) => {
    setCourseBlocks(prev => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors = {};
    if (!clientData.clientName.trim()) newErrors.clientName = 'Nombre requerido';
    if (!clientData.clientDni.trim()) newErrors.clientDni = 'DNI requerido';
    if (!clientData.clientPhone.trim()) newErrors.clientPhone = 'Teléfono requerido';
    if (!clientData.clientEmail.trim()) newErrors.clientEmail = 'Email requerido';

    courseBlocks.forEach((block, index) => {
      if (!block.courseId) newErrors[`courseId_${index}`] = 'Selecciona un curso';
      if (!block.totalAmount || isNaN(block.totalAmount)) newErrors[`totalAmount_${index}`] = 'Monto inválido';
      if (block.paidAmount && isNaN(block.paidAmount)) newErrors[`paidAmount_${index}`] = 'Monto inválido';
      if (Number(block.paidAmount) > Number(block.totalAmount)) newErrors[`paidAmount_${index}`] = 'No puede ser mayor al total';
      if (!block.modality) newErrors[`modality_${index}`] = 'Selecciona una modalidad';
    });

    if (!saleToEdit && clientData.clientDni.trim()) {
      const selectedCourses = courseBlocks.map(b => b.courseId).filter(Boolean);
      
      const duplicateInForm = selectedCourses.filter((item, index) => selectedCourses.indexOf(item) !== index);
      if (duplicateInForm.length > 0) {
        newErrors.duplicate = 'Has seleccionado el mismo curso más de una vez';
      }

      for (const block of courseBlocks) {
        if (block.courseId) {
          const duplicate = allSales.find(
            s => s.clientDni === clientData.clientDni.trim() && s.courseId === block.courseId
          );
          if (duplicate) {
            newErrors.duplicate = `Este alumno (DNI: ${clientData.clientDni}) ya está inscrito en uno de los cursos seleccionados`;
          }
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (saleToEdit) {
        const block = courseBlocks[0];
        const paid = Number(block.paidAmount) || 0;
        const total = Number(block.totalAmount);
        let status = 'pendiente';
        if (paid >= total) status = 'pagado';
        else if (paid > 0) status = 'parcial';

        const course = coursesList.find(c => c.id === block.courseId);

        const updatedSale = {
          clientName: clientData.clientName.trim(),
          clientDni: clientData.clientDni.trim(),
          clientPhone: clientData.clientPhone.trim(),
          clientEmail: clientData.clientEmail.trim(),
          courseId: block.courseId,
          courseName: course?.name || '',
          totalAmount: total,
          paidAmount: paid,
          payments: saleToEdit.payments, // Keep existing on edit
          status,
          certificateGenerated: saleToEdit.certificateGenerated,
          modality: block.modality,
          certificateOverrides: { 
            ...(saleToEdit.certificateOverrides || {}),
            currency: block.currency 
          },
          sellerId: saleToEdit.sellerId,
          sellerName: saleToEdit.sellerName,
          date: saleToEdit.date
        };

        await updateSale(saleToEdit.id, updatedSale);
        alert("¡Cambios guardados con éxito!");
      } else {
        let allSuccess = true;
        let wpErrorMsg = '';

        for (const block of courseBlocks) {
          const paid = Number(block.paidAmount) || 0;
          const total = Number(block.totalAmount);
          let status = 'pendiente';
          if (paid >= total) status = 'pagado';
          else if (paid > 0) status = 'parcial';

          const course = coursesList.find(c => c.id === block.courseId);

          const initialPayment = paid > 0 ? [{
            date: block.paymentDate,
            amount: paid,
            account: block.paymentAccount
          }] : [];

          const newSale = {
            clientName: clientData.clientName.trim(),
            clientDni: clientData.clientDni.trim(),
            clientPhone: clientData.clientPhone.trim(),
            clientEmail: clientData.clientEmail.trim(),
            courseId: block.courseId,
            courseName: course?.name || '',
            totalAmount: total,
            paidAmount: paid,
            payments: initialPayment,
            status,
            certificateGenerated: false,
            modality: block.modality,
            certificateOverrides: { currency: block.currency },
            sellerId: user.id,
            sellerName: user.name,
            date: new Date().toISOString().split('T')[0]
          };

          await addSale(newSale);
          
          const wpResult = await enrollStudent(newSale.clientEmail, newSale.clientName, newSale.courseId, newSale.clientDni);
          if (!wpResult.success) {
            allSuccess = false;
            wpErrorMsg += `${course?.name}: ${wpResult.error}\n`;
          }
        }

        if (allSuccess) {
          alert(`¡${courseBlocks.length > 1 ? 'Ventas registradas e inscripciones' : 'Venta registrada e inscripción'} en WordPress con éxito!`);
        } else {
          alert(`Ventas guardadas localmente. Hubo problemas con WordPress:\n${wpErrorMsg}`);
        }
      }

      onSave();
    } catch (error) {
      console.error("Error al guardar la venta:", error);
      alert("Ocurrió un error al guardar. Revisa tu conexión o intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isSubmitting && <Loader />}
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>{saleToEdit ? 'Editar Venta' : 'Registrar Nueva Venta'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Datos del Cliente</h3>
            <div className="form-grid">
              <div className={`form-group ${errors.clientName ? 'error' : ''}`}>
                <label>Nombre completo</label>
                <input type="text" name="clientName" value={clientData.clientName} onChange={handleClientChange} placeholder="Ej: Juan Pérez García" />
                {errors.clientName && <span className="form-error">{errors.clientName}</span>}
              </div>
              <div className={`form-group ${errors.clientDni ? 'error' : ''}`}>
                <label>DNI</label>
                <input type="text" name="clientDni" value={clientData.clientDni} onChange={handleClientChange} placeholder="DNI, CE o Pasaporte" />
                <div className="form-feedback">
                  {errors.clientDni ? <span className="form-error">{errors.clientDni}</span> : null}
                  {dniAutoFilled ? <span className="form-success">✅ Datos autocompletados</span> : null}
                </div>
              </div>
              <div className={`form-group ${errors.clientPhone ? 'error' : ''}`}>
                <label>Teléfono</label>
                <input type="text" name="clientPhone" value={clientData.clientPhone} onChange={handleClientChange} placeholder="987654321" />
                {errors.clientPhone && <span className="form-error">{errors.clientPhone}</span>}
              </div>
              <div className={`form-group ${errors.clientEmail ? 'error' : ''}`}>
                <label>Email</label>
                <input type="email" name="clientEmail" value={clientData.clientEmail} onChange={handleClientChange} placeholder="correo@email.com" />
                {errors.clientEmail && <span className="form-error">{errors.clientEmail}</span>}
              </div>
            </div>
          </div>

          {errors.duplicate && (
            <div style={{ background: '#ff4d4f22', color: '#ff4d4f', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ff4d4f55' }}>
              ⚠️ {errors.duplicate}
            </div>
          )}

          {courseBlocks.map((block, index) => {
            const scheduledCourseIds = new Set(
              calendarEntries.filter(e => e.startDate && e.startDate.startsWith(block.selectedMonth)).map(e => e.courseId)
            );
            const availableCourses = coursesList.filter(c => scheduledCourseIds.has(c.id));
            const debt = (Number(block.totalAmount) || 0) - (Number(block.paidAmount) || 0);

            return (
              <div key={index} className="form-section" style={{ position: 'relative', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                <h3 className="form-section-title" style={{ marginTop: 0 }}>
                  Detalle del Curso {courseBlocks.length > 1 ? index + 1 : ''}
                </h3>
                
                {!saleToEdit && courseBlocks.length > 1 && (
                  <button type="button" onClick={() => removeCourseBlock(index)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Quitar
                  </button>
                )}

                <div className="form-grid">
                  <div className="form-group form-group-full">
                    <label>Mes de Inicio</label>
                    <select name="selectedMonth" value={block.selectedMonth} onChange={(e) => handleCourseChange(index, e)}>
                      {availableMonths.map(monthStr => {
                        const [year, month] = monthStr.split('-');
                        const date = new Date(year, parseInt(month) - 1);
                        const label = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                        return <option key={monthStr} value={monthStr}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>;
                      })}
                      {availableMonths.length === 0 && <option value="">No hay meses disponibles</option>}
                    </select>
                  </div>
                  
                  <div className={`form-group form-group-full ${errors[`courseId_${index}`] ? 'error' : ''}`}>
                    <label>Curso</label>
                    <select name="courseId" value={block.courseId} onChange={(e) => handleCourseChange(index, e)}>
                      <option value="">Seleccionar curso...</option>
                      {availableCourses.map(c => {
                        const isUrl = c.icon && (c.icon.includes('http') || c.icon.includes('www'));
                        return (
                          <option key={c.id} value={c.id}>
                            {c.icon && !isUrl ? c.icon.trim() + ' ' : ''}{c.name} - {block.currency === 'USD' ? '$' : 'S/'} {c.price}
                          </option>
                        );
                      })}
                      {availableCourses.length === 0 && block.selectedMonth && <option value="" disabled>No hay cursos este mes</option>}
                    </select>
                    {errors[`courseId_${index}`] && <span className="form-error">{errors[`courseId_${index}`]}</span>}
                  </div>

                  <div className={`form-group ${errors[`modality_${index}`] ? 'error' : ''}`}>
                    <label>Modalidad</label>
                    <select name="modality" value={block.modality} onChange={(e) => handleCourseChange(index, e)}>
                      <option value="semipresencial">Semipresencial</option>
                      <option value="virtual">Virtual</option>
                    </select>
                    {errors[`modality_${index}`] && <span className="form-error">{errors[`modality_${index}`]}</span>}
                  </div>
                  
                  <div className="form-group">
                    <label>Moneda</label>
                    <select name="currency" value={block.currency} onChange={(e) => handleCourseChange(index, e)}>
                      <option value="PEN">Soles (S/)</option>
                      <option value="USD">Dólares ($)</option>
                    </select>
                  </div>

                  <div className={`form-group ${errors[`totalAmount_${index}`] ? 'error' : ''}`}>
                    <label>Monto Total ({block.currency === 'USD' ? '$' : 'S/'})</label>
                    <input type="number" name="totalAmount" value={block.totalAmount} onChange={(e) => handleCourseChange(index, e)} placeholder="0.00" min="0" step="0.01" />
                    {errors[`totalAmount_${index}`] && <span className="form-error">{errors[`totalAmount_${index}`]}</span>}
                  </div>

                  <div className="form-group">
                    <label>Tipo de Pago</label>
                    <select name="paymentType" value={block.paymentType} onChange={(e) => handleCourseChange(index, e)}>
                      <option value="completo">Pago Completo</option>
                      <option value="deuda">Deuda (Pago Parcial)</option>
                    </select>
                  </div>

                  <div className={`form-group ${errors[`paidAmount_${index}`] ? 'error' : ''}`}>
                    <label>Monto Pagado Inicial ({block.currency === 'USD' ? '$' : 'S/'})</label>
                    <input type="number" name="paidAmount" value={block.paidAmount} onChange={(e) => handleCourseChange(index, e)} placeholder="0.00" min="0" step="0.01" disabled={block.paymentType === 'completo'} />
                    {errors[`paidAmount_${index}`] && <span className="form-error">{errors[`paidAmount_${index}`]}</span>}
                  </div>

                  <div className="form-group">
                    <label>Fecha de Pago</label>
                    <input type="date" name="paymentDate" value={block.paymentDate} onChange={(e) => handleCourseChange(index, e)} />
                  </div>

                  <div className="form-group">
                    <label>Cuenta de Depósito</label>
                    <select name="paymentAccount" value={block.paymentAccount} onChange={(e) => handleCourseChange(index, e)}>
                      <option value="PICHINCHA">PICHINCHA</option>
                      <option value="GUAYAQUIL">GUAYAQUIL</option>
                      <option value="YAPE MARIELA">YAPE MARIELA</option>
                      <option value="YAPE DAYSI">YAPE DAYSI</option>
                      <option value="INTERBANK">INTERBANK</option>
                      <option value="PAYPAL">PAYPAL</option>
                      <option value="WESTERN">WESTERN</option>
                      <option value="NEQUI">NEQUI</option>
                      <option value="EFECTIVO">EFECTIVO</option>
                    </select>
                  </div>
                </div>

                {block.totalAmount && (
                  <div className="form-summary" style={{ background: 'var(--bg-card)' }}>
                    <div className="summary-item">
                      <span>Total Curso {courseBlocks.length > 1 ? index + 1 : ''}:</span>
                      <strong>{block.currency === 'USD' ? '$' : 'S/'} {Number(block.totalAmount).toLocaleString()}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Pagado:</span>
                      <strong className="text-success">{block.currency === 'USD' ? '$' : 'S/'} {(Number(block.paidAmount) || 0).toLocaleString()}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Deuda:</span>
                      <strong className={debt > 0 ? 'text-danger' : 'text-success'}>
                        {block.currency === 'USD' ? '$' : 'S/'} {Math.max(0, debt).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!saleToEdit && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <button type="button" onClick={addCourseBlock} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '30px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Añadir otro curso a esta venta
              </button>
            </div>
          )}

          {courseBlocks.length > 1 && (
            <div className="form-summary" style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.1), rgba(0,212,170,0.05))', border: '1px solid rgba(0,212,170,0.2)' }}>
              <h4 style={{ margin: 0, width: '100%', color: 'var(--text-primary)', marginBottom: '12px' }}>Resumen General de la Venta Múltiple</h4>
              <div className="summary-item">
                <span>Total General:</span>
                <strong style={{ fontSize: '1.2rem' }}>
                  {courseBlocks.map(b => Number(b.totalAmount) || 0).reduce((a, b) => a + b, 0).toLocaleString()}
                </strong>
              </div>
              <div className="summary-item">
                <span>Total Pagado:</span>
                <strong className="text-success" style={{ fontSize: '1.2rem' }}>
                  {courseBlocks.map(b => Number(b.paidAmount) || 0).reduce((a, b) => a + b, 0).toLocaleString()}
                </strong>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className={`btn-primary ${isSubmitting ? 'generating' : ''}`} disabled={isSubmitting}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              {isSubmitting ? 'Guardando...' : (saleToEdit ? 'Guardar Cambios' : 'Registrar Venta')}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}

export default SalesForm;
