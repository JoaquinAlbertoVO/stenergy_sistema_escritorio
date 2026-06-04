import { DEMO_SALES, DEMO_CALENDAR, USERS } from '../data/initialData';
import COURSES_DATA from '../data/courses';

const KEYS = {
  SALES: 'st_energy_sales',
  CALENDAR: 'st_energy_calendar',
  USERS: 'st_energy_users',
  CURRENT_USER: 'st_energy_current_user',
  INITIALIZED: 'st_energy_initialized',
  VERSION: 'st_energy_version_2',
  COURSES: 'st_energy_courses'
};

// Initialize data on first run
export function initializeData() {
  if (!localStorage.getItem(KEYS.VERSION)) {
    localStorage.setItem(KEYS.SALES, JSON.stringify(DEMO_SALES));
    localStorage.setItem(KEYS.CALENDAR, JSON.stringify(DEMO_CALENDAR));
    localStorage.setItem(KEYS.USERS, JSON.stringify(USERS));
    localStorage.setItem(KEYS.COURSES, JSON.stringify(COURSES_DATA));
    localStorage.setItem(KEYS.INITIALIZED, 'true');
    localStorage.setItem(KEYS.VERSION, 'true');
  }
}

// ---- Sales ----
export function getSales() {
  const data = localStorage.getItem(KEYS.SALES);
  return data ? JSON.parse(data) : [];
}

export function addSale(sale) {
  const sales = getSales();
  sale.id = 's' + Date.now();
  sales.push(sale);
  localStorage.setItem(KEYS.SALES, JSON.stringify(sales));
  return sale;
}

export function updateSale(id, updates) {
  const sales = getSales();
  const index = sales.findIndex(s => s.id === id);
  if (index !== -1) {
    sales[index] = { ...sales[index], ...updates };
    localStorage.setItem(KEYS.SALES, JSON.stringify(sales));
    return sales[index];
  }
  return null;
}

export function deleteSale(id) {
  const sales = getSales().filter(s => s.id !== id);
  localStorage.setItem(KEYS.SALES, JSON.stringify(sales));
}

// ---- Calendar ----
export function getCalendarData() {
  const data = localStorage.getItem(KEYS.CALENDAR);
  return data ? JSON.parse(data) : [];
}

export function addCalendarEntry(entry) {
  const calendar = getCalendarData();
  entry.id = 'cal' + Date.now();
  calendar.push(entry);
  localStorage.setItem(KEYS.CALENDAR, JSON.stringify(calendar));
  return entry;
}

export function updateCalendarEntry(id, updates) {
  const calendar = getCalendarData();
  const index = calendar.findIndex(c => c.id === id);
  if (index !== -1) {
    calendar[index] = { ...calendar[index], ...updates };
    localStorage.setItem(KEYS.CALENDAR, JSON.stringify(calendar));
    return calendar[index];
  }
  return null;
}

export function deleteCalendarEntry(id) {
  const calendar = getCalendarData().filter(c => c.id !== id);
  localStorage.setItem(KEYS.CALENDAR, JSON.stringify(calendar));
}

// Count how many courses are active on a given date
export function getCoursesOnDate(dateStr) {
  const calendar = getCalendarData();
  return calendar.filter(entry => {
    return dateStr >= entry.startDate && dateStr <= entry.endDate;
  });
}

// ---- Courses ----
export function getCourses() {
  const data = localStorage.getItem(KEYS.COURSES);
  if (!data) {
    // Si por alguna razón no existen (ej. usuarios viejos), los cargamos.
    localStorage.setItem(KEYS.COURSES, JSON.stringify(COURSES_DATA));
    return COURSES_DATA;
  }
  return JSON.parse(data);
}

export function addCourse(course) {
  const courses = getCourses();
  course.id = 'c' + Date.now();
  courses.push(course);
  localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
  return course;
}

export function updateCourse(id, updates) {
  const courses = getCourses();
  const index = courses.findIndex(c => c.id === id);
  if (index !== -1) {
    courses[index] = { ...courses[index], ...updates };
    localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
    return courses[index];
  }
  return null;
}

export function deleteCourse(id) {
  const courses = getCourses().filter(c => c.id !== id);
  localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
}

// ---- Auth ----
export function getUsers() {
  const data = localStorage.getItem(KEYS.USERS);
  return data ? JSON.parse(data) : USERS;
}

export function authenticateUser(username, password) {
  const users = getUsers();
  return users.find(u => u.username === username && u.password === password) || null;
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

// ---- Stats ----
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
