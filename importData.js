const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const Database = require('better-sqlite3');

const dbPath = path.join(process.env.APPDATA || process.env.LOCALAPPDATA, 'react-cours', 'stenergy_local.db');
console.log('Using DB at:', dbPath);
const db = new Database(dbPath);

const csvFilePath = 'C:\\Users\\Joaquin\\.gemini\\antigravity-ide\\brain\\27a34ee5-ce7e-4558-8842-d8d7617366bb\\.system_generated\\steps\\515\\content.md';
const content = fs.readFileSync(csvFilePath, 'utf8');

const csvStartIndex = content.indexOf('Fecha registro');
const csvContent = content.substring(csvStartIndex);

Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    const records = results.data;
    console.log(`Parsed ${records.length} records.`);

    // Clear old data so we don't duplicate
    db.prepare('DELETE FROM payments').run();
    db.prepare('DELETE FROM sales').run();
    console.log('Cleared old sales and payments.');

    const salesMap = new Map(); // key: DNI + Course
    let totalPayments = 0;

    for (const row of records) {
      // Find course column name (could be 'CURSO ', 'Curso', etc)
      const courseCol = Object.keys(row).find(k => k.trim().toLowerCase() === 'curso');
      const dniCol = Object.keys(row).find(k => k.trim().toLowerCase() === 'dni');
      const montoCol = Object.keys(row).find(k => k.trim().toLowerCase() === 'monto');
      
      if (!dniCol || !courseCol) continue;
      
      const dni = row[dniCol] ? row[dniCol].trim() : '';
      const courseName = row[courseCol] ? row[courseCol].trim() : '';
      
      if (!dni || !courseName) continue;

      const key = `${dni}_${courseName}`;

      const amountStr = row[montoCol] ? row[montoCol].toString().replace(/,/g, '') : '0';
      const amount = parseFloat(amountStr) || 0;

      if (!salesMap.has(key)) {
        salesMap.set(key, {
          id: `s_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          date: row['Fecha de venta'] || row['Fecha registro'] || new Date().toISOString(),
          clientId: dni,
          clientName: row['Nombre completo'] || '',
          clientDni: dni,
          clientPhone: row['Teléfono'] || '',
          clientEmail: row['Correo'] || '',
          courseId: `c_${courseName.replace(/\s+/g, '').toLowerCase()}`,
          courseName: courseName,
          modality: 'Virtual', // default
          sellerId: row['Asesor'] || 'Asesor 01',
          sellerName: row['Asesor'] || 'Asesor 01',
          status: row['Estado de venta'] === 'Pagado' ? 'paid' : 'pending',
          totalAmount: 0,
          paidAmount: amount,
          certificateGenerated: row['Estado certificado'] === 'Generado' ? 1 : 0,
          payments: [
            {
              id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              date: row['Fecha de venta'] || row['Fecha registro'],
              amount: amount,
              account: row['Método de pago'] || ''
            }
          ]
        });
        totalPayments++;
      } else {
        const sale = salesMap.get(key);
        sale.paidAmount += amount;
        sale.payments.push({
          id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          date: row['Fecha de venta'] || row['Fecha registro'],
          amount: amount,
          account: row['Método de pago'] || ''
        });
        totalPayments++;
      }
    }

    console.log(`Aggregated into ${salesMap.size} unique sales.`);

    // Start insertion
    const insertSale = db.prepare(`
        INSERT INTO sales (id, date, clientId, clientName, clientDni, clientPhone, clientEmail, courseId, courseName, modality, sellerId, sellerName, status, totalAmount, paidAmount, certificateGenerated)
        VALUES (@id, @date, @clientId, @clientName, @clientDni, @clientPhone, @clientEmail, @courseId, @courseName, @modality, @sellerId, @sellerName, @status, @totalAmount, @paidAmount, @certificateGenerated)
    `);
    const insertPayment = db.prepare(`
        INSERT INTO payments (id, saleId, date, amount, account)
        VALUES (@id, @saleId, @date, @amount, @account)
    `);

    db.transaction(() => {
        for (const sale of salesMap.values()) {
            insertSale.run({
              id: sale.id,
              date: sale.date,
              clientId: sale.clientId,
              clientName: sale.clientName,
              clientDni: sale.clientDni,
              clientPhone: sale.clientPhone,
              clientEmail: sale.clientEmail,
              courseId: sale.courseId,
              courseName: sale.courseName,
              modality: sale.modality,
              sellerId: sale.sellerId,
              sellerName: sale.sellerName,
              status: sale.status,
              totalAmount: sale.paidAmount,
              paidAmount: sale.paidAmount,
              certificateGenerated: sale.certificateGenerated
            });

            for (const p of sale.payments) {
                insertPayment.run({
                  id: p.id,
                  saleId: sale.id,
                  date: p.date,
                  amount: p.amount,
                  account: p.account
                });
            }
        }
    })();

    console.log('Import successful!');
  }
});
