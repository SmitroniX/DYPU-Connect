const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  onAuthCallback: (callback) => ipcRenderer.on('auth-callback', (_event, value) => callback(value)),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  vibrate: () => ipcRenderer.send('vibrate'),
  isElectron: true
});
