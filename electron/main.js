const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('kiosk-printing');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'icons/icons/win/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  mainWindow.maximize();
  mainWindow.show();

  const startUrl = process.env.ELECTRON_START_URL || 'https://eventsflow-swart.vercel.app/login';
  mainWindow.loadURL(startUrl);
  mainWindow.setMenuBarVisibility(false);

  // Injeta flag no window após carregar a página
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      window.__IS_ELECTRON__ = true;
    `);
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

ipcMain.handle('print-silent', async () => {
  if (!mainWindow) return;
  return new Promise((resolve) => {
    mainWindow.webContents.print({ silent: true, printBackground: true }, (success, errorType) => {
      resolve({ success, errorType });
    });
  });
});

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});