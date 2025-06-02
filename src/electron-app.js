const { app, BrowserWindow, ipcMain, BrowserView, screen } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { verifyLicense } = require('./verify-license.js');


let port = 8080;

const server = http.createServer((req, res) => {
  let filePath = path.resolve(__dirname, req.url === '/' ? 'index.html' : req.url);
  try {
    filePath = fs.realpathSync(filePath);
    if (!filePath.startsWith(__dirname)) {
      throw new Error('Access outside of root directory is not allowed');
    }
  } catch (err) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden: Invalid file path');
    return;
  }
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

// Map to store mute state per tabId
const mutedTabs = new Map();

let adBlockerEnabled = true;

// List of ad URL patterns to block (simple example)
const adUrlPatterns = [
  '*://*.doubleclick.net/*',
  '*://*.googlesyndication.com/*',
  '*://*.adservice.google.com/*',
  '*://*.adsafeprotected.com/*',
  '*://*.adnxs.com/*',
  '*://*.adsrvr.org/*',
  '*://*.amazon-adsystem.com/*',
  '*://*.adroll.com/*',
  '*://*.advertising.com/*',
  '*://*.adform.net/*',
  '*://*.adtech.de/*',
  '*://*.adition.com/*',
  '*://*.ads-twitter.com/*',
  '*://*.admob.com/*',
  '*://*.ads.yahoo.com/*',
  '*://*.doubleverify.com/*',
  '*://*.exponential.com/*',
  '*://*.openx.net/*',
  '*://*.rubiconproject.com/*',
  '*://*.scorecardresearch.com/*',
  '*://*.taboola.com/*',
  '*://*.teads.tv/*',
  '*://*.tradedoubler.com/*',
  '*://*.yieldmo.com/*',
  '*://*.ads.linkedin.com/*',
  '*://*.adservice.google.co.uk/*',
  '*://*.pixel.wp.com/*',
  '*://*.quantserve.com/*',
  '*://*.scorecardresearch.com/*',
  '*://*.zedo.com/*',
  '*://*.outbrain.com/*',
  '*://*.criteo.com/*',
  '*://*.mathtag.com/*',
  '*://*.taboola.com/*',
  '*://*.revcontent.com/*',
  '*://*.adform.net/*',
  '*://*.adnxs.com/*',
  '*://*.openx.net/*',
  '*://*.pubmatic.com/*',
  '*://*.contextweb.com/*',
  '*://*.casalemedia.com/*',
  '*://*.advertising.com/*',
  '*://*.adtech.de/*',
  '*://*.adroll.com/*',
  '*://*.adsrvr.org/*',
  '*://*.admob.com/*',
  '*://*.adsafeprotected.com/*',
  '*://*.exponential.com/*',
  '*://*.tribalfusion.com/*',
  '*://*.yieldmo.com/*',
  '*://*.adblade.com/*',
  '*://*.adcolony.com/*',
  '*://*.adform.net/*',
  '*://*.adnxs.com/*',
  '*://*.adsrvr.org/*',
  '*://*.ads-twitter.com/*',
  '*://*.adsafeprotected.com/*',
  '*://*.adtech.de/*',
  '*://*.advertising.com/*',
  '*://*.advertising.com/*',
  '*://*.advertising.com/*',
];

function getViewBounds() {
  if (!mainWindow) return { x: 0, y: 80, width: 900, height: 520 };
  const [width, height] = mainWindow.getContentSize();
  // Assuming toolbar height 40px and tab bar height 40px
  return { x: 0, y: 80, width: width, height: height - 80 };
}

function setupAdBlockerForView(view) {
  const ses = view.webContents.session;
  ses.webRequest.onBeforeRequest({ urls: adUrlPatterns }, (details, callback) => {
    if (adBlockerEnabled) {
      console.log(`Blocked ad request: ${details.url}`);
      callback({ cancel: true });
    } else {
      callback({ cancel: false });
    }
  });
}

ipcMain.on('toggle-adblocker', (event) => {
  adBlockerEnabled = !adBlockerEnabled;
  console.log(`AdBlocker enabled: ${adBlockerEnabled}`);
  if (mainWindow) {
    mainWindow.webContents.send('adblocker-status', adBlockerEnabled);
  }
});

function createNewTab(url) {
  const viewId = nextViewId++;
  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      preload: require('path').join(__dirname, 'poki-ad-blocker.js'),
    },
  });

  // Log loading failures for diagnosis
  view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load URL: ${validatedURL} with error (${errorCode}): ${errorDescription}`);
  });
  

  mainWindow.addBrowserView(view);
  const bounds = getViewBounds();
  view.setBounds(bounds);
  view.webContents.loadURL(url || 'https://www.google.com');

  // Setup ad blocker for this view
  setupAdBlockerForView(view);

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

async function createWindow() {
  const deviceId = os.hostname(); // Use the device hostname as the ID
  const licenseKey = "DEV-FREE-ACCESS-123"; // Replace with the actual license key

  try {
      const result = await verifyLicense(licenseKey, deviceId);
      if (!result.valid) {
          console.error(result.message);
          // app.quit();
          return;
      }
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

  // Send initial adblocker status to renderer
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('adblocker-status', adBlockerEnabled);
  });

  const newTabId = createNewTab('https://www.google.com');
  mainWindow.webContents.send('new-tab', newTabId);
  updateViewBounds();
  // Remove existing listeners before adding new ones to prevent memory leaks
  mainWindow.removeAllListeners('closed');
  mainWindow.removeAllListeners('resize');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('resize', () => {
    updateViewBounds();
  });

  // mainWindow.webContents.openDevTools();
  
  ipcMain.on('new-tab', (event) => {
    const newTabId = createNewTab('https://www.google.com');

    // Switch to the new tab's BrowserView
    views.forEach(({ id, view }) => {
      if (id === newTabId) {
        mainWindow.addBrowserView(view);
        view.setBounds(getViewBounds());
        activeViewId = id;
        // Apply mute state if any
        const muted = mutedTabs.get(id) || false;
        view.webContents.setAudioMuted(muted);
      } else {
        mainWindow.removeBrowserView(view);
      }
    });

    mainWindow.webContents.send('new-tab', newTabId);
    mainWindow.webContents.send('switch-tab', newTabId);
    updateViewBounds();
  });

  ipcMain.on('switch-tab', (event, tabId) => {
    if (views.some(v => v.id === tabId)) {
      views.forEach(({ id, view }) => {
        if (id === tabId) {
          mainWindow.addBrowserView(view);
          view.setBounds(getViewBounds());
          activeViewId = id;
          // Apply mute state if any
          const muted = mutedTabs.get(id) || false;
          view.webContents.setAudioMuted(muted);
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
      mutedTabs.delete(tabId);

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
      // Removed redundant loadFile and maximize calls to prevent overriding loaded URL
      console.log("License verified successfully!");
  } catch (error) {
    console.error("Error verifying license:", error);
    app.quit();
}
}

app.whenReady().then(createWindow);

ipcMain.on('navigate', (event, input) => {
  console.log(`Navigate event received with input: ${input}`);
  console.log(`Current activeViewId: ${activeViewId}`);
  const activeView = views.find((v) => v.id === activeViewId)?.view;
  if (!activeView) {
    console.log('No active view found for navigation.');
    return;
  }

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

  console.log(`Loading URL: ${urlToLoad}`);
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
ipcMain.on('toggle-mute-tab', (event, tabId) => {
  console.log(`Main: toggle-mute-tab received for tabId ${tabId}`);
  const tab = views.find(v => v.id === tabId);
  if (tab) {
    const currentMuted = mutedTabs.get(tabId) || false;
    const newMuted = !currentMuted;
    mutedTabs.set(tabId, newMuted);
    tab.view.webContents.setAudioMuted(newMuted);
    console.log(`Tab ${tabId} mute toggled to ${newMuted}`);
    if (mainWindow) {
      mainWindow.webContents.send('update-tab-muted', { tabId, muted: newMuted });
    }
  } else {
    console.log(`Tab with id ${tabId} not found`);
  }
});

ipcMain.on('request-mute-state', (event, tabId) => {
  const muted = mutedTabs.get(tabId) || false;
  event.sender.send('response-mute-state', { tabId, muted });
});

module.exports = { createWindow };
