import { supabase } from '../services/supabaseClient';

const KEYS = {
  CURRENT_USER: 'st_energy_current_user',
};

// ============================================
// Auth (local storage is fine for session)
// ============================================
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
// Cache
// ============================================
let _salesCache = null;
let _coursesCache = null;
let _calendarCache = null;

export async function preloadData() {
  try {
    const [salesRes, coursesRes, calendarRes, usersRes] = await Promise.all([
      supabase.from('sales').select('*, payments(*)'),
      supabase.from('courses').select('*'),
      supabase.from('calendar').select('*'),
      supabase.from('users').select('*')
    ]);
    
    _salesCache = salesRes.data || [];
    _coursesCache = coursesRes.data || [];
    _calendarCache = calendarRes.data || [];
  } catch (e) {
    console.error("Error preloading data from Supabase", e);
  }
}

export async function invalidateCache(type) {
  if (!type || type === 'sales') {
    const res = await supabase.from('sales').select('*, payments(*)');
    _salesCache = res.data || [];
  }
  if (!type || type === 'courses') {
    const res = await supabase.from('courses').select('*');
    _coursesCache = res.data || [];
  }
  if (!type || type === 'calendar') {
    const res = await supabase.from('calendar').select('*');
    _calendarCache = res.data || [];
  }
}

// ============================================
// Sales
// ============================================
export function getSales() {
  return _salesCache || [];
}

export async function addSale(sale) {
  sale.id = 's' + Date.now();
  
  const payments = sale.payments || [];
  delete sale.payments;
  
  const { data, error } = await supabase.from('sales').insert([sale]).select();
  if (error) throw error;
  
  if (payments.length > 0) {
    const paymentsToInsert = payments.map((p, i) => ({
      ...p,
      id: `pay_${sale.id}_${i}`,
      saleId: sale.id,
    }));
    const { error: payError } = await supabase.from('payments').insert(paymentsToInsert);
    if (payError) throw payError;
  }
  
  await invalidateCache('sales');
  return data[0];
}

export async function updateSale(sale) {
  const payments = sale.payments || [];
  delete sale.payments;
  
  const { data, error } = await supabase.from('sales').update(sale).eq('id', sale.id).select();
  if (error) throw error;
  
  // Replace payments
  await supabase.from('payments').delete().eq('saleId', sale.id);
  
  if (payments.length > 0) {
    const paymentsToInsert = payments.map((p, i) => ({
      ...p,
      id: `pay_${sale.id}_${i}_${Date.now()}`,
      saleId: sale.id,
    }));
    const { error: payError } = await supabase.from('payments').insert(paymentsToInsert);
    if (payError) throw payError;
  }
  
  await invalidateCache('sales');
  return data[0];
}

export async function deleteSale(id) {
  const { error } = await supabase.from('sales').delete().eq('id', id);
  if (error) throw error;
  await invalidateCache('sales');
}

export function getSalesStats(userId = null) {
  let sales = getSales();
  if (userId) {
    sales = sales.filter(s => s.sellerId === userId);
  }
  
  const totalSalesCount = sales.length;
  const totalAmount = sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const totalCollected = sales.reduce((sum, s) => sum + (Number(s.paidAmount) || 0), 0);
  const pendingAmount = totalAmount - totalCollected;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthSales = sales.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  const thisMonthCount = thisMonthSales.length;
  const thisMonthAmount = thisMonthSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  
  return {
    totalSalesCount,
    totalAmount,
    totalCollected,
    pendingAmount,
    thisMonthCount,
    thisMonthAmount
  };
}

// ============================================
// Courses
// ============================================
export function getCourses() {
  return _coursesCache || [];
}

export async function addCourse(course) {
  course.id = 'c' + Date.now();
  const { data, error } = await supabase.from('courses').insert([course]).select();
  if (error) throw error;
  await invalidateCache('courses');
  return data[0];
}

export async function updateCourse(course) {
  const { data, error } = await supabase.from('courses').update(course).eq('id', course.id).select();
  if (error) throw error;
  await invalidateCache('courses');
  return data[0];
}

export async function deleteCourse(id) {
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) throw error;
  await invalidateCache('courses');
}

// ============================================
// Calendar
// ============================================
export function getCalendarData() {
  return _calendarCache || [];
}

export async function addCalendarEntry(event) {
  event.id = 'evt' + Date.now();
  const { data, error } = await supabase.from('calendar').insert([event]).select();
  if (error) throw error;
  await invalidateCache('calendar');
  return data[0];
}

export async function updateCalendarEntry(event) {
  const { data, error } = await supabase.from('calendar').update(event).eq('id', event.id).select();
  if (error) throw error;
  await invalidateCache('calendar');
  return data[0];
}

export async function deleteCalendarEntry(id) {
  const { error } = await supabase.from('calendar').delete().eq('id', id);
  if (error) throw error;
  await invalidateCache('calendar');
}

// ============================================
// Migration helper
// ============================================
export async function migrateLocalStorageToBackend() {
  const localSales = localStorage.getItem('st_energy_sales');
  const localCourses = localStorage.getItem('st_energy_courses');
  const localCalendar = localStorage.getItem('st_energy_calendar');
  const localUsers = localStorage.getItem('st_energy_users');

  if (!localSales && !localCourses && !localCalendar) {
    return { migrated: false, message: 'No hay datos locales para migrar' };
  }

  try {
    if (localCourses) {
      const courses = JSON.parse(localCourses);
      for (const c of courses) {
        await supabase.from('courses').upsert(c);
      }
    }
    if (localSales) {
      const sales = JSON.parse(localSales);
      for (const s of sales) {
        const payments = s.payments || [];
        const saleCopy = { ...s };
        delete saleCopy.payments;
        
        await supabase.from('sales').upsert(saleCopy);
        for (const p of payments) {
          await supabase.from('payments').upsert({
            ...p,
            id: p.id || `pay_${s.id}_${Math.random()}`,
            saleId: s.id
          });
        }
      }
    }
    if (localCalendar) {
      const cal = JSON.parse(localCalendar);
      for (const e of cal) {
        await supabase.from('calendar').upsert(e);
      }
    }
    if (localUsers) {
      const users = JSON.parse(localUsers);
      for (const u of users) {
        await supabase.from('users').upsert(u);
      }
    }

    localStorage.setItem('st_energy_migrated_to_supabase', 'true');
    await invalidateCache();
    return { migrated: true, message: 'Datos migrados exitosamente a Supabase' };
  } catch (error) {
    return { migrated: false, message: `Error migrando a Supabase: ${error.message}` };
  }
}

export function needsMigration() {
  const hasMigrated = localStorage.getItem('st_energy_migrated_to_supabase');
  const hasLocalData = localStorage.getItem('st_energy_sales') || localStorage.getItem('st_energy_courses');
  return !hasMigrated && !!hasLocalData;
}
