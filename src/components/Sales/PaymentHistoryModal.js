import React, { useState } from 'react';
import { updateSale } from '../../utils/storage';

function PaymentHistoryModal({ sale, onClose, onSave }) {
  const [payments, setPayments] = useState(
    (sale.payments || []).map((p, i) => ({ ...p, id: p.id || 'p' + i }))
  );
  const [editingPayment, setEditingPayment] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', date: '', account: 'BCP' });
  const [newPayment, setNewPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    account: 'BCP'
  });

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const debt = sale.totalAmount - totalPaid;

  const persistPayments = (updatedPayments) => {
    const newTotalPaid = updatedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    let newStatus = 'pendiente';
    if (newTotalPaid >= sale.totalAmount) newStatus = 'pagado';
    else if (newTotalPaid > 0) newStatus = 'parcial';

    updateSale(sale.id, {
      payments: updatedPayments,
      paidAmount: Math.min(newTotalPaid, sale.totalAmount),
      status: newStatus
    });

    setPayments(updatedPayments);
    onSave();
  };

  const handleAddPayment = (e) => {
    e.preventDefault();
    if (!newPayment.amount || isNaN(newPayment.amount) || Number(newPayment.amount) <= 0) return;
    if (Number(newPayment.amount) > debt) {
      alert('El monto ingresado supera la deuda actual.');
      return;
    }

    const updatedPayments = [...payments, {
      id: 'p' + Date.now(),
      amount: Number(newPayment.amount),
      date: newPayment.date,
      account: newPayment.account
    }];

    persistPayments(updatedPayments);
    setNewPayment({ ...newPayment, amount: '' });
  };

  const handleStartEdit = (payment) => {
    setEditingPayment(payment.id);
    setEditForm({
      amount: payment.amount,
      date: payment.date,
      account: payment.account
    });
  };

  const handleSaveEdit = (paymentId) => {
    if (!editForm.amount || isNaN(editForm.amount) || Number(editForm.amount) <= 0) return;

    const updatedPayments = payments.map(p =>
      p.id === paymentId
        ? { ...p, amount: Number(editForm.amount), date: editForm.date, account: editForm.account }
        : p
    );

    persistPayments(updatedPayments);
    setEditingPayment(null);
  };

  const handleDeletePayment = (paymentId) => {
    if (!window.confirm('¿Estás seguro de eliminar este pago?')) return;
    const updatedPayments = payments.filter(p => p.id !== paymentId);
    persistPayments(updatedPayments);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h2>Historial de Pagos</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="payment-history-body" style={{ padding: '20px' }}>
          <div className="payment-summary" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div className="ps-item">Total Venta: <br/><strong>S/ {sale.totalAmount}</strong></div>
            <div className="ps-item text-success">Total Pagado: <br/><strong>S/ {totalPaid}</strong></div>
            <div className={`ps-item ${debt > 0 ? 'text-danger' : ''}`}>Deuda Actual: <br/><strong>S/ {Math.max(0, debt)}</strong></div>
          </div>
          
          <div className="payments-list" style={{ marginBottom: '20px' }}>
            {payments.length === 0 ? (
              <p className="no-payments" style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>No hay pagos registrados aún.</p>
            ) : (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px 0' }}>Fecha</th>
                    <th>Cuenta</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                    <th style={{ textAlign: 'right', width: '100px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    editingPayment === p.id ? (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,186,13,0.05)' }}>
                        <td style={{ padding: '6px 4px 6px 0' }}>
                          <input
                            type="date"
                            value={editForm.date}
                            onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                            style={{ padding: '4px 6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'inherit', width: '100%' }}
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <select
                            value={editForm.account}
                            onChange={e => setEditForm({ ...editForm, account: e.target.value })}
                            style={{ padding: '4px 6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'inherit' }}
                          >
                            <option value="BCP">BCP</option>
                            <option value="BBVA">BBVA</option>
                            <option value="Interbank">Interbank</option>
                            <option value="Yape">Yape</option>
                            <option value="Plin">Plin</option>
                            <option value="Efectivo">Efectivo</option>
                          </select>
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input
                            type="number"
                            value={editForm.amount}
                            onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                            style={{ padding: '4px 6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'inherit', width: '80px', textAlign: 'right' }}
                            step="0.01"
                          />
                        </td>
                        <td style={{ textAlign: 'right', display: 'flex', gap: '4px', justifyContent: 'flex-end', padding: '6px 0' }}>
                          <button
                            onClick={() => handleSaveEdit(p.id)}
                            style={{ padding: '4px 8px', background: 'rgba(0,212,170,0.15)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: '6px', color: '#00d4aa', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingPayment(null)}
                            style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px 0' }}>{new Date(p.date).toLocaleDateString('es-PE', { timeZone: 'UTC' })}</td>
                        <td>{p.account}</td>
                        <td className="text-success" style={{ textAlign: 'right', fontWeight: 'bold' }}>S/ {p.amount}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleStartEdit(p)}
                              title="Editar pago"
                              style={{ padding: '3px 6px', background: 'rgba(255,186,13,0.1)', border: '1px solid rgba(255,186,13,0.25)', borderRadius: '6px', color: '#ffba0d', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit' }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeletePayment(p.id)}
                              title="Eliminar pago"
                              style={{ padding: '3px 6px', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)', borderRadius: '6px', color: '#ff4757', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit' }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {debt > 0 && (
            <form className="add-payment-form" onSubmit={handleAddPayment} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>Registrar Nuevo Pago</h4>
              <div className="form-grid" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label>Monto (S/)</label>
                  <input
                    type="number"
                    value={newPayment.amount}
                    onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                    max={debt}
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={newPayment.date}
                    onChange={e => setNewPayment({...newPayment, date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Cuenta</label>
                  <select value={newPayment.account} onChange={e => setNewPayment({...newPayment, account: e.target.value})}>
                    <option value="BCP">BCP</option>
                    <option value="BBVA">BBVA</option>
                    <option value="Interbank">Interbank</option>
                    <option value="Yape">Yape</option>
                    <option value="Plin">Plin</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                Agregar Pago
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentHistoryModal;
