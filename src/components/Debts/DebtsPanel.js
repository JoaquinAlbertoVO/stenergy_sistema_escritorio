import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSales, updateSale } from '../../utils/storage';
import './Debts.css';

function DebtsPanel() {
  const { user, isAdmin } = useAuth();
  const [debts, setDebts] = useState([]);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAccount, setPaymentAccount] = useState('BCP');
  const [expandedRow, setExpandedRow] = useState(null);
  const [editingDebtPayment, setEditingDebtPayment] = useState(null);
  const [editDebtForm, setEditDebtForm] = useState({ amount: '', date: '', account: 'BCP' });

  const loadDebts = useCallback(() => {
    const sales = getSales();
    let debtSales = sales.filter(s => s.status === 'parcial' || s.status === 'pendiente');
    
    if (!isAdmin()) {
      debtSales = debtSales.filter(s => s.sellerId === user.id);
    }
    
    setDebts(debtSales);
  }, [user, isAdmin]);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  const totalDebt = debts.reduce((sum, s) => sum + (s.totalAmount - s.paidAmount), 0);
  const totalPending = debts.filter(s => s.status === 'pendiente').length;
  const totalPartial = debts.filter(s => s.status === 'parcial').length;

  const handlePayment = () => {
    if (!paymentModal || !paymentAmount || isNaN(paymentAmount)) return;

    const amount = Number(paymentAmount);
    const newPaid = paymentModal.paidAmount + amount;
    let newStatus = 'parcial';
    if (newPaid >= paymentModal.totalAmount) {
      newStatus = 'pagado';
    }

    const newPayment = {
      date: paymentDate,
      amount: amount,
      account: paymentAccount
    };

    const currentPayments = paymentModal.payments || [];

    updateSale(paymentModal.id, {
      paidAmount: Math.min(newPaid, paymentModal.totalAmount),
      status: newStatus,
      payments: [...currentPayments, newPayment]
    });

    setPaymentModal(null);
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentAccount('BCP');
    loadDebts();
  };

  const handleEditDebtPayment = (sale, paymentId) => {
    const payment = sale.payments.find(p => (p.id || '') === paymentId);
    if (!payment) return;
    setEditingDebtPayment(paymentId);
    setEditDebtForm({ amount: payment.amount, date: payment.date, account: payment.account });
  };

  const handleSaveDebtPaymentEdit = (sale, paymentId) => {
    if (!editDebtForm.amount || isNaN(editDebtForm.amount) || Number(editDebtForm.amount) <= 0) return;
    const updatedPayments = (sale.payments || []).map(p =>
      (p.id || '') === paymentId
        ? { ...p, amount: Number(editDebtForm.amount), date: editDebtForm.date, account: editDebtForm.account }
        : p
    );
    const newTotalPaid = updatedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    let newStatus = 'pendiente';
    if (newTotalPaid >= sale.totalAmount) newStatus = 'pagado';
    else if (newTotalPaid > 0) newStatus = 'parcial';
    updateSale(sale.id, { payments: updatedPayments, paidAmount: Math.min(newTotalPaid, sale.totalAmount), status: newStatus });
    setEditingDebtPayment(null);
    loadDebts();
  };

  const handleDeleteDebtPayment = (sale, paymentId) => {
    if (!window.confirm('¿Estás seguro de eliminar este pago?')) return;
    const updatedPayments = (sale.payments || []).filter(p => (p.id || '') !== paymentId);
    const newTotalPaid = updatedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    let newStatus = 'pendiente';
    if (newTotalPaid >= sale.totalAmount) newStatus = 'pagado';
    else if (newTotalPaid > 0) newStatus = 'parcial';
    updateSale(sale.id, { payments: updatedPayments, paidAmount: Math.min(newTotalPaid, sale.totalAmount), status: newStatus });
    loadDebts();
  };

  const getDebtLevel = (total, paid) => {
    const ratio = paid / total;
    if (ratio === 0) return 'critical';
    if (ratio < 0.5) return 'high';
    return 'medium';
  };

  return (
    <div className="debts-panel">
      <div className="debts-summary-row">
        <div className="debt-summary-card">
          <div className="debt-summary-icon" style={{ background: 'rgba(255,71,87,0.1)', color: '#ff4757' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div>
            <span className="debt-summary-label">Deuda Total</span>
            <span className="debt-summary-value" style={{ color: '#ff4757' }}>S/ {totalDebt.toLocaleString()}</span>
          </div>
        </div>

        <div className="debt-summary-card">
          <div className="debt-summary-icon" style={{ background: 'rgba(255,186,13,0.1)', color: '#ffba0d' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <span className="debt-summary-label">Pagos Parciales</span>
            <span className="debt-summary-value" style={{ color: '#ffba0d' }}>{totalPartial}</span>
          </div>
        </div>

        <div className="debt-summary-card">
          <div className="debt-summary-icon" style={{ background: 'rgba(255,71,87,0.1)', color: '#ff4757' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <span className="debt-summary-label">Sin Pago</span>
            <span className="debt-summary-value" style={{ color: '#ff4757' }}>{totalPending}</span>
          </div>
        </div>
      </div>

      <div className="debts-table-wrapper">
        <table className="debts-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Curso</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Deuda</th>
              <th>Progreso</th>
              <th>Asesor</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {debts.map((sale, index) => {
              const debt = sale.totalAmount - sale.paidAmount;
              const progress = (sale.paidAmount / sale.totalAmount) * 100;
              const level = getDebtLevel(sale.totalAmount, sale.paidAmount);

              return (
                <React.Fragment key={sale.id}>
                  <tr style={{ animationDelay: `${index * 0.03}s` }}>
                    <td>
                      <div className="td-client">
                        <span className="client-name">{sale.clientName}</span>
                        <span className="client-email">{sale.clientDni}</span>
                      </div>
                    </td>
                    <td className="td-course">{sale.courseName}</td>
                    <td className="td-amount">S/ {sale.totalAmount}</td>
                    <td className="td-amount td-paid">S/ {sale.paidAmount}</td>
                    <td className="td-amount td-debt">S/ {debt}</td>
                    <td>
                      <div className="debt-progress">
                        <div className="debt-progress-bar">
                          <div
                            className={`debt-progress-fill level-${level}`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <span className="debt-progress-text">{Math.round(progress)}%</span>
                      </div>
                    </td>
                    <td className="td-seller">{sale.sellerName}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn-pay"
                          onClick={() => {
                            setPaymentModal(sale);
                            setPaymentAmount('');
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                          Pagar
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.5rem' }}
                          onClick={() => setExpandedRow(expandedRow === sale.id ? null : sale.id)}
                          title="Ver historial de pagos"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            {expandedRow === sale.id ? (
                              <polyline points="18 15 12 9 6 15"/>
                            ) : (
                              <polyline points="6 9 12 15 18 9"/>
                            )}
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRow === sale.id && (
                    <tr className="expanded-row">
                      <td colSpan="8">
                        <div className="payments-history" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', margin: '0.5rem 0' }}>
                          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Historial de Pagos</h4>
                          {sale.payments && sale.payments.length > 0 ? (
                            <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                  <th style={{ padding: '0.5rem' }}>Fecha</th>
                                  <th style={{ padding: '0.5rem' }}>Monto</th>
                                  <th style={{ padding: '0.5rem' }}>Cuenta</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sale.payments.map((p, i) => {
                                  const pId = p.id || 'dp' + i;
                                  return editingDebtPayment === pId ? (
                                    <tr key={pId} style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,186,13,0.05)' }}>
                                      <td style={{ padding: '0.4rem' }}>
                                        <input type="date" value={editDebtForm.date} onChange={e => setEditDebtForm({...editDebtForm, date: e.target.value})} style={{ padding: '4px 6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'inherit' }} />
                                      </td>
                                      <td style={{ padding: '0.4rem' }}>
                                        <input type="number" value={editDebtForm.amount} onChange={e => setEditDebtForm({...editDebtForm, amount: e.target.value})} step="0.01" style={{ padding: '4px 6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'inherit', width: '80px' }} />
                                      </td>
                                      <td style={{ padding: '0.4rem' }}>
                                        <select value={editDebtForm.account} onChange={e => setEditDebtForm({...editDebtForm, account: e.target.value})} style={{ padding: '4px 6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'inherit' }}>
                                          <option value="PICHINCHA">PICHINCHA</option>
                                          <option value="GUAYAQUIL">GUAYAQUIL</option>
                                          <option value="YAPE MARIELA">YAPE MARIELA</option>
                                          <option value="YAPE DAYSI">YAPE DAYSI</option>
                                          <option value="INTERBANK SOLES">INTERBANK SOLES</option>
                                          <option value="INTERBANK DOLARES">INTERBANK DOLARES</option>
                                          <option value="PAYPAL">PAYPAL</option>
                                          <option value="WESTERN">WESTERN</option>
                                          <option value="NEQUI">NEQUI</option>
                                          <option value="EFECTIVO">EFECTIVO</option>
                                        </select>
                                      </td>
                                      <td style={{ padding: '0.4rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                          <button onClick={() => handleSaveDebtPaymentEdit(sale, pId)} style={{ padding: '4px 8px', background: 'rgba(0,212,170,0.15)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: '6px', color: '#00d4aa', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>✓</button>
                                          <button onClick={() => setEditingDebtPayment(null)} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>✕</button>
                                        </div>
                                      </td>
                                    </tr>
                                  ) : (
                                    <tr key={pId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                      <td style={{ padding: '0.5rem' }}>{p.date}</td>
                                      <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>S/ {p.amount}</td>
                                      <td style={{ padding: '0.5rem' }}>{p.account}</td>
                                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                          <button onClick={() => handleEditDebtPayment(sale, pId)} title="Editar" style={{ padding: '3px 6px', background: 'rgba(255,186,13,0.1)', border: '1px solid rgba(255,186,13,0.25)', borderRadius: '6px', color: '#ffba0d', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit' }}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                          </button>
                                          <button onClick={() => handleDeleteDebtPayment(sale, pId)} title="Eliminar" style={{ padding: '3px 6px', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)', borderRadius: '6px', color: '#ff4757', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit' }}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No hay pagos registrados para esta venta.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {debts.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p>¡Sin deudas pendientes!</p>
            <span>Todos los pagos están al día</span>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-small">
            <div className="modal-header">
              <h2>Registrar Pago</h2>
              <button className="modal-close" onClick={() => setPaymentModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-form">
              <div className="payment-info">
                <p><strong>Cliente:</strong> {paymentModal.clientName}</p>
                <p><strong>Curso:</strong> {paymentModal.courseName}</p>
                <p><strong>Deuda restante:</strong> <span className="text-danger">S/ {paymentModal.totalAmount - paymentModal.paidAmount}</span></p>
              </div>
              <div className="form-group">
                <label>Monto a pagar (S/)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  max={paymentModal.totalAmount - paymentModal.paidAmount}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Fecha de Pago</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Cuenta de Depósito</label>
                <select value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)}>
                  <option value="PICHINCHA">PICHINCHA</option>
                  <option value="GUAYAQUIL">GUAYAQUIL</option>
                  <option value="YAPE MARIELA">YAPE MARIELA</option>
                  <option value="YAPE DAYSI">YAPE DAYSI</option>
                  <option value="INTERBANK SOLES">INTERBANK SOLES</option>
                  <option value="INTERBANK DOLARES">INTERBANK DOLARES</option>
                  <option value="PAYPAL">PAYPAL</option>
                  <option value="WESTERN">WESTERN</option>
                  <option value="NEQUI">NEQUI</option>
                  <option value="EFECTIVO">EFECTIVO</option>
                </select>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setPaymentModal(null)}>Cancelar</button>
                <button className="btn-primary" onClick={handlePayment} disabled={!paymentAmount || Number(paymentAmount) <= 0}>
                  Confirmar Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DebtsPanel;
