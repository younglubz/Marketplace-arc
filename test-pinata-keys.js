/**
 * Script para testar se as API keys do Pinata estão corretas
 * Execute: node test-pinata-keys.js
 */

const fs = require('fs');
const path = require('path');

// Carrega as variáveis do .env
const envPath = path.join(__dirname, 'frontend', '.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ Arquivo .env não encontrado em frontend/.env');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

let apiKey = '';
let secretKey = '';

lines.forEach(line => {
  if (line.startsWith('VITE_PINATA_API_KEY=')) {
    apiKey = line.split('=')[1].trim();
  }
  if (line.startsWith('VITE_PINATA_SECRET_KEY=')) {
    secretKey = line.split('=')[1].trim();
  }
});

console.log('🔍 Verificando API Keys do Pinata...\n');

// Validação de formato
console.log('📋 Validação de Formato:');
console.log(`  API Key: ${apiKey ? `${apiKey.substring(0, 10)}... (${apiKey.length} caracteres)` : '❌ NÃO ENCONTRADA'}`);
console.log(`  Secret Key: ${secretKey ? `${secretKey.substring(0, 10)}... (${secretKey.length} caracteres)` : '❌ NÃO ENCONTRADA'}`);

if (!apiKey || !secretKey) {
  console.error('\n❌ Erro: Uma ou ambas as chaves não foram encontradas no arquivo .env');
  process.exit(1);
}

// Verifica formato hexadecimal
const hexPattern = /^[a-f0-9]+$/i;
const apiKeyValid = hexPattern.test(apiKey);
const secretKeyValid = hexPattern.test(secretKey);

console.log(`\n✅ API Key formato válido (hexadecimal): ${apiKeyValid ? 'SIM' : 'NÃO'}`);
console.log(`✅ Secret Key formato válido (hexadecimal): ${secretKeyValid ? 'SIM' : 'NÃO'}`);

// Tenta validar com a API do Pinata
console.log('\n🔐 Testando conexão com API do Pinata...');

const testPinataConnection = async () => {
  try {
    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': secretKey
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Keys VÁLIDAS! Conexão bem-sucedida com Pinata');
      console.log(`   Autenticado como: ${data.message || 'Usuário Pinata'}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`❌ API Keys INVÁLIDAS ou EXPIRADAS`);
      console.error(`   Status: ${response.status}`);
      console.error(`   Erro: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao conectar com Pinata:', error.message);
    console.error('   Verifique sua conexão com a internet');
    return false;
  }
};

// Executa o teste
testPinataConnection().then(success => {
  if (success) {
    console.log('\n✅ Tudo certo! Suas API keys estão funcionando corretamente.');
    process.exit(0);
  } else {
    console.log('\n❌ As API keys não estão funcionando. Verifique:');
    console.log('   1. Se as chaves estão corretas no arquivo .env');
    console.log('   2. Se as chaves não expiraram no painel do Pinata');
    console.log('   3. Se as permissões estão corretas (pinFileToIPFS, pinJSONToIPFS)');
    process.exit(1);
  }
});

