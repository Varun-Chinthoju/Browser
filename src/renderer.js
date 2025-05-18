const { ipcRenderer } = require('electron');

const tabBar = document.getElementById('tab-bar');
const urlInput = document.getElementById('url-input');
const navigateBtn = document.getElementById('navigate');

let activeTabId = null;
const tabs = new Map();
const urlInputValues = new Map(); // Map to save URL input per tab

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
        if (e.target === closeBtn) return; // Ignore if close button clicked
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

    // Restore urlInput value for new active tab
    if (urlInputValues.has(tabId)) {
        urlInput.value = urlInputValues.get(tabId);
    } else {
        urlInput.value = '';
    }
}

ipcRenderer.on('new-tab', (event, tabId) => {
    if (tabs.has(tabId)) return;
    const tab = createTabElement(tabId);
    tabs.set(tabId, tab);
    tabBar.appendChild(tab);
    setActiveTab(tabId);
});

ipcRenderer.on('switch-tab', (event, tabId) => {
    setActiveTab(tabId);
});

ipcRenderer.on('close-tab', (event, tabId) => {
    const tab = tabs.get(tabId);
    if (tab) {
        tabBar.removeChild(tab);
        tabs.delete(tabId);
        urlInputValues.delete(tabId); // Remove saved URL input for closed tab
        if (activeTabId === tabId) {
            // Set active tab to another tab if any
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

// Existing navigation handlers
navigateBtn.addEventListener('click', () => {
    const url = urlInput.value;
    ipcRenderer.send('navigate', url);
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

// Listen for URL update events to update the URL input field and save per tab
ipcRenderer.on('update-url', (event, url) => {
    urlInput.value = url;
    if (activeTabId !== null) {
        urlInputValues.set(activeTabId, url);
    }
});

// Support pressing Enter key in the URL input to trigger navigation
urlInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const url = urlInput.value;
        ipcRenderer.send('navigate', url);
    }
});

// Save urlInput changes on input event to keep state updated
urlInput.addEventListener('input', () => {
    if (activeTabId !== null) {
        urlInputValues.set(activeTabId, urlInput.value);
    }
});
