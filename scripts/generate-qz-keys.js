const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

console.log("QZ Tray Cryptography: Iniciando geração de chaves...");

const attrs = [
  { name: 'CN', value: 'Flow Events PDV' },
  { name: 'C', value: 'BR' },
  { name: 'ST', value: 'SP' },
  { name: 'L', value: 'Sao Paulo' },
  { name: 'O', value: 'Flow Events' },
  { name: 'OU', value: 'Development' }
];

async function run() {
  try {
    const notAfterDate = new Date();
    notAfterDate.setFullYear(notAfterDate.getFullYear() + 10);

    // Gera chaves RSA 2048 e certificado X.509 de 10 anos
    const pems = await selfsigned.generate(attrs, {
      keySize: 2048,
      notAfterDate: notAfterDate,
      algorithm: 'sha512'
    });

  const certPath = path.join(__dirname, '../src/config/qz-certificate.ts');
  const envPath = path.join(__dirname, '../.env');
  const overridePath = path.join(__dirname, '../public/override.crt');

  // 1. Garantir que as pastas existam
  fs.mkdirSync(path.dirname(certPath), { recursive: true });
  fs.mkdirSync(path.dirname(overridePath), { recursive: true });

  // 2. Escrever o qz-certificate.ts público
  const certContent = `// Certificado Digital Público X.509 Autoassinado para o QZ Tray
// Gerado automaticamente em ${new Date().toISOString()}

export const QZ_CERTIFICATE = \`${pems.cert.trim()}\`;
`;
  fs.writeFileSync(certPath, certContent, 'utf8');
  console.log("✔ Arquivo 'src/config/qz-certificate.ts' gerado com sucesso.");

  // 3. Escrever o override.crt público para o QZ Tray do caixa
  fs.writeFileSync(overridePath, pems.cert.trim(), 'utf8');
  console.log("✔ Arquivo 'public/override.crt' gerado com sucesso.");

  // 4. Injetar ou atualizar a chave privada no arquivo .env
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Prepara a chave privada limpando quebras para caber no .env em uma única linha com \n literais
  // Substituindo \r\n e \n por \\n literal para evitar quebra de parsing no Next.js/Vercel
  const formattedPrivateKey = pems.private.trim().replace(/\r?\n/g, '\\n');

  if (envContent.includes('PRIVATE_KEY=')) {
    // Substitui a existente
    envContent = envContent.replace(/PRIVATE_KEY=.*/, `PRIVATE_KEY="${formattedPrivateKey}"`);
  } else {
    // Adiciona ao final
    envContent += envContent.endsWith('\n') ? '' : '\n';
    envContent += `\n# Chave privada do QZ Tray para assinatura RSA-SHA512\nPRIVATE_KEY="${formattedPrivateKey}"\n`;
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log("✔ Chave privada RSA gravada em '.env' sob a variável 'PRIVATE_KEY' com sucesso.");
  console.log("\nGeração concluída! Copie o arquivo 'public/override.crt' para a pasta '%APPDATA%\\QZ\\' do Windows.");

  } catch (err) {
    console.error("Erro na geração de chaves criptográficas:", err);
    process.exit(1);
  }
}

run();
