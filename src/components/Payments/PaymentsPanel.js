import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSales, getCourses } from '../../utils/storage';
import './Payments.css';

function PaymentsPanel() {
  const { user, isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterModality, setFilterModality] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');
  const coursesList = getCourses();

  useEffect(() => {
    let allSales = getSales();
    if (!isAdmin()) {
      allSales = allSales.filter(s => s.sellerId === user.id);
    }
    setSales(allSales);

    // Set default month to current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setFilterMonth(currentMonth);
  }, [user, isAdmin]);

  // Extract and flatten all payments
  const allPayments = useMemo(() => {
    const paymentsList = [];
    sales.forEach(sale => {
      if (sale.payments && Array.isArray(sale.payments)) {
        sale.payments.forEach(payment => {
          paymentsList.push({
            ...payment,
            saleId: sale.id,
            clientName: sale.clientName,
            clientDni: sale.clientDni || '',
            clientPhone: sale.clientPhone || '',
            clientEmail: sale.clientEmail || '',
            modality: sale.modality || 'semipresencial',
            courseName: sale.courseName,
            courseId: sale.courseId,
            sellerName: sale.sellerName,
            // Convert to Date object for easy sorting
            dateObj: new Date(payment.date)
          });
        });
      } else if (sale.paidAmount > 0 && (!sale.payments || sale.payments.length === 0)) {
        // Fallback for older sales that don't have the payments array but have a paidAmount
        paymentsList.push({
          date: sale.date,
          amount: sale.paidAmount,
          account: 'Desconocido',
          saleId: sale.id,
          clientName: sale.clientName,
          clientDni: sale.clientDni || '',
          clientPhone: sale.clientPhone || '',
          clientEmail: sale.clientEmail || '',
          modality: sale.modality || 'semipresencial',
          courseName: sale.courseName,
          courseId: sale.courseId,
          sellerName: sale.sellerName,
          dateObj: new Date(sale.date)
        });
      }
    });

    // Sort chronologically (newest first)
    return paymentsList.sort((a, b) => b.dateObj - a.dateObj);
  }, [sales]);

  // Extract unique accounts for summary
  const accountStats = useMemo(() => {
    const stats = { total: 0 };
    
    // We only calculate stats for the currently filtered month, ignoring the account filter
    const paymentsInMonth = allPayments.filter(payment => {
      if (!filterMonth) return true;
      return payment.date.startsWith(filterMonth);
    });

    paymentsInMonth.forEach(p => {
      const acc = p.account || 'Desconocido';
      if (!stats[acc]) stats[acc] = 0;
      stats[acc] += p.amount;
      stats.total += p.amount;
    });

    return stats;
  }, [allPayments, filterMonth]);

  // Generate list of available months for the filter
  const availableMonths = useMemo(() => {
    const months = new Set();
    allPayments.forEach(p => {
      if (p.date) {
        // Extract YYYY-MM
        months.add(p.date.substring(0, 7));
      }
    });
    return Array.from(months).sort().reverse(); // Newest first
  }, [allPayments]);

  // Final filtered list for the table
  const filteredPayments = useMemo(() => {
    return allPayments.filter(payment => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = payment.clientName.toLowerCase().includes(term) ||
                            payment.clientDni.includes(term) ||
                            payment.clientPhone.includes(term) ||
                            payment.clientEmail.toLowerCase().includes(term);
      const matchesAccount = filterAccount === 'all' || payment.account === filterAccount;
      const matchesCourse = filterCourse === 'all' || payment.courseId === filterCourse;
      const matchesModality = filterModality === 'all' || payment.modality === filterModality;
      const matchesMonth = filterMonth === 'all' || !filterMonth || payment.date.startsWith(filterMonth);
      return matchesSearch && matchesAccount && matchesCourse && matchesModality && matchesMonth;
    });
  }, [allPayments, searchTerm, filterAccount, filterCourse, filterModality, filterMonth]);

  const accountColors = {
    'PICHINCHA': '#ffba0d', // Yellow
    'GUAYAQUIL': '#e31b23', // Red
    'YAPE MARIELA': '#742384', // Purple
    'YAPE DAYSI': '#742384', // Purple
    'INTERBANK SOLES': '#00a443', // Green
    'INTERBANK DOLARES': '#00a443', // Green
    'PAYPAL': '#003087', // Blue
    'WESTERN': '#ffcc00', // Yellow/Black
    'NEQUI': '#2b0a3d', // Dark purple
    'EFECTIVO': '#8e8e8e', // Gray
    'Desconocido': '#333333'
  };

  const getAccountColor = (acc) => accountColors[acc] || accountColors['Desconocido'];

  return (
    <div className="payments-panel">
      
      <div className="payments-summary-row">
        <div className="payment-summary-card" style={{ '--color': 'var(--text-primary)' }}>
          <div className="payment-summary-icon" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-primary)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div>
            <span className="payment-summary-label">Total Recaudado</span>
            <span className="payment-summary-value">S/ {accountStats.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
        </div>

        {Object.entries(accountStats).filter(([k]) => k !== 'total').sort((a, b) => b[1] - a[1]).map(([account, amount]) => (
          <div key={account} className="payment-summary-card">
            <div className="payment-summary-icon" style={{ background: `${getAccountColor(account)}15`, color: getAccountColor(account) }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" ry="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <div>
              <span className="payment-summary-label">{account}</span>
              <span className="payment-summary-value" style={{ color: getAccountColor(account) }}>
                S/ {amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-toolbar">
        <div className="toolbar-left">
          <div className="search-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar por cliente, DNI, teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="all">Todos los meses</option>
            {availableMonths.map(monthStr => {
              // Format YYYY-MM to readable text (e.g., "Mayo 2026")
              const [year, month] = monthStr.split('-');
              const date = new Date(year, parseInt(month) - 1);
              const label = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
              return <option key={monthStr} value={monthStr}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>;
            })}
          </select>

          <select
            className="filter-select"
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
          >
            <option value="all">Todas las cuentas</option>
            {Object.keys(accountColors).filter(k => k !== 'Desconocido').map(acc => (
              <option key={acc} value={acc}>{acc}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
          >
            <option value="all">Todos los cursos</option>
            {coursesList.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filterModality}
            onChange={(e) => setFilterModality(e.target.value)}
          >
            <option value="all">Todas las modalidades</option>
            <option value="semipresencial">Semipresencial</option>
            <option value="virtual">Virtual</option>
          </select>
        </div>
      </div>

      <div className="payments-table-wrapper">
        <table className="payments-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Curso</th>
              <th>Cuenta</th>
              <th>Monto</th>
              {isAdmin() && <th>Asesor</th>}
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((payment, index) => (
              <tr key={`${payment.saleId}-${index}`} style={{ animationDelay: `${index * 0.03}s` }}>
                <td className="td-date">
                  {new Date(payment.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td>
                  <span className="client-name">{payment.clientName}</span>
                </td>
                <td>
                  <span className="course-tag" style={{ 
                    background: `${coursesList.find(c => c.id === payment.courseId)?.color || '#666'}20`,
                    color: coursesList.find(c => c.id === payment.courseId)?.color || '#666'
                  }}>
                    {payment.courseName}
                  </span>
                </td>
                <td className="td-account" style={{ color: getAccountColor(payment.account) }}>
                  {payment.account || 'Desconocido'}
                </td>
                <td className="td-amount">
                  S/ {payment.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </td>
                {isAdmin() && <td className="td-seller">{payment.sellerName}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPayments.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="5" width="20" height="14" rx="2" ry="2"/>
              <line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
            <p>No se encontraron pagos</p>
            <span>Intenta ajustando los filtros de búsqueda o fechas</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentsPanel;
