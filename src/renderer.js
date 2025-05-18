const { ipcRenderer } = require('electron');

document.getElementById('navigate').addEventListener('click', () => {
    const url = document.getElementById('url-input').value;
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
