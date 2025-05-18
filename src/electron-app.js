const { app, BrowserWindow, ipcMain, BrowserView, screen } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

let port = 8080;

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

function listenServer(portToTry, maxAttempts = 5) {
  server.listen(portToTry, () => {
    port = portToTry;
    console.log(`Server running at http://127.0.0.1:${port}/`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && maxAttempts > 0) {
      console.log(`Port ${portToTry} in use, trying port ${portToTry + 1}`);
      listenServer(portToTry + 1, maxAttempts - 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

listenServer(port);

let mainWindow;
let views = [];
let activeViewId = null;
let nextViewId = 1;

function getViewBounds() {
  if (!mainWindow) return { x: 0, y: 80, width: 900, height: 520 };
  const [width, height] = mainWindow.getContentSize();
  // Assuming toolbar height 40px and tab bar height 40px
  return { x: 0, y: 80, width: width, height: height - 80 };
}

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
  const bounds = getViewBounds();
  view.setBounds(bounds);
  view.webContents.loadURL(url || 'https://www.google.com');

  // Listen for navigation events to update URL input in renderer
  view.webContents.on('did-navigate', (event, url) => {
    mainWindow.webContents.send('update-url', url);
  });
  view.webContents.on('did-navigate-in-page', (event, url) => {
    mainWindow.webContents.send('update-url', url);
  });

  // Send page title updates to renderer for tab name update
  view.webContents.on('page-title-updated', (event, title) => {
    mainWindow.webContents.send('update-tab-title', { tabId: viewId, title });
  });

  views.push({ id: viewId, view });
  activeViewId = viewId; // Set new tab as active
  return viewId;
}

function updateViewBounds() {
  const bounds = getViewBounds();
  views.forEach(({ view }) => {
    view.setBounds(bounds);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
    frame: true,
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);
  mainWindow.maximize();

  activeViewId = createNewTab(`http://127.0.0.1:${port}`);

  // Remove existing listeners before adding new ones to prevent memory leaks
  mainWindow.removeAllListeners('closed');
  mainWindow.removeAllListeners('resize');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('resize', () => {
    updateViewBounds();
  });

  mainWindow.webContents.openDevTools();

  ipcMain.on('new-tab', (event) => {
    const newTabId = createNewTab(`http://127.0.0.1:${port}`);
    mainWindow.webContents.send('new-tab', newTabId);
    updateViewBounds();
  });

  ipcMain.on('switch-tab', (event, tabId) => {
    if (views.some(v => v.id === tabId)) {
      views.forEach(({ id, view }) => {
        if (id === tabId) {
          mainWindow.addBrowserView(view);
          view.setBounds(getViewBounds());
          activeViewId = id;
        } else {
          mainWindow.removeBrowserView(view);
        }
      });
      mainWindow.webContents.send('switch-tab', tabId);
    }
  });

  ipcMain.on('close-tab', (event, tabId) => {
    const index = views.findIndex(v => v.id === tabId);
    if (index !== -1) {
      const { view } = views[index];
      mainWindow.removeBrowserView(view);
      views.splice(index, 1);

      if (activeViewId === tabId) {
        if (views.length > 0) {
          const newActive = views[views.length - 1];
          mainWindow.addBrowserView(newActive.view);
          newActive.view.setBounds(getViewBounds());
          activeViewId = newActive.id;
          mainWindow.webContents.send('switch-tab', newActive.id);
        } else {
          activeViewId = null;
          mainWindow.webContents.send('switch-tab', null);
        }
      }

      mainWindow.webContents.send('close-tab', tabId);
    }
  });
}

app.whenReady().then(createWindow);

ipcMain.on('navigate', (event, input) => {
  const activeView = views.find((v) => v.id === activeViewId)?.view;
  if (!activeView) return;

  const tlds = ['.com', '.net', '.org', '.io', '.gov', '.edu', '.co', '.us', '.uk'];

  const lowerInput = input.toLowerCase().trim();

  const startsWithHttp = /^https?:\/\//i.test(input);

  const endsWithTld = tlds.some(tld => lowerInput.endsWith(tld));

  let urlToLoad;

  if (startsWithHttp) {
    urlToLoad = input;
  } else if (endsWithTld) {
    urlToLoad = 'http://' + input;
  } else {
    const query = encodeURIComponent(input);
    urlToLoad = `https://www.google.com/search?q=${query}`;
  }

  activeView.webContents.loadURL(urlToLoad);
});

ipcMain.on('go-back', () => {
  const activeView = views.find((v) => v.id === activeViewId)?.view;
  activeView?.webContents.goBack();
});

ipcMain.on('go-forward', () => {
  const activeView = views.find((v) => v.id === activeViewId)?.view;
  activeView?.webContents.goForward();
});

ipcMain.on('reload', () => {
  const activeView = views.find((v) => v.id === activeViewId)?.view;
  activeView?.webContents.reload();
});
