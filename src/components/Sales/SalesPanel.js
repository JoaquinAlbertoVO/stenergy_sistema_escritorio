import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSales, getCourses } from '../../utils/storage';
import SalesForm from './SalesForm';
import PaymentHistoryModal from './PaymentHistoryModal';
import CountUp from '../ui/CountUp/CountUp';
import ElectricBorder from '../ui/ElectricBorder/ElectricBorder';
import GlareHover from '../ui/GlareHover/GlareHover';
import './Sales.css';

function SalesPanel() {
  const { user, isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [selectedSaleForPayments, setSelectedSaleForPayments] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterModality, setFilterModality] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');

  const coursesList = getCourses();

  // Generate list of available months for the filter
  const availableMonths = React.useMemo(() => {
    const months = new Set();
    sales.forEach(s => {
      if (s.date) {
        months.add(s.date.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(months).sort().reverse();
  }, [sales]);

  const loadSales = useCallback(() => {
    let allSales = getSales();
    if (!isAdmin()) {
      allSales = allSales.filter(s => s.sellerId === user.id);
    }
    setSales([...allSales]);
  }, [user, isAdmin]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const handleSaleAdded = () => {
    loadSales();
    setShowForm(false);
  };

  const filteredSales = sales.filter(sale => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = sale.clientName.toLowerCase().includes(term) ||
                         sale.clientDni.includes(term) ||
                         (sale.clientPhone && sale.clientPhone.includes(term)) ||
                         (sale.clientEmail && sale.clientEmail.toLowerCase().includes(term));
    const matchesStatus = filterStatus === 'all' || sale.status === filterStatus;
    const matchesCourse = filterCourse === 'all' || sale.courseId === filterCourse;
    const matchesModality = filterModality === 'all' || sale.modality === filterModality;
    const matchesMonth = filterMonth === 'all' || (sale.date && sale.date.startsWith(filterMonth));
    const matchesAccount = filterAccount === 'all' || (sale.payments && sale.payments.some(p => p.account === filterAccount));
    
    return matchesSearch && matchesStatus && matchesCourse && matchesModality && matchesMonth && matchesAccount;
  });

  const getStatusLabel = (status) => {
    switch(status) {
      case 'pagado': return 'Pagado';
      case 'parcial': return 'Parcial';
      case 'pendiente': return 'Pendiente';
      default: return status;
    }
  };

  return (
    <div className="sales-panel">
      <div className="panel-toolbar">
        <div className="toolbar-left">
          <div className="search-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar cliente o DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="pagado">Pagado</option>
              <option value="parcial">Parcial</option>
              <option value="pendiente">Pendiente</option>
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

            <select
              className="filter-select"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="all">Todos los meses</option>
              {availableMonths.map(monthStr => {
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
              <option value="BCP">BCP</option>
              <option value="BBVA">BBVA</option>
              <option value="Interbank">Interbank</option>
              <option value="Yape">Yape</option>
              <option value="Plin">Plin</option>
              <option value="Efectivo">Efectivo</option>
            </select>
          </div>

          <ElectricBorder borderRadius={8} color="#ffba0d" speed={2} className="nueva-venta-border">
            <button className="btn-primary" onClick={() => { setEditingSale(null); setShowForm(true); }} style={{ whiteSpace: 'nowrap' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nueva Venta
            </button>
          </ElectricBorder>
      </div>

      <div className="sales-table-wrapper">
        <table className="sales-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>DNI</th>
              <th>Curso</th>
              <th>Modalidad</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Deuda</th>
              <th>Estado</th>
              {isAdmin() && <th>Asesor</th>}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((sale, index) => (
              <tr key={sale.id} style={{ animationDelay: `${index * 0.03}s` }}>
                <td className="td-date">
                  {new Date(sale.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                </td>
                <td>
                  <div className="td-client">
                    <span className="client-name">{sale.clientName}</span>
                    <span className="client-email">{sale.clientEmail}</span>
                  </div>
                </td>
                <td className="td-mono">{sale.clientDni}</td>
                <td>
                  <span className="course-tag" style={{ 
                    background: `${coursesList.find(c => c.id === sale.courseId)?.color || '#666'}20`,
                    color: coursesList.find(c => c.id === sale.courseId)?.color || '#666'
                  }}>
                    {sale.courseName}
                  </span>
                </td>
                <td>
                  <span className={`modality-badge modality-${sale.modality || 'semipresencial'}`}>
                    {sale.modality === 'virtual' ? '💻 Virtual' : '🏫 Semipresencial'}
                  </span>
                </td>
                <td className="td-amount">S/ {sale.totalAmount}</td>
                <td className="td-amount td-paid">S/ {sale.paidAmount}</td>
                <td className="td-amount td-debt">
                  {sale.totalAmount - sale.paidAmount > 0 ? `S/ ${sale.totalAmount - sale.paidAmount}` : '-'}
                </td>
                <td>
                  <span className={`status-badge status-${sale.status}`}>
                    {getStatusLabel(sale.status)}
                  </span>
                </td>
                {isAdmin() && <td className="td-seller">{sale.sellerName}</td>}
                <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    onClick={() => {
                      setEditingSale(sale);
                      setShowForm(true);
                    }}
                    title="Editar Venta"
                  >
                    Editar
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    onClick={() => setSelectedSaleForPayments(sale)}
                    title="Ver Historial de Pagos"
                  >
                    Pagos
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSales.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p>No se encontraron ventas</p>
            <span>Intenta con otros filtros o registra una nueva venta</span>
          </div>
        )}
      </div>

      <GlareHover className="sales-summary-glare" width="100%" height="auto" borderRadius="12px">
        <div className="sales-summary" style={{ width: '100%' }}>
          <span><CountUp from={0} to={filteredSales.length} duration={1} /> ventas encontradas</span>
          <span>Total: <strong>S/ <CountUp from={0} to={filteredSales.reduce((sum, s) => sum + s.totalAmount, 0)} duration={1.5} separator="," /></strong></span>
        </div>
      </GlareHover>

      {showForm && (
        <SalesForm 
          saleToEdit={editingSale}
          onClose={() => {
            setShowForm(false);
            setEditingSale(null);
          }} 
          onSave={() => {
            handleSaleAdded();
            setEditingSale(null);
          }} 
        />
      )}
      
      {selectedSaleForPayments && (
        <PaymentHistoryModal
          sale={selectedSaleForPayments}
          onClose={() => setSelectedSaleForPayments(null)}
          onSave={loadSales}
        />
      )}
    </div>
  );
}

export default SalesPanel;
