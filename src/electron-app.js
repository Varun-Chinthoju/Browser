const { app, BrowserWindow, ipcMain, BrowserView } = require('electron');

let mainWindow;
let view;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    view = new BrowserView();
    mainWindow.setBrowserView(view);
    view.setBounds({ x: 0, y: 0, width: 2560, height: 1400 });
    view.webContents.loadURL('https://www.youtube.com'); // Load a default URL

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

// IPC for navigation
ipcMain.on('navigate', (event, url) => {
    view.webContents.loadURL(url);
});

ipcMain.on('go-back', () => {
    view.webContents.goBack();
});

ipcMain.on('go-forward', () => {
    view.webContents.goForward();
});

ipcMain.on('reload', () => {
    view.webContents.reload();
});
