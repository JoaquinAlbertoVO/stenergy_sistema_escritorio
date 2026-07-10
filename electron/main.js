const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initDB } = require('./database');
const { registerIpcHandlers } = require('./ipcHandlers');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true
    });

    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    // Initialize SQLite Database
    try {
        initDB();
        console.log("Database initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize database:", error);
    }

    console.log("Registering IPC handlers...");
    try {
        registerIpcHandlers();
        console.log("IPC handlers registered successfully.");
    } catch (e) {
        console.error("Error in registerIpcHandlers:", e);
    }

    console.log("Creating window...");
    try {
        createWindow();
        console.log("Window created.");
    } catch (e) {
        console.error("Error creating window:", e);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
