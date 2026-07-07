const { ipcMain } = require('electron');
const { db } = require('./database');
const https = require('https');
const { generateCertificatePdf } = require('./pdfService');
const { startSync } = require('./syncService');

function registerIpcHandlers() {
    // --- Auth & Users ---
    ipcMain.handle('get-users', () => {
        return db.prepare('SELECT id, name, username, role FROM users').all();
    });

    ipcMain.handle('auth-user', (event, username, password) => {
        const user = db.prepare('SELECT id, name, username, role FROM users WHERE username = ? AND password = ?').get(username, password);
        if (user) {
            return { success: true, user };
        }
        return { success: false, error: 'Credenciales inválidas' };
    });

    // --- Courses ---
    ipcMain.handle('get-courses', () => {
        return db.prepare('SELECT * FROM courses').all();
    });

    ipcMain.handle('add-course', (event, course) => {
        const stmt = db.prepare(`
            INSERT INTO courses (id, name, shortName, courseCode, price, color, icon, academicHours, descriptionText, cpanelFolder)
            VALUES (@id, @name, @shortName, @courseCode, @price, @color, @icon, @academicHours, @descriptionText, @cpanelFolder)
        `);
        stmt.run(course);
        return course;
    });

    ipcMain.handle('update-course', (event, id, updates) => {
        const setClauses = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
        const stmt = db.prepare(`UPDATE courses SET ${setClauses} WHERE id = @id`);
        stmt.run({ ...updates, id });
        return { ...updates, id };
    });

    ipcMain.handle('delete-course', (event, id) => {
        db.prepare('DELETE FROM courses WHERE id = ?').run(id);
        return { success: true };
    });

    // Sync with WordPress
    ipcMain.handle('sync-wp-courses', async () => {
        return new Promise((resolve, reject) => {
            https.get("https://stenergyedu.com/wp-json/wp/v2/courses?per_page=100", (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    try {
                        const wpCourses = JSON.parse(data);
                        let added = 0;
                        let updated = 0;

                        const insertStmt = db.prepare(`
                            INSERT INTO courses (id, name, shortName, courseCode, price, color, icon, academicHours, descriptionText, cpanelFolder)
                            VALUES (@id, @name, @shortName, @courseCode, @price, @color, @icon, @academicHours, @descriptionText, @cpanelFolder)
                        `);
                        const updateStmt = db.prepare('UPDATE courses SET name = ? WHERE id = ?');

                        const transaction = db.transaction(() => {
                            for (const wc of wpCourses) {
                                const c_id = String(wc.id);
                                // Very basic unescape
                                const c_name = (wc.title?.rendered || "").replace(/&#8211;/g, '-').replace(/&#8217;/g, "'").replace(/&amp;/g, '&');

                                const existing = db.prepare('SELECT name FROM courses WHERE id = ?').get(c_id);
                                if (existing) {
                                    if (existing.name !== c_name) {
                                        updateStmt.run(c_name, c_id);
                                        updated++;
                                    }
                                } else {
                                    insertStmt.run({
                                        id: c_id,
                                        name: c_name,
                                        shortName: c_name.substring(0, 20),
                                        courseCode: "",
                                        price: 0.0,
                                        color: "#cccccc",
                                        icon: "📚",
                                        academicHours: "120 horas",
                                        descriptionText: "Participó y aprobó satisfactoriamente el curso.",
                                        cpanelFolder: ""
                                    });
                                    added++;
                                }
                            }
                        });

                        transaction();
                        resolve({ success: true, added, updated });
                    } catch (err) {
                        resolve({ success: false, error: err.message });
                    }
                });
            }).on('error', err => {
                resolve({ success: false, error: err.message });
            });
        });
    });

    // --- Sales ---
    ipcMain.handle('get-sales', () => {
        const sales = db.prepare('SELECT * FROM sales').all();
        const payments = db.prepare('SELECT * FROM payments').all();
        
        // Map payments to sales, parsing JSON columns
        return sales.map(sale => {
            sale.certificateOverrides = sale.certificateOverrides ? JSON.parse(sale.certificateOverrides) : null;
            sale.payments = payments.filter(p => p.saleId === sale.id);
            return sale;
        });
    });

    ipcMain.handle('add-sale', (event, sale) => {
        const { payments, certificateOverrides, ...saleData } = sale;
        saleData.certificateOverrides = certificateOverrides ? JSON.stringify(certificateOverrides) : null;
        
        // Ensure new sales are marked as unsynced
        saleData.synced = 0;

        const insertSale = db.prepare(`
            INSERT INTO sales (id, date, clientId, clientName, clientDni, clientPhone, clientEmail, courseId, courseName, modality, sellerId, sellerName, status, totalAmount, paidAmount, certificateGenerated, certificateOverrides, synced)
            VALUES (@id, @date, @clientId, @clientName, @clientDni, @clientPhone, @clientEmail, @courseId, @courseName, @modality, @sellerId, @sellerName, @status, @totalAmount, @paidAmount, @certificateGenerated, @certificateOverrides, @synced)
        `);
        const insertPayment = db.prepare(`
            INSERT INTO payments (id, saleId, date, amount, account)
            VALUES (@id, @saleId, @date, @amount, @account)
        `);

        db.transaction(() => {
            insertSale.run(saleData);
            if (payments && payments.length > 0) {
                for (const p of payments) {
                    insertPayment.run(p);
                }
            }
        })();
        return sale;
    });

    ipcMain.handle('update-sale', (event, id, updates) => {
        const { payments, certificateOverrides, ...saleData } = updates;
        if (certificateOverrides !== undefined) {
            saleData.certificateOverrides = certificateOverrides ? JSON.stringify(certificateOverrides) : null;
        }
        
        // Every update should re-sync
        saleData.synced = 0;

        const setClauses = Object.keys(saleData).map(k => `${k} = @${k}`).join(', ');
        
        db.transaction(() => {
            if (setClauses.length > 0) {
                const stmt = db.prepare(`UPDATE sales SET ${setClauses} WHERE id = @id`);
                stmt.run({ ...saleData, id });
            }
            
            if (payments) {
                // Delete existing and re-insert
                db.prepare('DELETE FROM payments WHERE saleId = ?').run(id);
                const insertPayment = db.prepare(`
                    INSERT INTO payments (id, saleId, date, amount, account)
                    VALUES (@id, @saleId, @date, @amount, @account)
                `);
                for (const p of payments) {
                    insertPayment.run({ ...p, saleId: id });
                }
            }
        })();
        return { ...updates, id };
    });

    ipcMain.handle('delete-sale', (event, id) => {
        db.prepare('DELETE FROM sales WHERE id = ?').run(id);
        return { success: true };
    });

    // --- Calendar ---
    ipcMain.handle('get-calendar', () => {
        return db.prepare('SELECT * FROM calendar').all().map(entry => {
            entry.selectedDates = entry.selectedDates ? JSON.parse(entry.selectedDates) : null;
            entry.dailyDetails = entry.dailyDetails ? JSON.parse(entry.dailyDetails) : null;
            return entry;
        });
    });

    ipcMain.handle('add-calendar-entry', (event, entry) => {
        entry.selectedDates = entry.selectedDates ? JSON.stringify(entry.selectedDates) : null;
        entry.dailyDetails = entry.dailyDetails ? JSON.stringify(entry.dailyDetails) : null;

        const stmt = db.prepare(`
            INSERT INTO calendar (id, courseId, courseName, startDate, endDate, selectedDates, color, dailyDetails)
            VALUES (@id, @courseId, @courseName, @startDate, @endDate, @selectedDates, @color, @dailyDetails)
        `);
        stmt.run(entry);
        return entry;
    });

    ipcMain.handle('update-calendar-entry', (event, id, updates) => {
        if (updates.selectedDates !== undefined) updates.selectedDates = updates.selectedDates ? JSON.stringify(updates.selectedDates) : null;
        if (updates.dailyDetails !== undefined) updates.dailyDetails = updates.dailyDetails ? JSON.stringify(updates.dailyDetails) : null;

        const setClauses = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
        const stmt = db.prepare(`UPDATE calendar SET ${setClauses} WHERE id = @id`);
        stmt.run({ ...updates, id });
        return { ...updates, id };
    });

    ipcMain.handle('delete-calendar-entry', (event, id) => {
        db.prepare('DELETE FROM calendar WHERE id = ?').run(id);
        return { success: true };
    });

    // --- Certificates ---
    ipcMain.handle('generate-certificate', async (event, saleId) => {
        try {
            const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
            if (!sale) throw new Error('Venta no encontrada');
            const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(sale.courseId);
            if (!course) throw new Error('Curso no encontrado');
            
            // Format Registry Number (from backend models)
            // Default logic: R-<saleId short>
            const registryNumber = `R-${saleId.replace('s', '').substring(0, 6)}`;

            const pdfPath = await generateCertificatePdf(sale, course, registryNumber);
            
            // Update sale status
            db.prepare('UPDATE sales SET certificateGenerated = 1 WHERE id = ?').run(saleId);

            return { success: true, pdfPath, registryNumber };
        } catch (err) {
            console.error('Error generating certificate:', err);
            return { success: false, error: err.message };
        }
    });

    // --- Settings & Sync ---
    ipcMain.handle('save-mysql-config', (event, config) => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO settings (key, value)
            VALUES (?, ?)
        `);
        stmt.run('mysql_config', JSON.stringify(config));
        return { success: true };
    });

    ipcMain.handle('get-mysql-config', () => {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('mysql_config');
        return row ? JSON.parse(row.value) : null;
    });

    ipcMain.handle('start-mysql-sync', async () => {
        return await startSync();
    });
}

module.exports = {
    registerIpcHandlers
};
