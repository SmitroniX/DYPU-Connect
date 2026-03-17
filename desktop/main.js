const { app, BrowserWindow, shell, ipcMain, dialog, Menu, Tray } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

let mainWindow;
let tray = null;

const WEB_APP_URL = 'https://dypu-connect.netlify.app/';
const INTERNAL_HOSTS = [
  'dypu-connect.netlify.app',
  'dypu-connect.firebaseapp.com',
  'dypu-connect.firebaseio.com',
  'accounts.google.com',
  'google.com',
  'google.co.in'
];

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
    minWidth: 800,
    minHeight: 600,
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
      preload: path.join(__dirname, 'preload.js'),
      // Performance
      backgroundThrottling: false,
      spellcheck: true
    },
  });

  mainWindow.loadURL(WEB_APP_URL);

  // Check for updates once window is ready
  mainWindow.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
    mainWindow.show();
  });

  // ── Navigation & Security ──

  // Prevent internal window from navigating to external sites
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isInternalUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Handle popups and new windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // If it's an internal URL (like a sub-app or specific auth flow we want in app)
    // but usually for Electron, we want EVERYTHING external to go to system browser
    // to keep the app focused and secure.
    if (isInternalUrl(url) && !url.includes('accounts.google.com')) {
      return { action: 'allow' };
    }
    
    // Always open external links and auth providers in system browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // ── Error Handling ──
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL === WEB_APP_URL) {
      log.error(`Failed to load main URL: ${errorDescription} (${errorCode})`);
      // You could load a local error page here:
      // mainWindow.loadFile('error.html');
    }
  });
}

function isInternalUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const host = url.hostname;
    return INTERNAL_HOSTS.some(internal => host === internal || host.endsWith('.' + internal));
  } catch (e) {
    return false;
  }
}

// ── App Lifecycle ──

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

  app.whenReady().then(() => {
    createWindow();
    setupTray();
  });
}

function setupTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => {
      app.isQuiting = true;
      app.quit();
    }}
  ]);
  tray.setToolTip('DYPU Connect');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow.show());
}

function handleDeepLink(url) {
  if (mainWindow) {
    mainWindow.webContents.send('auth-callback', url);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC Communication
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.on('vibrate', () => {
  // Desktop doesn't usually vibrate, but we can flash the taskbar
  if (mainWindow) mainWindow.flashFrame(true);
});
