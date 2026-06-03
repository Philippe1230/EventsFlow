const { app, BrowserWindow } = require('electron');
const path = require('path');

// Adiciona as switches de linha de comando para permitir a impressão silenciosa (Kiosk Printing)
// --kiosk-printing envia o trabalho de impressão direto para a impressora padrão do Windows
app.commandLine.appendSwitch('kiosk-printing');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
  });

  mainWindow.maximize();
  mainWindow.show();

  const startUrl = process.env.ELECTRON_START_URL || 'https://eventsflow-swart.vercel.app/login';

  mainWindow.loadURL(startUrl);

  // Remove a barra de menus do navegador para visual limpo de App Nativo
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

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