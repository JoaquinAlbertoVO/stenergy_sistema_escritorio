const { db } = require('./database');

async function getMysqlConfig() {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('mysql_config');
    if (!row) return null;
    return JSON.parse(row.value);
}

async function startSync() {
    const config = await getMysqlConfig();
    if (!config || !config.host) {
        throw new Error('Configuración de Nube faltante. Por favor configúrala en el panel.');
    }

    // El nuevo host es la URL de la API, ej: https://midominio.com/api.php
    const apiUrl = config.host; 
    const apiSecret = config.password; // Usaremos el campo password para el api_secret

    try {
        // 1. Obtener ventas no sincronizadas locales
        const unsyncedSales = db.prepare('SELECT * FROM sales WHERE synced = 0').all();
        const salesToUpload = [];
        const paymentsToUpload = [];

        for (const sale of unsyncedSales) {
            salesToUpload.push(sale);
            const payments = db.prepare('SELECT * FROM payments WHERE saleId = ?').all(sale.id);
            paymentsToUpload.push(...payments);
        }

        // 2. Hacer la petición a la API
        const payload = {
            api_secret: apiSecret,
            sales: salesToUpload,
            payments: paymentsToUpload
        };

        const response = await fetch(`${apiUrl}?action=sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiSecret
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error('API Response was not JSON:', text);
            throw new Error('Respuesta inválida del servidor: ' + text.substring(0, 150));
        }

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Error desconocido en la API');
        }

        // 3. Marcar ventas locales como sincronizadas si tuvimos éxito
        if (unsyncedSales.length > 0) {
            const markSynced = db.prepare('UPDATE sales SET synced = 1 WHERE id = ?');
            db.transaction(() => {
                for (const sale of unsyncedSales) {
                    markSynced.run(sale.id);
                }
            })();
        }

        // 4. Descargar e insertar ventas remotas
        const { remoteSales, remotePayments } = result;

        const insertSale = db.prepare(`
            INSERT OR REPLACE INTO sales 
            (id, date, clientId, clientName, clientDni, clientPhone, clientEmail, courseId, courseName, modality, sellerId, sellerName, status, totalAmount, paidAmount, certificateGenerated, certificateOverrides, synced)
            VALUES (@id, @date, @clientId, @clientName, @clientDni, @clientPhone, @clientEmail, @courseId, @courseName, @modality, @sellerId, @sellerName, @status, @totalAmount, @paidAmount, @certificateGenerated, @certificateOverrides, 1)
        `);

        const insertPayment = db.prepare(`
            INSERT OR REPLACE INTO payments (id, saleId, date, amount, account)
            VALUES (@id, @saleId, @date, @amount, @account)
        `);

        db.transaction(() => {
            for (const rs of remoteSales) {
                insertSale.run({
                    id: rs.id, date: rs.date, clientId: rs.clientId, clientName: rs.clientName,
                    clientDni: rs.clientDni, clientPhone: rs.clientPhone, clientEmail: rs.clientEmail,
                    courseId: rs.courseId, courseName: rs.courseName, modality: rs.modality,
                    sellerId: rs.sellerId, sellerName: rs.sellerName, status: rs.status,
                    totalAmount: rs.totalAmount, paidAmount: rs.paidAmount,
                    certificateGenerated: rs.certificateGenerated, certificateOverrides: rs.certificateOverrides
                });
            }

            for (const rp of remotePayments) {
                insertPayment.run({
                    id: rp.id, saleId: rp.saleId, date: rp.date, amount: rp.amount, account: rp.account
                });
            }
        })();

        return { success: true, message: 'Sync completed successfully' };

    } catch (error) {
        console.error('API Sync Error:', error);
        throw new Error(error.message || 'Error syncing with API');
    }
}

module.exports = {
    startSync
};
