const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const axios = require('axios');
const FormData = require('form-data');
const { db } = require('./database');

async function generateCertificatePdf(sale, course, registryNumber) {
    // Definimos las rutas a las plantillas y fuentes (podrían estar en public o en una carpeta assets)
    // Asumimos que están en backend/generador_certs/assets o en la raíz, pero en Electron
    // se recomienda que estén junto al código o en la appData.
    // Vamos a buscar las plantillas en una carpeta "assets" local por ahora.
    // O si estaban en backend, vamos a intentar usar las del backend si existen.
    const projectRoot = process.env.NODE_ENV === 'development' ? path.join(__dirname, '..') : process.resourcesPath;
    
    // Usamos las plantillas de la carpeta local assets
    const frontPath = path.join(projectRoot, 'assets', 'front.png');
    const backPath = path.join(projectRoot, 'assets', 'back.png');

    if (!fs.existsSync(frontPath) || !fs.existsSync(backPath)) {
        throw new Error('No se encontraron las plantillas de certificado (front.png / back.png)');
    }

    const frontImageBytes = fs.readFileSync(frontPath);
    const backImageBytes = fs.readFileSync(backPath);

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Add font
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Embed images
    const frontImage = await pdfDoc.embedPng(frontImageBytes);
    const backImage = await pdfDoc.embedPng(backImageBytes);

    const pageWidth = 1462;
    const pageHeight = 1024;

    // --- PAGE 1: FRONT ---
    const page1 = pdfDoc.addPage([pageWidth, pageHeight]);
    page1.drawImage(frontImage, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
    });

    const studentName = sale.clientName.toUpperCase();
    const dni = sale.clientDni;
    const academicHours = course.academicHours || "120 horas";
    const issueDate = sale.date; // or format it "Lima, 15 de Agosto de 2024"
    const descriptionText = course.descriptionText || "Participó y aprobó satisfactoriamente el curso.";

    // Horas académicas (y = 660 from bottom in reportlab -> 1024 - 660 = 364 from bottom in pdf-lib? 
    // Wait, reportlab origin is bottom-left, same as pdf-lib!
    page1.drawText(academicHours, {
        x: 116,
        y: 660,
        size: 22,
        font: helveticaOblique,
        color: rgb(1, 1, 1)
    });

    page1.drawText(`Lima, ${issueDate}`, {
        x: 116,
        y: 530,
        size: 18,
        font: helveticaOblique,
        color: rgb(1, 1, 1)
    });

    // Centered Name
    const nameWidth = helveticaBold.widthOfTextAtSize(studentName, 34);
    page1.drawText(studentName, {
        x: 1000 - (nameWidth / 2),
        y: 580,
        size: 34,
        font: helveticaBold,
        color: rgb(0, 0, 0)
    });

    // Centered DNI
    const dniWidth = helveticaBold.widthOfTextAtSize(dni, 16);
    page1.drawText(dni, {
        x: 970 - (dniWidth / 2),
        y: 530,
        size: 16,
        font: helveticaBold,
        color: rgb(0, 0, 0)
    });

    // Description text (centered paragraph)
    const descWidth = helvetica.widthOfTextAtSize(descriptionText, 18);
    page1.drawText(descriptionText, {
        x: 970 - (descWidth / 2),
        y: 450,
        size: 18,
        font: helvetica,
        color: rgb(0, 0, 0)
    });

    // Registry Number
    page1.drawText(registryNumber, {
        x: 1170,
        y: 80,
        size: 12,
        font: helveticaBold,
        color: rgb(0, 0, 0)
    });

    // --- PAGE 2: BACK ---
    const page2 = pdfDoc.addPage([pageWidth, pageHeight]);
    page2.drawImage(backImage, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
    });

    // Generate QR
    const verificationUrl = `https://stenergyedu.com/verificar/?qr=${registryNumber}`;
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 240, margin: 1 });
    const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const qrImage = await pdfDoc.embedPng(qrImageBytes);

    page2.drawImage(qrImage, {
        x: 600,
        y: 550,
        width: 240,
        height: 240,
    });

    const regText = `N° de registro: ${registryNumber} - www.stenergyedu.com`;
    const regWidth = helveticaBold.widthOfTextAtSize(regText, 22);
    page2.drawText(regText, {
        x: 731 - (regWidth / 2),
        y: 110,
        size: 22,
        font: helveticaBold,
        color: rgb(0, 0, 0)
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    
    // Save to local file system
    const pdfsDir = path.join(app.getPath('userData'), 'certificados');
    if (!fs.existsSync(pdfsDir)) {
        fs.mkdirSync(pdfsDir, { recursive: true });
    }

    const safeCourseName = course.name.replace(/[^a-zA-Z0-9]/g, '_');
    const pdfFilename = `${registryNumber}-${sale.clientDni}-${safeCourseName}.pdf`;
    const pdfPath = path.join(pdfsDir, pdfFilename);
    
    fs.writeFileSync(pdfPath, pdfBytes);

    // Subir a la API usando axios
    await uploadToCpanel(pdfPath, pdfFilename, registryNumber);

    return pdfPath;
}

async function uploadToCpanel(localPdfPath, filename, saleId) {
    try {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('mysql_config');
        if (!row) return; // Si no hay config, no sube nada

        const config = JSON.parse(row.value);
        if (!config || !config.host) return;

        const apiUrl = config.host; 
        const apiSecret = config.password;

        const form = new FormData();
        form.append('api_secret', apiSecret);
        form.append('saleId', saleId);
        form.append('pdf', fs.createReadStream(localPdfPath), filename);

        const response = await axios.post(`${apiUrl}?action=upload_pdf`, form, {
            headers: {
                ...form.getHeaders()
            }
        });

        if (response.data && response.data.success) {
            console.log(`PDF Subido con éxito: ${response.data.url}`);
        } else {
            console.error('Error del servidor al subir PDF:', response.data);
        }
    } catch (error) {
        console.error('Error enviando PDF a la API:', error.message);
    }
}

module.exports = { generateCertificatePdf };
