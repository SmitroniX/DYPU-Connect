const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  onAuthCallback: (callback) => ipcRenderer.on('auth-callback', (_event, value) => callback(value)),
  isElectron: true
});
