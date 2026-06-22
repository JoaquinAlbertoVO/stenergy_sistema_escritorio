import React, { useState, useEffect } from 'react';
import { getSales, getCourses } from '../../utils/storage';
import CertificateEditModal from './CertificateEditModal';
import './Certificates.css';

function CertificatesPanel() {
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterModality, setFilterModality] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  
  const [selectedSale, setSelectedSale] = useState(null);

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

  const loadData = () => {
    // Para certificados, típicamente mostramos todas las ventas, o podríamos filtrar solo las pagadas
    // Según requerimiento, mostramos todas para poder ver quién tiene pendiente.
    const allSales = getSales().sort((a, b) => new Date(b.date) - new Date(a.date));
    setSales(allSales);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSales = sales.filter(sale => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = sale.clientName.toLowerCase().includes(term) || 
                          sale.clientDni.includes(term) ||
                          (sale.clientPhone && sale.clientPhone.includes(term)) ||
                          (sale.clientEmail && sale.clientEmail.toLowerCase().includes(term));
    const matchesCourse = filterCourse === 'all' || sale.courseId === filterCourse;
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'generado' && sale.certificateGenerated) ||
                          (filterStatus === 'pendiente' && !sale.certificateGenerated);
    const matchesModality = filterModality === 'all' || sale.modality === filterModality;
    const matchesMonth = filterMonth === 'all' || (sale.date && sale.date.startsWith(filterMonth));
                          
    return matchesSearch && matchesCourse && matchesStatus && matchesModality && matchesMonth;
  });

  return (
    <div className="certificates-panel">
      <div className="panel-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Gestión de Certificados</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Revisa, edita y genera los certificados de los alumnos inscritos.
          </p>
        </div>
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
              placeholder="Buscar por alumno o DNI..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

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
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Cualquier estado</option>
            <option value="generado">Generados</option>
            <option value="pendiente">Pendientes</option>
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
        </div>
      </div>

      <div className="certificates-table-wrapper">
        <table className="certificates-table">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>DNI</th>
              <th>Curso</th>
              <th>Pago</th>
              <th>Certificado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((sale, index) => (
              <tr key={sale.id} style={{ animationDelay: `${index * 0.03}s` }}>
                <td>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{sale.clientName}</span>
                </td>
                <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{sale.clientDni}</td>
                <td>
                  <span className="course-tag" style={{ 
                    background: `${coursesList.find(c => c.id === sale.courseId)?.color || '#666'}20`,
                    color: coursesList.find(c => c.id === sale.courseId)?.color || '#666'
                  }}>
                    {sale.courseName}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-${sale.status}`}>
                    {sale.status === 'pagado' ? 'Pagado' : sale.status === 'parcial' ? 'Parcial' : 'Pendiente'}
                  </span>
                </td>
                <td>
                  {sale.certificateGenerated ? (
                    <span className="cert-badge-status cert-badge-generated">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      Generado
                    </span>
                  ) : (
                    <span className="cert-badge-status cert-badge-pending">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      Pendiente
                    </span>
                  )}
                </td>
                <td>
                  <button className="cert-edit-btn" onClick={() => setSelectedSale(sale)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Revisar / Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSales.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <p>No se encontraron registros</p>
          </div>
        )}
      </div>

      {selectedSale && (
        <CertificateEditModal 
          sale={selectedSale} 
          onClose={() => setSelectedSale(null)} 
          onSave={loadData}
        />
      )}
    </div>
  );
}

export default CertificatesPanel;
