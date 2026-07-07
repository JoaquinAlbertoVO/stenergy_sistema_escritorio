// ============================================
// storage.js — API Electron (Local) con Caché
// ============================================

const isElectron = window.electronAPI !== undefined;

let _salesCache = [];
let _coursesCache = [];
let _calendarCache = [];

export async function preloadData() {
    if (!isElectron) return;
    try {
        _salesCache = await window.electronAPI.getSales() || [];
        _coursesCache = await window.electronAPI.getCourses() || [];
        _calendarCache = await window.electronAPI.getCalendarData() || [];
    } catch (e) {
        console.error("Error preloading data in Electron", e);
    }
}

export async function invalidateCache(type) {
    if (!isElectron) return;
    if (!type || type === 'sales') _salesCache = await window.electronAPI.getSales() || [];
    if (!type || type === 'courses') _coursesCache = await window.electronAPI.getCourses() || [];
    if (!type || type === 'calendar') _calendarCache = await window.electronAPI.getCalendarData() || [];
}

// ============================================
// Sales
// ============================================
export function getSales() {
    return _salesCache || [];
}

export async function fetchSales() {
    return _salesCache; // Alias por compatibilidad
}

export async function addSale(sale) {
    if (!isElectron) return sale;
    sale.id = 's' + Date.now();
    if (sale.payments) {
        sale.payments = sale.payments.map((p, i) => ({
            ...p,
            id: `pay_${sale.id}_${i}`,
            saleId: sale.id,
        }));
    }
    const result = await window.electronAPI.addSale(sale);
    await invalidateCache('sales');
    return result;
}

export async function updateSale(id, updates) {
    if (!isElectron) return updates;
    if (updates.payments) {
        updates.payments = updates.payments.map((p, i) => ({
            ...p,
            id: p.id || `pay_${id}_${Date.now()}_${i}`,
            saleId: id,
        }));
    }
    const result = await window.electronAPI.updateSale(id, updates);
    await invalidateCache('sales');
    return result;
}

export async function deleteSale(id) {
    if (!isElectron) return;
    await window.electronAPI.deleteSale(id);
    await invalidateCache('sales');
}

// ============================================
// Courses
// ============================================
export function getCourses() {
    return _coursesCache || [];
}

export async function fetchCourses() {
    return _coursesCache;
}

export async function addCourse(course) {
    if (!isElectron) return course;
    course.id = 'c' + Date.now();
    const result = await window.electronAPI.addCourse(course);
    await invalidateCache('courses');
    return result;
}

export async function updateCourse(id, updates) {
    if (!isElectron) return updates;
    const result = await window.electronAPI.updateCourse(id, updates);
    await invalidateCache('courses');
    return result;
}

export async function deleteCourse(id) {
    if (!isElectron) return;
    await window.electronAPI.deleteCourse(id);
    await invalidateCache('courses');
}

export async function syncCoursesWithWP() {
    if (!isElectron) return { success: false, error: 'Not in Electron' };
    const result = await window.electronAPI.syncCoursesWithWP();
    await invalidateCache('courses');
    return result;
}

// ============================================
// Calendar
// ============================================
export function getCalendarData() {
    return _calendarCache || [];
}

export async function fetchCalendarData() {
    return _calendarCache;
}

export async function addCalendarEntry(entry) {
    if (!isElectron) return entry;
    entry.id = 'cal' + Date.now();
    const result = await window.electronAPI.addCalendarEntry(entry);
    await invalidateCache('calendar');
    return result;
}

export async function updateCalendarEntry(id, updates) {
    if (!isElectron) return updates;
    const result = await window.electronAPI.updateCalendarEntry(id, updates);
    await invalidateCache('calendar');
    return result;
}

export async function deleteCalendarEntry(id) {
    if (!isElectron) return;
    await window.electronAPI.deleteCalendarEntry(id);
    await invalidateCache('calendar');
}

export function getCoursesOnDate(dateStr) {
    const calendar = getCalendarData();
    return calendar.filter(entry => {
      return dateStr >= entry.startDate && dateStr <= entry.endDate;
    });
}

// ============================================
// Stats (calculada a partir de datos)
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
// Auth (Sigue usando localStorage para sesión actual)
// ============================================
const KEYS = {
    CURRENT_USER: 'st_energy_current_user',
};

export async function getUsers() {
    if (!isElectron) return [];
    return await window.electronAPI.getUsers();
}

export async function authenticateUser(username, password) {
    if (!isElectron) return { success: false, error: 'Not in Electron' };
    return await window.electronAPI.authenticateUser(username, password);
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

export function initializeData() {}

export function needsMigration() {
    return false;
}

// PDF Certificate hook
export async function generateCertificate(saleId) {
    if (!isElectron) return null;
    return await window.electronAPI.generateCertificate(saleId);
}
