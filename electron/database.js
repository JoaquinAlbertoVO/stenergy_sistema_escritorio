const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

// We store the DB in the user data directory so it persists across updates
// Or we can store it in the app's directory. Since it's a local app, appData is safer.
const dbPath = path.join(app.getPath('userData'), 'stenergy_local.db');

const db = new Database(dbPath);

// Initialize tables based on FastAPI models
function initDB() {
    db.pragma('journal_mode = WAL');

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT
        );

        CREATE TABLE IF NOT EXISTS courses (
            id TEXT PRIMARY KEY,
            name TEXT,
            shortName TEXT,
            courseCode TEXT,
            price REAL,
            color TEXT,
            icon TEXT,
            academicHours TEXT,
            descriptionText TEXT,
            cpanelFolder TEXT
        );

        CREATE TABLE IF NOT EXISTS calendar (
            id TEXT PRIMARY KEY,
            courseId TEXT,
            courseName TEXT,
            startDate TEXT,
            endDate TEXT,
            selectedDates TEXT, -- stored as JSON string
            color TEXT,
            dailyDetails TEXT  -- stored as JSON string
        );

        CREATE TABLE IF NOT EXISTS sales (
            id TEXT PRIMARY KEY,
            date TEXT,
            clientId TEXT,
            clientName TEXT,
            clientDni TEXT,
            clientPhone TEXT,
            clientEmail TEXT,
            courseId TEXT,
            courseName TEXT,
            modality TEXT,
            sellerId TEXT,
            sellerName TEXT,
            status TEXT,
            totalAmount REAL,
            paidAmount REAL,
            certificateGenerated INTEGER DEFAULT 0,
            certificateOverrides TEXT, -- stored as JSON string
            synced INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            saleId TEXT,
            date TEXT,
            amount REAL,
            account TEXT,
            FOREIGN KEY(saleId) REFERENCES sales(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `);

    // Create default admin user if no users exist
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count === 0) {
        db.prepare(`
            INSERT INTO users (id, name, username, password, role)
            VALUES (?, ?, ?, ?, ?)
        `).run('u_admin_inicial', 'Administrador', 'admin', 'admin123', 'admin');
    }

    // Try to alter sales table to add synced column if it doesn't exist
    try {
        db.prepare('ALTER TABLE sales ADD COLUMN synced INTEGER DEFAULT 0').run();
    } catch (e) {
        // Column probably already exists
    }
    try {
        db.prepare('ALTER TABLE sales ADD COLUMN certificateOverrides TEXT').run();
    } catch (e) {}

    // Try to alter courses table to add new columns if they don't exist
    try {
        db.prepare('ALTER TABLE courses ADD COLUMN cpanelFolder TEXT').run();
    } catch (e) {}
    try {
        db.prepare('ALTER TABLE courses ADD COLUMN academicHours TEXT').run();
    } catch (e) {}
    try {
        db.prepare('ALTER TABLE courses ADD COLUMN descriptionText TEXT').run();
    } catch (e) {}
}

module.exports = {
    db,
    initDB
};
