const { app, BrowserWindow, ipcMain, BrowserView, screen } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 8080;

const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const extname = path.extname(filePath);
  let contentType = 'text/html';

  switch (extname) {
    case '.js':
      contentType = 'application/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpg';
      break;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code == 'ENOENT') {
        fs.readFile(path.join(__dirname, '404.html'), (err, content) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf8');
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf8');
    }
  });
});

server.listen(port, () => {
  console.log(`Server running at http://127.0.0.1:${port}/`);
});

let mainWindow;
let views = [];
let activeViewId = null;
let nextViewId = 1;

function createNewTab(url) {
  const viewId = nextViewId++;
  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  mainWindow.addBrowserView(view);
  view.setBounds({ x: 0, y: 30, width: 900, height: 570 });
  view.webContents.loadURL(url || `http://127.0.0.1:${port}`);
  views.push({ id: viewId, view });
  return viewId;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        },
        frame: true
    });

    mainWindow.loadURL(`http://127.0.0.1:${port}`);
    mainWindow.maximize();

    const { width, height } = screen.getPrimaryDisplay().bounds;

    activeViewId = createNewTab(`http://127.0.0.1:${port}`);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.webContents.openDevTools();

    ipcMain.on('new-tab', (event) => {
      const newTabId = createNewTab(`http://127.0.0.1:${port}`);
      // TODO: Send message to renderer to create a new tab
    });
}

app.whenReady().then(createWindow);

// IPC for navigation
ipcMain.on('navigate', (event, url) => {
  const activeView = views.find(v => v.id === activeViewId)?.view;
  activeView?.webContents.loadURL(url);
});

ipcMain.on('go-back', () => {
  const activeView = views.find(v => v.id === activeViewId)?.view;
  activeView?.webContents.goBack();
});

ipcMain.on('go-forward', () => {
  const activeView = views.find(v => v.id === activeViewId)?.view;
  activeView?.webContents.goForward();
});

ipcMain.on('reload', () => {
  const activeView = views.find(v => v.id === activeViewId)?.view;
  activeView?.webContents.reload();
});
