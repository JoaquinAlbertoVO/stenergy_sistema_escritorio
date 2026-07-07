const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Sales
    getSales: () => ipcRenderer.invoke('get-sales'),
    addSale: (sale) => ipcRenderer.invoke('add-sale', sale),
    updateSale: (id, updates) => ipcRenderer.invoke('update-sale', id, updates),
    deleteSale: (id) => ipcRenderer.invoke('delete-sale', id),

    // Courses
    getCourses: () => ipcRenderer.invoke('get-courses'),
    addCourse: (course) => ipcRenderer.invoke('add-course', course),
    updateCourse: (id, updates) => ipcRenderer.invoke('update-course', id, updates),
    deleteCourse: (id) => ipcRenderer.invoke('delete-course', id),
    syncCoursesWithWP: () => ipcRenderer.invoke('sync-wp-courses'),

    // Calendar
    getCalendarData: () => ipcRenderer.invoke('get-calendar'),
    addCalendarEntry: (entry) => ipcRenderer.invoke('add-calendar-entry', entry),
    updateCalendarEntry: (id, updates) => ipcRenderer.invoke('update-calendar-entry', id, updates),
    deleteCalendarEntry: (id) => ipcRenderer.invoke('delete-calendar-entry', id),

    // Auth & Users
    getUsers: () => ipcRenderer.invoke('get-users'),
    authenticateUser: (username, password) => ipcRenderer.invoke('auth-user', username, password),

    // PDF / Certificates
    generateCertificate: (saleId) => ipcRenderer.invoke('generate-certificate', saleId),

    // Sync & Settings
    saveMysqlConfig: (config) => ipcRenderer.invoke('save-mysql-config', config),
    getMysqlConfig: () => ipcRenderer.invoke('get-mysql-config'),
    startMysqlSync: () => ipcRenderer.invoke('start-mysql-sync')
});
