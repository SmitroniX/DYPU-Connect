const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "DYPU Connect",
    icon: path.join(__dirname, '../public/logo.png'),
    backgroundColor: '#0f0f0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Remove menu bar (Alt will still show it)
  win.setMenuBarVisibility(false);

  // Load the production URL
  win.loadURL('https://dypu-connect.netlify.app/');

  // Open links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle single instance
  const isPrimaryInstance = app.requestSingleInstanceLock();
  if (!isPrimaryInstance) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
      }
    });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
