const { ipcRenderer, remote } = require('electron');
const tabBar = document.getElementById('tab-bar');
const urlInput = document.getElementById('url-input');
const navigateBtn = document.getElementById('navigate');

let activeTabId = null;
const tabs = new Map();
const urlInputValues = new Map();
const tabTitles = new Map(); // Store tab titles to update dynamically

// Create a tab DOM element
function createTabElement(tabId) {
  const tab = document.createElement('div');
  tab.classList.add('tab');
  tab.dataset.tabId = tabId;

  const title = document.createElement('span');
  title.innerText = 'New Tab';
  title.classList.add('tab-title');
  tab.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.innerText = '×';
  closeBtn.classList.add('tab-close');
  tab.appendChild(closeBtn);

  // Click to switch tab
  tab.addEventListener('click', (e) => {
    if (e.target === closeBtn) return; // Ignore close button clicks
    if (activeTabId === tabId) return;
    ipcRenderer.send('switch-tab', tabId);
  });

  // Close tab on close button click
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    ipcRenderer.send('close-tab', tabId);
  });

  return tab;
}

// Set active tab and update UI
function setActiveTab(tabId) {
  if (activeTabId !== null) {
    const prevTab = tabs.get(activeTabId);
    if (prevTab) prevTab.classList.remove('active');
    // Save current urlInput value for previous tab
    urlInputValues.set(activeTabId, urlInput.value);
  }
  const newTab = tabs.get(tabId);
  if (newTab) newTab.classList.add('active');
  activeTabId = tabId;

  // Restore urlInput value for the new active tab
  urlInput.value = urlInputValues.get(tabId) || '';

  // Scroll active tab into view smoothly
  newTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });

  // Update URL bar and tab title if we have saved info
  if (tabTitles.has(tabId)) {
    const titleSpan = newTab.querySelector('.tab-title');
    titleSpan.innerText = tabTitles.get(tabId);
  }
}

// Update tab title dynamically
ipcRenderer.on('update-tab-title', (event, { tabId, title }) => {
  tabTitles.set(tabId, title);
  const tab = tabs.get(tabId);
  if (tab) {
    const titleSpan = tab.querySelector('.tab-title');
    titleSpan.innerText = title;
  }
});

// New tab event: create tab element & activate
ipcRenderer.on('new-tab', (event, tabId) => {
  if (tabs.has(tabId)) return;
  const tab = createTabElement(tabId);
  tabs.set(tabId, tab);
  tabBar.appendChild(tab);
  setActiveTab(tabId);
});

// Switch tab event
ipcRenderer.on('switch-tab', (event, tabId) => {
  setActiveTab(tabId);
});

// Close tab event
ipcRenderer.on('close-tab', (event, tabId) => {
  const tab = tabs.get(tabId);
  if (tab) {
    tabBar.removeChild(tab);
    tabs.delete(tabId);
    urlInputValues.delete(tabId);
    tabTitles.delete(tabId);

    if (activeTabId === tabId) {
      const remainingTabs = Array.from(tabs.keys());
      if (remainingTabs.length > 0) {
        ipcRenderer.send('switch-tab', remainingTabs[0]);
      } else {
        activeTabId = null;
        urlInput.value = '';
      }
    }
  }
});

// Navigation handlers
navigateBtn.addEventListener('click', () => {
  ipcRenderer.send('navigate', urlInput.value);
});

document.getElementById('back').addEventListener('click', () => {
  ipcRenderer.send('go-back');
});

document.getElementById('forward').addEventListener('click', () => {
  ipcRenderer.send('go-forward');
});

document.getElementById('reload').addEventListener('click', () => {
  ipcRenderer.send('reload');
});

document.getElementById('new-tab').addEventListener('click', () => {
  ipcRenderer.send('new-tab');
});

// Toolbar mute button event
const toggleMuteBtn = document.getElementById('toggle-mute');
if (toggleMuteBtn) {
  toggleMuteBtn.remove();
}

// Remove all mute related ipcRenderer listeners
ipcRenderer.removeAllListeners('update-tab-muted');
ipcRenderer.removeAllListeners('response-mute-state');
ipcRenderer.removeAllListeners('switch-tab');

// Update URL input when page URL changes
ipcRenderer.on('update-url', (event, url) => {
  urlInput.value = url;
  if (activeTabId !== null) {
    urlInputValues.set(activeTabId, url);
  }
});

// Enter key triggers navigation
urlInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    ipcRenderer.send('navigate', urlInput.value);
  }
});

// Save URL input as user types
urlInput.addEventListener('input', () => {
  if (activeTabId !== null) {
    urlInputValues.set(activeTabId, urlInput.value);
  }
});

// Keyboard shortcuts (Ctrl+T = new tab, Ctrl+W = close tab)
window.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === 't') {
    ipcRenderer.send('new-tab');
    event.preventDefault();
  }
  if (event.ctrlKey && event.key.toLowerCase() === 'w') {
    if (activeTabId !== null) {
      ipcRenderer.send('close-tab', activeTabId);
    }
    event.preventDefault();
  }
});

// Context menu for tabs (right-click)
tabBar.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  const targetTab = event.target.closest('.tab');
  if (!targetTab) return;

  const tabId = Number(targetTab.dataset.tabId);

  const menu = new remote.Menu();

  menu.append(new remote.MenuItem({
    label: 'Close Tab',
    click: () => {
      ipcRenderer.send('close-tab', tabId);
    }
  }));

  // Removed the right-click mute menu item as mute button is added on tabs

  menu.append(new remote.MenuItem({
    label: 'Close Other Tabs',
    click: () => {
      const allTabs = Array.from(tabs.keys());
      allTabs.forEach(id => {
        if (id !== tabId) {
          ipcRenderer.send('close-tab', id);
        }
      });
    }
  }));

  menu.append(new remote.MenuItem({
    label: 'New Tab',
    click: () => {
      ipcRenderer.send('new-tab');
    }
  }));

  menu.popup({ window: remote.getCurrentWindow() });
});

// Update tab muted state UI
ipcRenderer.on('update-tab-muted', (event, { tabId, muted }) => {
  const tab = tabs.get(tabId);
  if (tab) {
    const muteBtn = tab.querySelector('.tab-mute i');
    if (muted) {
      tab.classList.add('muted');
      if (muteBtn) {
        muteBtn.classList.remove('fa-volume-up');
        muteBtn.classList.add('fa-volume-mute');
      }
    } else {
      tab.classList.remove('muted');
      if (muteBtn) {
        muteBtn.classList.remove('fa-volume-mute');
        muteBtn.classList.add('fa-volume-up');
      }
    }
  }
});
