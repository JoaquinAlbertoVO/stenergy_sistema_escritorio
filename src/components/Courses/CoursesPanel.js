import React, { useState, useEffect } from 'react';
import { getCourses, deleteCourse, getCalendarData } from '../../utils/storage';
import CourseFormModal from './CourseFormModal';
import './Courses.css';

function CoursesPanel() {
  const [courses, setCourses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMonths, setExpandedMonths] = useState([]);

  // Auto-expand the most recent month initially
  useEffect(() => {
    if (courses.length > 0 && expandedMonths.length === 0) {
      const grouped = groupCoursesByMonth(courses);
      const keys = Object.keys(grouped).filter(k => k !== 'Otros').sort().reverse();
      if (keys.length > 0) {
        setExpandedMonths([keys[0]]);
      } else {
        setExpandedMonths(['Otros']);
      }
    }
  }, [courses]);

  const getCourseMonth = (course, calendarEntries) => {
    const entry = calendarEntries.find(e => e.courseId === course.id);
    if (entry && entry.startDate) {
      return entry.startDate.substring(0, 7); // YYYY-MM
    }
    
    // Try to extract date from name (DD/MM/YY or DD/MM/YYYY)
    const dateMatch = course.name.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (dateMatch) {
      let year = dateMatch[3];
      if (year.length === 2) year = '20' + year;
      let month = dateMatch[2].padStart(2, '0');
      return `${year}-${month}`;
    }
    
    return 'Otros';
  };

  const formatMonthKey = (monthKey) => {
    if (monthKey === 'Otros') return 'Cursos Generales / Sin Fecha';
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    const label = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const groupCoursesByMonth = (coursesToGroup) => {
    const calendarEntries = getCalendarData();
    const grouped = {};
    coursesToGroup.forEach(c => {
      const monthKey = getCourseMonth(c, calendarEntries);
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(c);
    });
    return grouped;
  };

  const toggleMonth = (month) => {
    if (expandedMonths.includes(month)) {
      setExpandedMonths(expandedMonths.filter(m => m !== month));
    } else {
      setExpandedMonths([...expandedMonths, month]);
    }
  };

  const loadCourses = () => {
    setCourses(getCourses());
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleEdit = (course) => {
    setEditingCourse(course);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingCourse(null);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este curso? Esto no eliminará las ventas ni certificados ya generados con él, pero ya no aparecerá en el listado para crear nuevas ventas.')) {
      deleteCourse(id);
      loadCourses();
    }
  };

  return (
    <div className="courses-panel">
      <div className="panel-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Gestión de Cursos</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Crea o edita los cursos y configura su información para los certificados.
          </p>
        </div>
        <button className="btn-primary" onClick={handleAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ marginRight: '8px' }}>
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo Curso
        </button>
      </div>

      <div className="search-container" style={{ marginBottom: '24px', position: 'relative', maxWidth: '400px' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          type="text" 
          className="form-input" 
          placeholder="Buscar curso por nombre o sigla..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', paddingLeft: '38px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
        />
      </div>

      <div className="courses-accordion">
        {(() => {
          const filteredCourses = courses.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.shortName.toLowerCase().includes(searchTerm.toLowerCase()));
          const groupedCourses = groupCoursesByMonth(filteredCourses);
          const sortedMonthKeys = Object.keys(groupedCourses).sort((a, b) => {
            if (a === 'Otros') return 1;
            if (b === 'Otros') return -1;
            return b.localeCompare(a); // descending
          });

          if (sortedMonthKeys.length === 0) {
            return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No se encontraron cursos que coincidan con la búsqueda.</div>;
          }

          return sortedMonthKeys.map(monthKey => {
            const isExpanded = expandedMonths.includes(monthKey);
            const monthCourses = groupedCourses[monthKey];

            return (
              <div key={monthKey} className="accordion-section" style={{ marginBottom: '16px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div 
                  className="accordion-header" 
                  onClick={() => toggleMonth(monthKey)}
                  style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.02)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      width="16" 
                      height="16"
                      style={{ 
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', 
                        transition: 'transform 0.2s ease',
                        color: 'var(--text-muted)'
                      }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatMonthKey(monthKey)}
                    </h3>
                    <span style={{ background: 'var(--primary-color)', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                      {monthCourses.length}
                    </span>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="accordion-content" style={{ padding: '20px', borderTop: '1px solid var(--border-color)' }}>
                    <div className="courses-grid">
                      {monthCourses.map(course => (
                        <div key={course.id} className="course-card">
                          <div className="course-card-header">
                            <div className="course-icon" style={{ color: course.color }}>
                              {course.icon}
                            </div>
                            <div className="course-titles">
                              <h3 className="course-name">{course.name}</h3>
                              <div className="course-short-name" style={{ color: course.color }}>{course.shortName}</div>
                            </div>
                          </div>

                          <div className="course-price">
                            S/ {course.price}
                          </div>

                          <div className="course-details">
                            <div className="course-detail-row">
                              <span className="course-detail-label">Horas Académicas</span>
                              <span className="course-detail-value">{course.academicHours || '120 horas académicas'}</span>
                            </div>
                            <div className="course-detail-row">
                              <span className="course-detail-label">Descripción del Certificado</span>
                              <span className="course-detail-value">
                                {course.descriptionText || 'Por haber participado en el curso...'}
                              </span>
                            </div>
                          </div>

                          <div className="course-actions">
                            <button className="btn-secondary" onClick={() => handleEdit(course)}>
                              Editar
                            </button>
                            <button 
                              className="btn-secondary" 
                              onClick={() => handleDelete(course.id)}
                              style={{ color: 'var(--color-danger)', borderColor: 'rgba(255, 71, 87, 0.2)', background: 'rgba(255, 71, 87, 0.05)' }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>

      {showForm && (
        <CourseFormModal
          courseToEdit={editingCourse}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            loadCourses();
          }}
        />
      )}
    </div>
  );
}

export default CoursesPanel;
