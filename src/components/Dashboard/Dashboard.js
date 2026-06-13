import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSales, getCourses } from '../../utils/storage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import './Dashboard.css';

function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [animatedValues, setAnimatedValues] = useState({});
  const [allSalesData, setAllSalesData] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  
  // Filters state
  const [dateFilter, setDateFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [filteredSales, setFilteredSales] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const allSales = await getSales();
      const courses = await getCourses();
      setCoursesList(courses);
      const userSales = isAdmin() ? allSales : allSales.filter(s => s.sellerId === user.id);
      setAllSalesData(userSales);
    };
    loadData();
  }, [user, isAdmin]);

  useEffect(() => {
    if (allSalesData.length === 0) {
      setStats({
        totalSales: 0, totalRevenue: 0, totalDebt: 0, pendingCertificates: 0,
        paidSales: 0, partialSales: 0, pendingSales: 0
      });
      setFilteredSales([]);
      setRecentSales([]);
      return;
    }

    let filtered = [...allSalesData];

    // 1. Filter by Date
    if (dateFilter !== 'all') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      filtered = filtered.filter(s => {
        const d = new Date(s.date);
        if (dateFilter === 'thisMonth') {
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        } else if (dateFilter === 'lastMonth') {
          let prevMonth = currentMonth - 1;
          let prevYear = currentYear;
          if (prevMonth < 0) {
            prevMonth = 11;
            prevYear -= 1;
          }
          return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        }
        return true;
      });
    }

    // 2. Filter by Course
    if (courseFilter !== 'all') {
      filtered = filtered.filter(s => s.courseId === courseFilter);
    }

    // 3. Filter by Seller
    if (isAdmin() && sellerFilter !== 'all') {
      filtered = filtered.filter(s => s.sellerId === sellerFilter || s.sellerName === sellerFilter);
    }

    setFilteredSales(filtered);
    setRecentSales(filtered.slice(-5).reverse());

    const tSales = filtered.length;
    const tRevenue = filtered.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const tDebt = filtered.reduce((sum, s) => sum + Math.max(0, (s.totalAmount || 0) - (s.paidAmount || 0)), 0);
    const pCertificates = filtered.filter(s => s.status === 'pagado' && !s.certificateGenerated).length;
    
    setStats({
      totalSales: tSales,
      totalRevenue: tRevenue,
      totalDebt: tDebt,
      pendingCertificates: pCertificates,
      paidSales: filtered.filter(s => s.status === 'pagado').length,
      partialSales: filtered.filter(s => s.status === 'parcial').length,
      pendingSales: filtered.filter(s => s.status === 'pendiente').length
    });

    // Animate numbers
    const targets = {
      totalSales: tSales,
      totalRevenue: tRevenue,
      totalDebt: tDebt,
      pendingCertificates: pCertificates
    };

    const duration = 1200;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = {};
      Object.keys(targets).forEach(key => {
        current[key] = Math.round(targets[key] * eased);
      });
      setAnimatedValues(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [allSalesData, dateFilter, courseFilter, sellerFilter, isAdmin]);

  if (!stats) return null;

  const kpiCards = [
    {
      title: 'Total Ventas',
      value: animatedValues.totalSales || 0,
      suffix: '',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
      ),
      color: '#ffba0d',
      bgColor: 'rgba(255,186,13,0.1)'
    },
    {
      title: 'Ingresos',
      value: animatedValues.totalRevenue || 0,
      prefix: 'S/ ',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
      color: '#00d4aa',
      bgColor: 'rgba(0,212,170,0.1)'
    },
    {
      title: 'Deuda Total',
      value: animatedValues.totalDebt || 0,
      prefix: 'S/ ',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      color: '#ff4757',
      bgColor: 'rgba(255,71,87,0.1)'
    },
    {
      title: 'Certificados Pendientes',
      value: animatedValues.pendingCertificates || 0,
      suffix: '',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      ),
      color: '#7c5cfc',
      bgColor: 'rgba(124,92,252,0.1)'
    }
  ];

  const getStatusLabel = (status) => {
    switch(status) {
      case 'pagado': return 'Pagado';
      case 'parcial': return 'Parcial';
      case 'pendiente': return 'Pendiente';
      default: return status;
    }
  };

  // Get unique sellers for the filter dropdown
  const uniqueSellers = Array.from(new Set(allSalesData.map(s => s.sellerName || s.sellerId))).filter(Boolean);

  // Sales by seller
  const sellerStats = {};
  filteredSales.forEach(sale => {
    if (!sellerStats[sale.sellerName]) {
      sellerStats[sale.sellerName] = { count: 0, revenue: 0 };
    }
    sellerStats[sale.sellerName].count += 1;
    sellerStats[sale.sellerName].revenue += sale.paidAmount;
  });

  const maxSellerCount = Math.max(...Object.values(sellerStats).map(s => s.count), 1);

  // Prepare LineChart data (Revenue over time)
  const salesByDate = {};
  filteredSales.forEach(sale => {
    const dateStr = sale.date; // YYYY-MM-DD
    if (!salesByDate[dateStr]) {
      salesByDate[dateStr] = 0;
    }
    salesByDate[dateStr] += sale.paidAmount; // Only paid amounts
  });
  
  const lineData = Object.keys(salesByDate)
    .sort()
    .slice(-14) // last 14 active days
    .map(date => ({
      fecha: date.substring(5).replace('-', '/'),
      ingresos: salesByDate[date]
    }));

  // Prepare PieChart data (Sales by Course)
  const salesByCourse = {};
  filteredSales.forEach(sale => {
    const cName = sale.courseName || 'Sin Asignar';
    if (!salesByCourse[cName]) {
      salesByCourse[cName] = 0;
    }
    salesByCourse[cName] += sale.paidAmount;
  });
  
  const pieData = Object.keys(salesByCourse).map(name => ({
    name: name,
    value: salesByCourse[name]
  })).sort((a,b) => b.value - a.value).slice(0, 5); // top 5 courses

  const PIE_COLORS = ['#00d4aa', '#ffba0d', '#7c5cfc', '#ff4757', '#1e90ff'];

  return (
    <div className="dashboard">
      <div className="dashboard-welcome">
        <div className="welcome-text">
          <h2>
            Ala pe CAUSAYIN <span className="welcome-name">{user?.name}</span>
          </h2>
          <p>Aquí tienes el resumen de {isAdmin() ? 'todo el sistema' : 'tus ventas'}</p>
        </div>
      </div>

      <div className="dashboard-toolbar">
        <div className="toolbar-filters">
          <select 
            className="filter-select" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">Todos los Tiempos</option>
            <option value="thisMonth">Este Mes</option>
            <option value="lastMonth">Mes Pasado</option>
          </select>

          <select 
            className="filter-select" 
            value={courseFilter} 
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="all">Todos los Cursos</option>
            {coursesList.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {isAdmin() && (
            <select 
              className="filter-select" 
              value={sellerFilter} 
              onChange={(e) => setSellerFilter(e.target.value)}
            >
              <option value="all">Todos los Asesores</option>
              {uniqueSellers.map(seller => (
                <option key={seller} value={seller}>{seller}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="kpi-grid">
        {kpiCards.map((card, index) => (
          <div
            key={card.title}
            className="kpi-card"
            style={{
              '--card-color': card.color,
              '--card-bg': card.bgColor,
              animationDelay: `${index * 0.1}s`
            }}
          >
            <div className="kpi-icon" style={{ background: card.bgColor, color: card.color }}>
              {card.icon}
            </div>
            <div className="kpi-content">
              <span className="kpi-title">{card.title}</span>
              <span className="kpi-value" style={{ color: card.color }}>
                {card.prefix || ''}{card.value.toLocaleString()}{card.suffix || ''}
              </span>
            </div>
            <div className="kpi-glow" style={{ background: card.color }}></div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="dashboard-card" style={{ gridColumn: '1 / -1', '@media (min-width: 1024px)': { gridColumn: 'span 2' } }}>
          <div className="card-header">
            <h3>Evolución de Ingresos (Últimos días activos)</h3>
          </div>
          <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
            {lineData.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={lineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="fecha" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(value) => `S/ ${value}`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#00d4aa' }}
                    formatter={(value) => [`S/ ${value}`, 'Ingresos']}
                  />
                  <Line type="monotone" dataKey="ingresos" stroke="#00d4aa" strokeWidth={3} dot={{ r: 4, fill: '#00d4aa', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state-mini" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>No hay datos suficientes</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>Top Ingresos por Curso</h3>
          </div>
          <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px', color: '#fff' }}
                    formatter={(value) => `S/ ${value}`}
                  />
                  <Legend verticalAlign="bottom" height={70} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state-mini" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>No hay datos suficientes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card recent-sales-card">
          <div className="card-header">
            <h3>Ventas Recientes</h3>
            <span className="card-badge">{recentSales.length} últimas</span>
          </div>
          <div className="recent-sales-list">
            {recentSales.map((sale, index) => (
              <div key={sale.id} className="recent-sale-item" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="sale-client-info">
                  <span className="sale-client-name">{sale.clientName}</span>
                  <span className="sale-course-name">{sale.courseName}</span>
                </div>
                <div className="sale-amount-info">
                  <span className="sale-amount">S/ {sale.totalAmount}</span>
                  <span className={`sale-status-badge status-${sale.status}`}>
                    {getStatusLabel(sale.status)}
                  </span>
                </div>
              </div>
            ))}
            {recentSales.length === 0 && (
              <div className="empty-state-mini">
                <p>No hay ventas registradas</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card stats-card">
          <div className="card-header">
            <h3>Estado de Ventas</h3>
          </div>
          <div className="status-breakdown">
            <div className="status-row">
              <div className="status-label">
                <span className="status-dot" style={{ background: '#00d4aa' }}></span>
                Pagadas
              </div>
              <div className="status-bar-wrapper">
                <div
                  className="status-bar"
                  style={{
                    width: `${stats.totalSales ? (stats.paidSales / stats.totalSales * 100) : 0}%`,
                    background: '#00d4aa'
                  }}
                ></div>
              </div>
              <span className="status-count">{stats.paidSales}</span>
            </div>
            <div className="status-row">
              <div className="status-label">
                <span className="status-dot" style={{ background: '#ffba0d' }}></span>
                Parciales
              </div>
              <div className="status-bar-wrapper">
                <div
                  className="status-bar"
                  style={{
                    width: `${stats.totalSales ? (stats.partialSales / stats.totalSales * 100) : 0}%`,
                    background: '#ffba0d'
                  }}
                ></div>
              </div>
              <span className="status-count">{stats.partialSales}</span>
            </div>
            <div className="status-row">
              <div className="status-label">
                <span className="status-dot" style={{ background: '#ff4757' }}></span>
                Pendientes
              </div>
              <div className="status-bar-wrapper">
                <div
                  className="status-bar"
                  style={{
                    width: `${stats.totalSales ? (stats.pendingSales / stats.totalSales * 100) : 0}%`,
                    background: '#ff4757'
                  }}
                ></div>
              </div>
              <span className="status-count">{stats.pendingSales}</span>
            </div>
          </div>

          {isAdmin() && (
            <>
              <div className="card-divider"></div>
              <div className="card-header">
                <h3>Ventas por Asesor</h3>
              </div>
              <div className="seller-breakdown">
                {Object.entries(sellerStats).map(([name, data]) => (
                  <div key={name} className="seller-row">
                    <div className="seller-info">
                      <span className="seller-name">{name}</span>
                      <span className="seller-revenue">S/ {data.revenue.toLocaleString()}</span>
                    </div>
                    <div className="seller-bar-wrapper">
                      <div
                        className="seller-bar"
                        style={{ width: `${(data.count / maxSellerCount) * 100}%` }}
                      ></div>
                    </div>
                    <span className="seller-count">{data.count} ventas</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
