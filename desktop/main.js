const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

// Handle deep link protocol: dypu-connect://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('dypu-connect', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('dypu-connect');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    title: "DYPU Connect",
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0f0f0f',
    // ── Modern Frameless UI ──
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f0f0f',
      symbolColor: '#71717a',
      height: 35
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  mainWindow.loadURL('https://dypu-connect.netlify.app/');

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Force auth popups to open in the system browser
    if (url.includes('google.com') || url.includes('github.com') || url.includes('firebaseapp.com')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Handle protocol activation
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

function handleDeepLink(url) {
  if (mainWindow && url.startsWith('dypu-connect://')) {
    mainWindow.webContents.send('auth-callback', url);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      // Windows deep link handling via command line
      const url = commandLine.pop();
      if (url.startsWith('dypu-connect://')) {
        handleDeepLink(url);
      }
    }
  });

  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
