import React, { useState, useEffect } from 'react';
import { getCourses, deleteCourse } from '../../utils/storage';
import CourseFormModal from './CourseFormModal';
import './Courses.css';

function CoursesPanel() {
  const [courses, setCourses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

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

      <div className="courses-grid">
        {courses.map(course => (
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
