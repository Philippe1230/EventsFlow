const { spawn } = require('child_process');
const path = require('path');

// Define a variável de ambiente indicando a URL local do Next.js
process.env.ELECTRON_START_URL = 'http://localhost:9002';

// Resolve o caminho do binário do electron dependendo do SO
const electronBin = 'electron' + (process.platform === 'win32' ? '.cmd' : '');
const electronPath = path.join(__dirname, '../node_modules/.bin', electronBin);

console.log('Iniciando Electron para desenvolvimento apontando para http://localhost:9002...');

const electronProcess = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env: process.env
});

electronProcess.on('close', (code) => {
  process.exit(code);
});
