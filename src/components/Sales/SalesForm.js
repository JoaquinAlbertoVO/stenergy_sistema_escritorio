import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { addSale, updateSale, getCourses, getCalendarData } from '../../utils/storage';
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
    paymentDate: saleToEdit?.date || new Date().toISOString().split('T')[0]
  });
  const [errors, setErrors] = useState({});
  const coursesList = getCourses();
  
  // Filter courses to only show those scheduled in the calendar
  const calendarEntries = getCalendarData();
  const scheduledCourseIds = new Set(calendarEntries.map(e => e.courseId));
  const availableCourses = coursesList.filter(c => scheduledCourseIds.has(c.id));

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

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
      sellerId: saleToEdit ? saleToEdit.sellerId : user.id,
      sellerName: saleToEdit ? saleToEdit.sellerName : user.name,
      date: saleToEdit ? saleToEdit.date : new Date().toISOString().split('T')[0]
    };

    if (saleToEdit) {
      // Editar venta existente
      updateSale(saleToEdit.id, sale);
    } else {
      // Guardar nueva venta localmente
      addSale(sale);

      // Intentar inscribir en WordPress/TutorLMS usando el servicio solo en creación
      const wpResult = await enrollStudent(sale.clientEmail, sale.clientName, sale.courseId, sale.clientDni);
      
      if (!wpResult.success) {
        alert(`Venta registrada localmente, PERO hubo un problema inscribiendo en WordPress: ${wpResult.error}`);
      } else {
        console.log('Inscripción exitosa en WP:', wpResult.data);
      }
    }

    onSave();
  };

  const debt = (Number(formData.totalAmount) || 0) - (Number(formData.paidAmount) || 0);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
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
                  placeholder="12345678"
                  maxLength="8"
                />
                {errors.clientDni && <span className="form-error">{errors.clientDni}</span>}
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
              <div className={`form-group form-group-full ${errors.courseId ? 'error' : ''}`}>
                <label>Curso</label>
                <select name="courseId" value={formData.courseId} onChange={handleChange}>
                  <option value="">Seleccionar curso...</option>
                  {availableCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name} - S/ {c.price}</option>
                  ))}
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
              <div className={`form-group ${errors.totalAmount ? 'error' : ''}`}>
                <label>Monto Total (S/)</label>
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
                <label>Monto Pagado Inicial (S/)</label>
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
                  <option value="BCP">BCP</option>
                  <option value="BBVA">BBVA</option>
                  <option value="Interbank">Interbank</option>
                  <option value="Yape">Yape</option>
                  <option value="Plin">Plin</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
              </div>
            </div>

            {formData.totalAmount && (
              <div className="form-summary">
                <div className="summary-item">
                  <span>Total:</span>
                  <strong>S/ {Number(formData.totalAmount).toLocaleString()}</strong>
                </div>
                <div className="summary-item">
                  <span>Pagado:</span>
                  <strong className="text-success">S/ {(Number(formData.paidAmount) || 0).toLocaleString()}</strong>
                </div>
                <div className="summary-item">
                  <span>Deuda:</span>
                  <strong className={debt > 0 ? 'text-danger' : 'text-success'}>
                    S/ {Math.max(0, debt).toLocaleString()}
                  </strong>
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              {saleToEdit ? 'Guardar Cambios' : 'Registrar Venta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SalesForm;
