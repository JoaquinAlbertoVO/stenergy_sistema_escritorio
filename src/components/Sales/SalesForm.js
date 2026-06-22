import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { addSale, updateSale, getCourses, getCalendarData, getSales } from '../../utils/storage';
import { enrollStudent } from '../../services/courseService';

function SalesForm({ saleToEdit, onClose, onSave }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    clientName: saleToEdit?.clientName || '',
    clientDni: saleToEdit?.clientDni || '',
    clientPhone: saleToEdit?.clientPhone || '',
    clientEmail: saleToEdit?.clientEmail || '',
    courseId: saleToEdit?.courseId || '',
    totalAmount: saleToEdit?.totalAmount?.toString() || '',
    paidAmount: saleToEdit?.paidAmount?.toString() || '',
    modality: saleToEdit?.modality || 'semipresencial',
    paymentType: saleToEdit ? (saleToEdit.totalAmount === saleToEdit.paidAmount ? 'completo' : 'deuda') : 'completo',
    paymentAccount: saleToEdit?.payments?.[0]?.account || 'BCP',
    paymentDate: saleToEdit?.date || new Date().toISOString().split('T')[0],
    currency: saleToEdit?.certificateOverrides?.currency || 'PEN'
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dniAutoFilled, setDniAutoFilled] = useState(false);
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
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (saleToEdit && saleToEdit.courseId) {
      const entry = calendarEntries.find(e => e.courseId === saleToEdit.courseId);
      if (entry && entry.startDate) return entry.startDate.substring(0, 7);
    }
    return availableMonths.includes(currentMonthStr) ? currentMonthStr : (availableMonths[0] || '');
  });

  // Filter courses to only show those scheduled in the selected month
  const scheduledCourseIds = new Set(
    calendarEntries
      .filter(e => e.startDate && e.startDate.startsWith(selectedMonth))
      .map(e => e.courseId)
  );
  const availableCourses = coursesList.filter(c => scheduledCourseIds.has(c.id));

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // 🔍 Auto-completar datos del cliente cuando el DNI coincide con una venta existente
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

      // Auto-fill price when course is selected
      if (name === 'courseId') {
        const course = availableCourses.find(c => c.id === value);
        if (course) {
          newData.totalAmount = course.price.toString();
          if (newData.paymentType === 'completo') {
            newData.paidAmount = course.price.toString();
          }
        }
      }
      
      if (name === 'paymentType') {
        if (value === 'completo') {
          newData.paidAmount = newData.totalAmount;
        } else {
          newData.paidAmount = ''; // Clear for partial payment
        }
      }
      
      return newData;
    });

    // Clear error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.clientName.trim()) newErrors.clientName = 'Nombre requerido';
    if (!formData.clientDni.trim()) newErrors.clientDni = 'DNI requerido';
    if (!formData.clientPhone.trim()) newErrors.clientPhone = 'Teléfono requerido';
    if (!formData.clientEmail.trim()) newErrors.clientEmail = 'Email requerido';
    if (!formData.courseId) newErrors.courseId = 'Selecciona un curso';
    if (!formData.totalAmount || isNaN(formData.totalAmount)) newErrors.totalAmount = 'Monto inválido';
    if (formData.paidAmount && isNaN(formData.paidAmount)) newErrors.paidAmount = 'Monto inválido';
    if (Number(formData.paidAmount) > Number(formData.totalAmount)) newErrors.paidAmount = 'No puede ser mayor al total';
    if (!formData.modality) newErrors.modality = 'Selecciona una modalidad';

    // 🚫 Validar duplicado: mismo DNI + mismo curso (solo al crear, no al editar)
    if (!saleToEdit && formData.clientDni.trim() && formData.courseId) {
      const duplicate = allSales.find(
        s => s.clientDni === formData.clientDni.trim() && s.courseId === formData.courseId
      );
      if (duplicate) {
        newErrors.courseId = `Este alumno (DNI: ${formData.clientDni}) ya está inscrito en este curso`;
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
      const paid = Number(formData.paidAmount) || 0;
      const total = Number(formData.totalAmount);
      let status = 'pendiente';
      if (paid >= total) status = 'pagado';
      else if (paid > 0) status = 'parcial';

      const course = availableCourses.find(c => c.id === formData.courseId);

      const initialPayment = paid > 0 ? [{
        date: formData.paymentDate,
        amount: paid,
        account: formData.paymentAccount
      }] : [];

      const sale = {
        clientName: formData.clientName.trim(),
        clientDni: formData.clientDni.trim(),
        clientPhone: formData.clientPhone.trim(),
        clientEmail: formData.clientEmail.trim(),
        courseId: formData.courseId,
        courseName: course?.name || '',
        totalAmount: total,
        paidAmount: paid,
        payments: saleToEdit ? saleToEdit.payments : initialPayment,
        status,
        certificateGenerated: saleToEdit ? saleToEdit.certificateGenerated : false,
        modality: formData.modality,
        certificateOverrides: { 
          ...(saleToEdit?.certificateOverrides || {}),
          currency: formData.currency 
        },
        sellerId: saleToEdit ? saleToEdit.sellerId : user.id,
        sellerName: saleToEdit ? saleToEdit.sellerName : user.name,
        date: saleToEdit ? saleToEdit.date : new Date().toISOString().split('T')[0]
      };

      if (saleToEdit) {
        // Editar venta existente
        await updateSale(saleToEdit.id, sale);
        alert("¡Cambios guardados con éxito!");
      } else {
        // Guardar nueva venta localmente
        await addSale(sale);

        // Intentar inscribir en WordPress/TutorLMS usando el servicio solo en creación
        const wpResult = await enrollStudent(sale.clientEmail, sale.clientName, sale.courseId, sale.clientDni);
        
        if (!wpResult.success) {
          alert(`Venta registrada localmente, PERO hubo un problema inscribiendo en WordPress: ${wpResult.error}`);
        } else {
          alert("¡Venta registrada e inscrita en WordPress con éxito!");
          console.log('Inscripción exitosa en WP:', wpResult.data);
        }
      }

      onSave();
    } catch (error) {
      console.error("Error al guardar la venta:", error);
      alert("Ocurrió un error al guardar la venta. Revisa tu conexión o intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const debt = (Number(formData.totalAmount) || 0) - (Number(formData.paidAmount) || 0);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
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
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  placeholder="Ej: Juan Pérez García"
                />
                {errors.clientName && <span className="form-error">{errors.clientName}</span>}
              </div>
              <div className={`form-group ${errors.clientDni ? 'error' : ''}`}>
                <label>DNI</label>
                <input
                  type="text"
                  name="clientDni"
                  value={formData.clientDni}
                  onChange={handleChange}
                  placeholder="DNI, CE o Pasaporte"
                />
                <div className="form-feedback">
                  {errors.clientDni ? <span className="form-error">{errors.clientDni}</span> : null}
                  {dniAutoFilled ? <span className="form-success">✅ Datos autocompletados</span> : null}
                </div>
              </div>
              <div className={`form-group ${errors.clientPhone ? 'error' : ''}`}>
                <label>Teléfono</label>
                <input
                  type="text"
                  name="clientPhone"
                  value={formData.clientPhone}
                  onChange={handleChange}
                  placeholder="987654321"
                />
                {errors.clientPhone && <span className="form-error">{errors.clientPhone}</span>}
              </div>
              <div className={`form-group ${errors.clientEmail ? 'error' : ''}`}>
                <label>Email</label>
                <input
                  type="email"
                  name="clientEmail"
                  value={formData.clientEmail}
                  onChange={handleChange}
                  placeholder="correo@email.com"
                />
                {errors.clientEmail && <span className="form-error">{errors.clientEmail}</span>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Detalle de Venta</h3>
            <div className="form-grid">
              <div className="form-group form-group-full">
                <label>Mes de Inicio</label>
                <select value={selectedMonth} onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setFormData(prev => ({ ...prev, courseId: '', totalAmount: '', paidAmount: '' }));
                }}>
                  {availableMonths.map(monthStr => {
                    const [year, month] = monthStr.split('-');
                    const date = new Date(year, parseInt(month) - 1);
                    const label = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                    return <option key={monthStr} value={monthStr}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>;
                  })}
                  {availableMonths.length === 0 && <option value="">No hay meses disponibles</option>}
                </select>
              </div>
              <div className={`form-group form-group-full ${errors.courseId ? 'error' : ''}`}>
                <label>Curso</label>
                <select name="courseId" value={formData.courseId} onChange={handleChange}>
                  <option value="">Seleccionar curso...</option>
                  {availableCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name} - {formData.currency === 'USD' ? '$' : 'S/'} {c.price}</option>
                  ))}
                  {availableCourses.length === 0 && selectedMonth && <option value="" disabled>No hay cursos este mes</option>}
                </select>
                {errors.courseId && <span className="form-error">{errors.courseId}</span>}
              </div>
              <div className={`form-group ${errors.modality ? 'error' : ''}`}>
                <label>Modalidad</label>
                <select name="modality" value={formData.modality} onChange={handleChange}>
                  <option value="semipresencial">Semipresencial</option>
                  <option value="virtual">Virtual</option>
                </select>
                {errors.modality && <span className="form-error">{errors.modality}</span>}
              </div>
              <div className="form-group">
                <label>Moneda</label>
                <select name="currency" value={formData.currency} onChange={handleChange}>
                  <option value="PEN">Soles (S/)</option>
                  <option value="USD">Dólares ($)</option>
                </select>
              </div>
              <div className={`form-group ${errors.totalAmount ? 'error' : ''}`}>
                <label>Monto Total ({formData.currency === 'USD' ? '$' : 'S/'})</label>
                <input
                  type="number"
                  name="totalAmount"
                  value={formData.totalAmount}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                {errors.totalAmount && <span className="form-error">{errors.totalAmount}</span>}
              </div>
              <div className="form-group">
                <label>Tipo de Pago</label>
                <select name="paymentType" value={formData.paymentType} onChange={handleChange}>
                  <option value="completo">Pago Completo</option>
                  <option value="deuda">Deuda (Pago Parcial)</option>
                </select>
              </div>
              <div className={`form-group ${errors.paidAmount ? 'error' : ''}`}>
                <label>Monto Pagado Inicial ({formData.currency === 'USD' ? '$' : 'S/'})</label>
                <input
                  type="number"
                  name="paidAmount"
                  value={formData.paidAmount}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={formData.paymentType === 'completo'}
                />
                {errors.paidAmount && <span className="form-error">{errors.paidAmount}</span>}
              </div>
              <div className="form-group">
                <label>Fecha de Pago</label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Cuenta de Depósito</label>
                <select name="paymentAccount" value={formData.paymentAccount} onChange={handleChange}>
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

            {formData.totalAmount && (
              <div className="form-summary">
                <div className="summary-item">
                  <span>Total:</span>
                  <strong>{formData.currency === 'USD' ? '$' : 'S/'} {Number(formData.totalAmount).toLocaleString()}</strong>
                </div>
                <div className="summary-item">
                  <span>Pagado:</span>
                  <strong className="text-success">{formData.currency === 'USD' ? '$' : 'S/'} {(Number(formData.paidAmount) || 0).toLocaleString()}</strong>
                </div>
                <div className="summary-item">
                  <span>Deuda:</span>
                  <strong className={debt > 0 ? 'text-danger' : 'text-success'}>
                    {formData.currency === 'USD' ? '$' : 'S/'} {Math.max(0, debt).toLocaleString()}
                  </strong>
                </div>
              </div>
            )}
          </div>

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
  );
}

export default SalesForm;
