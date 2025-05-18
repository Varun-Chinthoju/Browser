const { app, BrowserWindow, ipcMain, BrowserView, screen } = require('electron');

let mainWindow;
let currentView;
let views = [];

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('src/index.html');
    mainWindow.maximize();

    const { width, height } = screen.getPrimaryDisplay().bounds;

    function createNewTab() {
        const view = new BrowserView();
        mainWindow.addBrowserView(view);
        view.setBounds({ x: 0, y: 60, width: width, height: height - 60 });
        view.webContents.loadURL('https://www.google.com'); // Load a default URL
        views.push(view);
        return view;
    }

    currentView = createNewTab();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.webContents.openDevTools();

    ipcMain.on('new-tab', () => {
        let newTab = createNewTab();
        currentView = newTab;
    });
}

app.whenReady().then(createWindow);

// IPC for navigation
ipcMain.on('navigate', (event, url) => {
    currentView.webContents.loadURL(url);
});

ipcMain.on('go-back', () => {
    currentView.webContents.goBack();
});

ipcMain.on('go-forward', () => {
    currentView.webContents.goForward();
});

ipcMain.on('reload', () => {
    currentView.webContents.reload();
});
