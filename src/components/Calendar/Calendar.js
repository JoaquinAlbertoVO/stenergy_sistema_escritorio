import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getCalendarData, addCalendarEntry, updateCalendarEntry, deleteCalendarEntry, getCourses } from '../../utils/storage';
import './Calendar.css';

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarEntries, setCalendarEntries] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ courseId: '', startDate: '', endDate: '', daysOfWeek: [] });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ entryId: '', dateStr: '', modality: 'Online', schedule: '', content: '' });

  const coursesList = getCourses();

  const loadCalendar = useCallback(() => {
    setCalendarEntries(getCalendarData());
  }, []);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const formatDate = (y, m, d) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const getCoursesForDate = (dateStr) => {
    return calendarEntries.filter(entry => {
      if (entry.selectedDates && entry.selectedDates.length > 0) {
        return entry.selectedDates.includes(dateStr);
      }
      return dateStr >= entry.startDate && dateStr <= entry.endDate;
    });
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const handleDayClick = (day) => {
    const dateStr = formatDate(year, month, day);
    const coursesOnDay = getCoursesForDate(dateStr);
    if (coursesOnDay.length >= 3) return;
    
    // Default selected day of week based on clicked date
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();

    setNewEntry({ courseId: '', startDate: dateStr, endDate: dateStr, daysOfWeek: [dayOfWeek] });
    setShowAddModal(true);
  };

  const toggleDayOfWeek = (dayId) => {
    setNewEntry(prev => {
      const days = [...prev.daysOfWeek];
      if (days.includes(dayId)) {
        return { ...prev, daysOfWeek: days.filter(d => d !== dayId) };
      } else {
        return { ...prev, daysOfWeek: [...days, dayId] };
      }
    });
  };

  const handleAddEntry = () => {
    if (!newEntry.courseId || !newEntry.startDate || !newEntry.endDate) return;
    if (newEntry.startDate > newEntry.endDate) return;
    if (newEntry.daysOfWeek.length === 0) {
      alert("Debes seleccionar al menos un día de la semana.");
      return;
    }

    const course = coursesList.find(c => c.id === newEntry.courseId);
    if (!course) return;

    // Calculate selectedDates
    const selectedDates = [];
    let current = new Date(newEntry.startDate + 'T00:00:00');
    const end = new Date(newEntry.endDate + 'T00:00:00');
    
    while (current <= end) {
      if (newEntry.daysOfWeek.includes(current.getDay())) {
        selectedDates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }

    if (selectedDates.length === 0) {
      alert("No hay fechas que coincidan con los días seleccionados en este rango.");
      return;
    }

    // Check max 3 per day for each selected date
    for (const dateStr of selectedDates) {
      const existing = getCoursesForDate(dateStr);
      if (existing.length >= 3) {
        alert(`El día ${dateStr} ya tiene 3 cursos asignados. Máximo permitido: 3 cursos por día.`);
        return;
      }
    }

    addCalendarEntry({
      courseId: course.id,
      courseName: course.name,
      startDate: newEntry.startDate,
      endDate: newEntry.endDate,
      selectedDates: selectedDates,
      color: course.color,
      dailyDetails: {}
    });

    loadCalendar();
    setShowAddModal(false);
    setNewEntry({ courseId: '', startDate: '', endDate: '', daysOfWeek: [] });
  };

  const handleDeleteEntry = (entryId, e) => {
    e.stopPropagation();
    deleteCalendarEntry(entryId);
    loadCalendar();
  };

  const handleEditClick = (entry, dateStr, e) => {
    e.stopPropagation();
    const details = entry.dailyDetails?.[dateStr] || { modality: 'Online', schedule: '', content: '' };
    setEditData({ entryId: entry.id, dateStr, ...details });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    const entry = calendarEntries.find(e => e.id === editData.entryId);
    if (!entry) return;

    const updatedDetails = {
      ...(entry.dailyDetails || {}),
      [editData.dateStr]: {
        modality: editData.modality,
        schedule: editData.schedule,
        content: editData.content
      }
    };

    updateCalendarEntry(entry.id, { dailyDetails: updatedDetails });
    loadCalendar();
    setShowEditModal(false);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const entryId = result.draggableId;
    const destDay = parseInt(result.destination.droppableId.replace('day-', ''));

    const entry = calendarEntries.find(e => e.id === entryId);
    if (!entry) return;

    // Calculate duration in days
    const startD = new Date(entry.startDate);
    const endD = new Date(entry.endDate);
    const durationMs = endD - startD;

    const newStart = new Date(year, month, destDay);
    const newEnd = new Date(newStart.getTime() + durationMs);

    const newStartStr = newStart.toISOString().split('T')[0];
    const newEndStr = newEnd.toISOString().split('T')[0];

    // Validate max 3 per day (excluding the moved entry)
    if (entry.selectedDates) {
      // If it uses specific dates, drag drop shifts all dates by the difference in days
      const daysDiff = Math.floor(durationMs / (1000 * 60 * 60 * 24));
      const shiftedDates = entry.selectedDates.map(ds => {
        const d = new Date(ds + 'T00:00:00');
        d.setDate(d.getDate() + daysDiff);
        return d.toISOString().split('T')[0];
      });

      for (const dateStr of shiftedDates) {
        const existing = calendarEntries.filter(e => e.id !== entryId && (
          (e.selectedDates && e.selectedDates.includes(dateStr)) || 
          (!e.selectedDates && dateStr >= e.startDate && dateStr <= e.endDate)
        ));
        if (existing.length >= 3) {
          alert(`No se puede mover: el día ${dateStr} ya tiene 3 cursos.`);
          return;
        }
      }

      updateCalendarEntry(entryId, {
        startDate: newStartStr,
        endDate: newEndStr,
        selectedDates: shiftedDates
      });

    } else {
      let current = new Date(newStartStr + 'T00:00:00');
      const end2 = new Date(newEndStr + 'T00:00:00');
      while (current <= end2) {
        const dateStr = current.toISOString().split('T')[0];
        const existing = calendarEntries.filter(e => e.id !== entryId && (
          (e.selectedDates && e.selectedDates.includes(dateStr)) || 
          (!e.selectedDates && dateStr >= e.startDate && dateStr <= e.endDate)
        ));
        if (existing.length >= 3) {
          alert(`No se puede mover: el día ${dateStr} ya tiene 3 cursos.`);
          return;
        }
        current.setDate(current.getDate() + 1);
      }

      updateCalendarEntry(entryId, {
        startDate: newStartStr,
        endDate: newEndStr
      });
    }

    loadCalendar();
  };

  // Build calendar grid
  const calendarDays = [];
  // Empty cells before first day
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push({ day: null, key: `empty-${i}` });
  }
  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ day: d, key: `day-${d}` });
  }

  // Unscheduled courses (courses not in any calendar entry)
  const scheduledCourseIds = calendarEntries.map(e => e.courseId);
  const unscheduledCourses = coursesList.filter(c => !scheduledCourseIds.includes(c.id));

  return (
    <div className="calendar-page">
      <div className="calendar-layout">
        <div className="calendar-main">
          <div className="calendar-header">
            <div className="calendar-nav">
              <button className="cal-nav-btn" onClick={prevMonth}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <h2 className="calendar-month-title">
                {monthNames[month]} {year}
              </h2>
              <button className="cal-nav-btn" onClick={nextMonth}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
              <button className="cal-today-btn" onClick={goToToday}>Hoy</button>
            </div>
            <div className="calendar-legend">
              <span className="legend-item">
                <span className="legend-dot" style={{ background: '#00d4aa' }}></span>
                1-2 cursos
              </span>
              <span className="legend-item">
                <span className="legend-dot" style={{ background: '#ff4757' }}></span>
                3 cursos (lleno)
              </span>
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="calendar-grid">
              {dayNames.map(name => (
                <div key={name} className="calendar-day-name">{name}</div>
              ))}

              {calendarDays.map(({ day, key }) => {
                if (!day) {
                  return <div key={key} className="calendar-cell empty"></div>;
                }

                const dateStr = formatDate(year, month, day);
                const courses = getCoursesForDate(dateStr);
                const isFull = courses.length >= 3;
                const today = isToday(day);

                return (
                  <Droppable key={key} droppableId={`day-${day}`}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`calendar-cell ${today ? 'today' : ''} ${isFull ? 'full' : ''} ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                        onClick={() => handleDayClick(day)}
                      >
                        <span className={`cell-day-number ${today ? 'today' : ''}`}>{day}</span>
                        <div className="cell-courses">
                          {courses.map((entry, idx) => (
                            <Draggable key={entry.id} draggableId={entry.id} index={idx}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={`course-block ${dragSnapshot.isDragging ? 'dragging' : ''}`}
                                  style={{
                                    ...dragProvided.draggableProps.style,
                                    background: `${entry.color}25`,
                                    borderLeft: `3px solid ${entry.color}`,
                                    color: entry.color
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="course-block-header">
                                    <span className="course-block-name">
                                      {coursesList.find(c => c.id === entry.courseId)?.shortName || entry.courseName}
                                    </span>
                                    <div className="course-block-actions">
                                      <button
                                        className="course-block-action-btn"
                                        onClick={(e) => handleEditClick(entry, dateStr, e)}
                                        title="Editar detalles del día"
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M12 20h9"></path>
                                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                        </svg>
                                      </button>
                                      <button
                                        className="course-block-action-btn delete"
                                        onClick={(e) => handleDeleteEntry(entry.id, e)}
                                        title="Eliminar todo el curso"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                  {entry.dailyDetails?.[dateStr] && (
                                    <div className="course-block-details">
                                      <div className="cbd-modality">{entry.dailyDetails[dateStr].modality}</div>
                                      {entry.dailyDetails[dateStr].schedule && <div className="cbd-schedule">{entry.dailyDetails[dateStr].schedule}</div>}
                                      {entry.dailyDetails[dateStr].content && <div className="cbd-content">{entry.dailyDetails[dateStr].content}</div>}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                        {!isFull && courses.length > 0 && (
                          <span className="cell-add-hint">+ agregar</span>
                        )}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        </div>

        {/* Sidebar with course list */}
        <div className="calendar-sidebar">
          <h3 className="cal-sidebar-title">Cursos Programados</h3>
          <div className="cal-sidebar-entries">
            {calendarEntries.map(entry => (
              <div key={entry.id} className="cal-entry-card" style={{ borderLeftColor: entry.color }}>
                <div className="cal-entry-name" style={{ color: entry.color }}>
                  {entry.courseName}
                </div>
                <div className="cal-entry-dates">
                  {new Date(entry.startDate + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} → {new Date(entry.endDate + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                </div>
                <button className="cal-entry-delete" onClick={() => { deleteCalendarEntry(entry.id); loadCalendar(); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            ))}
            {calendarEntries.length === 0 && (
              <p className="cal-empty-text">No hay cursos programados. Haz clic en un día para agregar.</p>
            )}
          </div>

          {unscheduledCourses.length > 0 && (
            <>
              <h3 className="cal-sidebar-title" style={{ marginTop: '24px' }}>Cursos Disponibles</h3>
              <div className="cal-available-courses">
                {unscheduledCourses.map(course => (
                  <div key={course.id} className="cal-available-item" style={{ borderLeftColor: course.color }}>
                    <span className="cal-available-icon">{course.icon}</span>
                    <span className="cal-available-name">{course.shortName}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Day Details Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-small">
            <div className="modal-header">
              <h2>Detalles del Día</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Modalidad de la clase</label>
                <select
                  value={editData.modality}
                  onChange={(e) => setEditData(prev => ({ ...prev, modality: e.target.value }))}
                >
                  <option value="Online">Online</option>
                  <option value="Asíncrono">Asíncrono</option>
                  <option value="Práctica presencial">Práctica presencial</option>
                </select>
              </div>
              <div className="form-group">
                <label>Horario</label>
                <input
                  type="text"
                  placeholder="Ej: Teoría Virtual 7 pm - 9 pm"
                  value={editData.schedule}
                  onChange={(e) => setEditData(prev => ({ ...prev, schedule: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Contenido</label>
                <textarea
                  placeholder="Tema de la clase..."
                  rows="3"
                  value={editData.content}
                  onChange={(e) => setEditData(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button className="btn-primary" onClick={handleSaveEdit}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-small">
            <div className="modal-header">
              <h2>Programar Curso</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group form-group-full">
                <label>Curso</label>
                <select 
                  value={newEntry.courseId}
                  onChange={(e) => setNewEntry({...newEntry, courseId: e.target.value})}
                >
                  <option value="">Seleccionar curso...</option>
                  {getCourses().map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Fecha Inicio</label>
                  <input
                    type="date"
                    value={newEntry.startDate}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Fecha Fin</label>
                  <input
                    type="date"
                    value={newEntry.endDate}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label>Días de clase en este rango</label>
                <div className="days-checkbox-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {[{id: 1, label: 'L'}, {id: 2, label: 'M'}, {id: 3, label: 'X'}, {id: 4, label: 'J'}, {id: 5, label: 'V'}, {id: 6, label: 'S'}, {id: 0, label: 'D'}].map(day => (
                    <button
                      key={day.id}
                      type="button"
                      className={`day-toggle-btn ${newEntry.daysOfWeek.includes(day.id) ? 'active' : ''}`}
                      onClick={() => toggleDayOfWeek(day.id)}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        border: '1px solid var(--border-color)', background: newEntry.daysOfWeek.includes(day.id) ? 'var(--color-primary)' : 'var(--bg-card)',
                        color: newEntry.daysOfWeek.includes(day.id) ? '#000' : 'var(--text-secondary)',
                        cursor: 'pointer', fontWeight: 'bold'
                      }}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button className="btn-primary" onClick={handleAddEntry} disabled={!newEntry.courseId}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Programar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
