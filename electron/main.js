const { app, BrowserWindow, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');

let mainWindow;
let tray = null;
const isMac = process.platform === 'darwin';

// The desktop shell hosts the live Aide PWA. There is no bundled index.html —
// Aide is a Next.js app, so the renderer always loads the deployed URL.
const APP_URL = process.env.ELECTRON_START_URL || 'https://aide.omixsystems.store';
const ICON_PATH = path.join(__dirname, 'icon.png');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#121217',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: ICON_PATH,
  });

  mainWindow.loadURL(APP_URL);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Open external links (anything off the app origin) in the real browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_URL)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  const image = nativeImage.createFromPath(ICON_PATH).resize({ width: 16, height: 16 });

  tray = new Tray(image);
  tray.setToolTip('Aide');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Aide', click: showWindow },
      { type: 'separator' },
      {
        label: 'Visit Website',
        click: () => shell.openExternal('https://aide.omixsystems.store'),
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ])
  );

  tray.on('click', showWindow);
}

// Only one copy of Aide at a time; a second launch focuses the existing window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', showWindow);

  app.whenReady().then(() => {
    createWindow();
    createTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
