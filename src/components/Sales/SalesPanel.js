import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSales, getCourses, deleteSale } from '../../utils/storage';
import SalesForm from './SalesForm';
import PaymentHistoryModal from './PaymentHistoryModal';
import CountUp from '../ui/CountUp/CountUp';
import ElectricBorder from '../ui/ElectricBorder/ElectricBorder';
import SpotlightCard from '../ui/SpotlightCard/SpotlightCard';
import * as XLSX from 'xlsx';
import './Sales.css';

const getCountryFlag = (phone) => {
  if (!phone) return '🇵🇪'; // Default a Perú
  const p = phone.replace(/\D/g, ''); // Solo números
  if (p.startsWith('593')) return '🇪🇨'; // Ecuador
  if (p.startsWith('57')) return '🇨🇴'; // Colombia
  if (p.startsWith('56')) return '🇨🇱'; // Chile
  if (p.startsWith('52')) return '🇲🇽'; // Mexico
  if (p.startsWith('591')) return '🇧🇴'; // Bolivia
  if (p.startsWith('54')) return '🇦🇷'; // Argentina
  if (p.startsWith('505')) return '🇳🇮'; // Nicaragua
  if (p.startsWith('502')) return '🇬🇹'; // Guatemala
  if (p.startsWith('503')) return '🇸🇻'; // El Salvador
  if (p.startsWith('507')) return '🇵🇦'; // Panama
  if (p.startsWith('34')) return '🇪🇸'; // España
  if (p.startsWith('39')) return '🇮🇹'; // Italia
  if (p.startsWith('1')) return '🇺🇸'; // USA
  return '🇵🇪'; // Si no coincide, asumimos Perú (+51)
};

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
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredSales.map(sale => ({
      'Fecha': new Date(sale.date).toLocaleDateString('es-PE'),
      'Cliente': sale.clientName,
      'DNI': sale.clientDni,
      'Curso': sale.courseName,
      'Modalidad': sale.modality,
      'Moneda': sale.certificateOverrides?.currency === 'USD' ? 'USD' : 'PEN',
      'Total': sale.totalAmount,
      'Pagado': sale.paidAmount || 0,
      'Estado': sale.status
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
    XLSX.writeFile(workbook, `Reporte_Ventas_${new Date().toLocaleDateString('es-PE').replace(/\//g, '-')}.xlsx`);
  };

  const handleDeleteSale = async (saleId) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta venta permanentemente? Esto afectará los totales financieros del Dashboard.")) {
      try {
        setIsDeleting(true);
        await deleteSale(saleId);
        await loadSales();
        alert("Venta eliminada con éxito.");
      } catch (error) {
        console.error("Error al eliminar la venta:", error);
        alert("Hubo un problema al eliminar la venta.");
      } finally {
        setIsDeleting(false);
      }
    }
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

  // Calculate metrics split by currency
  const metrics = React.useMemo(() => {
    let totalPEN = 0;
    let totalUSD = 0;
    let debtPEN = 0;
    let debtUSD = 0;

    filteredSales.forEach(s => {
      const isUSD = s.certificateOverrides?.currency === 'USD';
      const amount = s.totalAmount || 0;
      const paid = s.paidAmount || 0;
      const debt = Math.max(0, amount - paid);

      if (isUSD) {
        totalUSD += paid;
        debtUSD += debt;
      } else {
        totalPEN += paid;
        debtPEN += debt;
      }
    });

    return { totalPEN, totalUSD, debtPEN, debtUSD };
  }, [filteredSales]);

  return (
    <div className="sales-panel">
      <div className="dashboard-metrics-grid">
        <SpotlightCard className="metric-card" spotlightColor="rgba(255, 186, 13, 0.15)">
          <h3 style={{ color: '#ffba0d' }}>Ventas Encontradas</h3>
          <p className="metric-value"><CountUp from={0} to={filteredSales.length} duration={1} /></p>
        </SpotlightCard>
        <SpotlightCard className="metric-card" spotlightColor="rgba(0, 229, 255, 0.15)">
          <h3 style={{ color: '#00E5FF' }}>Ingresos Totales</h3>
          <p className="metric-value" style={{ fontSize: '1.2rem' }}>
            S/ <CountUp from={0} to={Math.round(metrics.totalPEN)} duration={1.5} separator="," />
            {metrics.totalUSD > 0 && <span> | $ <CountUp from={0} to={Math.round(metrics.totalUSD)} duration={1.5} separator="," /></span>}
          </p>
        </SpotlightCard>
        <SpotlightCard className="metric-card" spotlightColor="rgba(255, 71, 87, 0.15)">
          <h3 style={{ color: '#ff4757' }}>Deuda Pendiente</h3>
          <p className="metric-value" style={{ fontSize: '1.2rem' }}>
            S/ <CountUp from={0} to={Math.round(metrics.debtPEN)} duration={1.5} separator="," />
            {metrics.debtUSD > 0 && <span> | $ <CountUp from={0} to={Math.round(metrics.debtUSD)} duration={1.5} separator="," /></span>}
          </p>
        </SpotlightCard>
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
  
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary btn-export-excel" onClick={handleExportExcel} style={{ whiteSpace: 'nowrap', borderColor: 'rgba(0, 212, 170, 0.4)', color: '#00d4aa' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="8" y1="13" x2="16" y2="13"/>
                  <line x1="8" y1="17" x2="16" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                Excel
              </button>

              <ElectricBorder borderRadius={8} color="#ffba0d" speed={2} className="nueva-venta-border">
                <button className="btn-primary" onClick={() => { setEditingSale(null); setShowForm(true); }} style={{ whiteSpace: 'nowrap' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Nueva Venta
                </button>
              </ElectricBorder>
            </div>
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
                    <span className="client-name">{getCountryFlag(sale.clientPhone)} {sale.clientName}</span>
                    <span className="client-email">{sale.clientEmail}</span>
                  </div>
                </td>
                <td className="td-mono">{sale.clientDni}</td>
                <td>
                  <span className="course-tag" style={{ 
                    background: `${coursesList.find(c => c.id === sale.courseId)?.color || '#666'}20`,
                    color: coursesList.find(c => c.id === sale.courseId)?.color || '#666'
                  }}>
                    {coursesList.find(c => c.id === sale.courseId)?.shortName || sale.courseName}
                  </span>
                </td>
                <td>
                  <span className={`modality-badge modality-${sale.modality || 'semipresencial'}`}>
                    {sale.modality === 'virtual' ? '💻 Virtual' : '🏫 Semipresencial'}
                  </span>
                </td>
                <td className="td-amount">{sale.certificateOverrides?.currency === 'USD' ? '$' : 'S/'} {sale.totalAmount}</td>
                <td className="td-amount td-paid">{sale.certificateOverrides?.currency === 'USD' ? '$' : 'S/'} {sale.paidAmount}</td>
                <td className="td-amount td-debt">
                  {sale.totalAmount - sale.paidAmount > 0 ? `${sale.certificateOverrides?.currency === 'USD' ? '$' : 'S/'} ${sale.totalAmount - sale.paidAmount}` : '-'}
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
                    disabled={isDeleting}
                    title="Editar Venta"
                  >
                    Editar
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    onClick={() => setSelectedSaleForPayments(sale)}
                    disabled={isDeleting}
                    title="Ver Historial de Pagos"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'rgba(255, 71, 87, 0.4)', color: '#ff4757' }}
                    onClick={() => handleDeleteSale(sale.id)}
                    disabled={isDeleting}
                    title="Eliminar Venta"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
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
