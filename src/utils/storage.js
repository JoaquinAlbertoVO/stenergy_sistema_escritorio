// ============================================
// storage.js — API Backend (ya no usa localStorage para datos)
// ============================================
// La autenticación (sesión del usuario) sigue en localStorage.
// Los datos (ventas, cursos, calendario) ahora van al backend API.

const API_URL = process.env.REACT_APP_CERT_API_URL || 'http://localhost:8000';

// ============================================
// Helper para peticiones HTTP
// ============================================
async function apiFetch(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// ============================================
// Cache local para reducir llamadas repetidas
// ============================================
let _salesCache = null;
let _coursesCache = null;
let _calendarCache = null;

export async function preloadData() {
  try {
    _salesCache = await apiFetch('/api/sales').catch(() => []);
    _coursesCache = await apiFetch('/api/courses').catch(() => []);
    _calendarCache = await apiFetch('/api/calendar').catch(() => []);
  } catch (e) {
    console.error("Error preloading data", e);
  }
}

export async function invalidateCache(type) {
  if (!type || type === 'sales') _salesCache = await apiFetch('/api/sales').catch(() => []);
  if (!type || type === 'courses') _coursesCache = await apiFetch('/api/courses').catch(() => []);
  if (!type || type === 'calendar') _calendarCache = await apiFetch('/api/calendar').catch(() => []);
}

// ============================================
// Sales
// ============================================
export function getSales() {
  return _salesCache || [];
}

export async function addSale(sale) {
  sale.id = 's' + Date.now();
  // Preparar payments con ids
  if (sale.payments) {
    sale.payments = sale.payments.map((p, i) => ({
      ...p,
      id: `pay_${sale.id}_${i}`,
      saleId: sale.id,
    }));
  }
  const result = await apiFetch('/api/sales', {
    method: 'POST',
    body: JSON.stringify(sale),
  });
  await invalidateCache('sales');
  return result;
}

export async function updateSale(id, updates) {
  // Si updates tiene payments, necesitamos agregar ids y saleId
  if (updates.payments) {
    updates.payments = updates.payments.map((p, i) => ({
      ...p,
      id: p.id || `pay_${id}_${Date.now()}_${i}`,
      saleId: id,
    }));
  }
  const result = await apiFetch(`/api/sales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  await invalidateCache('sales');
  return result;
}

export async function deleteSale(id) {
  await apiFetch(`/api/sales/${id}`, { method: 'DELETE' });
  await invalidateCache('sales');
}

// ============================================
// Courses
// ============================================
export function getCourses() {
  return _coursesCache || [];
}

export async function addCourse(course) {
  course.id = 'c' + Date.now();
  const result = await apiFetch('/api/courses', {
    method: 'POST',
    body: JSON.stringify(course),
  });
  await invalidateCache('courses');
  return result;
}

export async function updateCourse(id, updates) {
  const result = await apiFetch(`/api/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  await invalidateCache('courses');
  return result;
}

export async function deleteCourse(id) {
  await apiFetch(`/api/courses/${id}`, { method: 'DELETE' });
  await invalidateCache('courses');
}

// ============================================
// Calendar
// ============================================
export function getCalendarData() {
  return _calendarCache || [];
}

export async function addCalendarEntry(entry) {
  entry.id = 'cal' + Date.now();
  const result = await apiFetch('/api/calendar', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
  await invalidateCache('calendar');
  return result;
}

export async function updateCalendarEntry(id, updates) {
  const result = await apiFetch(`/api/calendar/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  await invalidateCache('calendar');
  return result;
}

export async function deleteCalendarEntry(id) {
  await apiFetch(`/api/calendar/${id}`, { method: 'DELETE' });
  await invalidateCache('calendar');
}

// ============================================
// Auth (sigue en localStorage — es local por naturaleza)
// ============================================
const KEYS = {
  CURRENT_USER: 'st_energy_current_user',
};

export function getUsers() {
  // Users ahora también vienen del backend, pero mantenemos compatibilidad
  return apiFetch('/api/users');
}

export function authenticateUser(username, password) {
  return apiFetch('/api/auth', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function setCurrentUser(user) {
  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
}

export function getCurrentUser() {
  const data = localStorage.getItem(KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
}

export function clearCurrentUser() {
  localStorage.removeItem(KEYS.CURRENT_USER);
}

// ============================================
// Stats (calculada a partir de datos de la API)
// ============================================
export function getSalesStats(userId = null) {
  let sales = getSales();
  if (userId) {
    sales = sales.filter(s => s.sellerId === userId);
  }

  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalDebt = sales.reduce((sum, s) => sum + (s.totalAmount - s.paidAmount), 0);
  const pendingCertificates = sales.filter(s => s.status === 'pagado' && !s.certificateGenerated).length;
  const paidSales = sales.filter(s => s.status === 'pagado').length;
  const partialSales = sales.filter(s => s.status === 'parcial').length;
  const pendingSales = sales.filter(s => s.status === 'pendiente').length;

  return {
    totalSales,
    totalRevenue,
    totalDebt,
    pendingCertificates,
    paidSales,
    partialSales,
    pendingSales
  };
}

// ============================================
// Helper: Count courses on date (for Calendar)
// ============================================
export function getCoursesOnDate(dateStr) {
  const calendar = getCalendarData();
  return calendar.filter(entry => {
    return dateStr >= entry.startDate && dateStr <= entry.endDate;
  });
}

// ============================================
// Initialize — ya no necesita cargar datos demo
// ============================================
export function initializeData() {
  // No-op: los datos están en el backend
  // La autenticación se maneja por separado
}

// ============================================
// Migration helper — migrar datos de localStorage al backend
// ============================================
export async function migrateLocalStorageToBackend() {
  const localSales = localStorage.getItem('st_energy_sales');
  const localCourses = localStorage.getItem('st_energy_courses');
  const localCalendar = localStorage.getItem('st_energy_calendar');
  const localUsers = localStorage.getItem('st_energy_users');

  if (!localSales && !localCourses && !localCalendar) {
    return { migrated: false, message: 'No hay datos locales para migrar' };
  }

  const data = {
    sales: localSales ? JSON.parse(localSales) : [],
    courses: localCourses ? JSON.parse(localCourses) : [],
    calendar: localCalendar ? JSON.parse(localCalendar) : [],
    users: localUsers ? JSON.parse(localUsers) : [],
  };

  try {
    const result = await apiFetch('/api/migrate', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Marcar como migrado para no volver a hacerlo
    localStorage.setItem('st_energy_migrated_to_api', 'true');
    
    return { migrated: true, message: 'Datos migrados exitosamente', result };
  } catch (error) {
    return { migrated: false, message: `Error migrando: ${error.message}` };
  }
}

export function needsMigration() {
  const hasMigrated = localStorage.getItem('st_energy_migrated_to_api');
  const hasLocalData = localStorage.getItem('st_energy_sales') || localStorage.getItem('st_energy_courses');
  return !hasMigrated && !!hasLocalData;
}
