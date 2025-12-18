/**
 * Script para testar se as API keys do Pinata estão corretas
 */

const fs = require('fs')
const path = require('path')

// Carrega variáveis de ambiente do arquivo .env
const envPath = path.join(__dirname, '..', 'frontend', '.env')
let apiKey = ''
let secretKey = ''

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    if (line.startsWith('VITE_PINATA_API_KEY=')) {
      apiKey = line.split('=')[1].trim()
    } else if (line.startsWith('VITE_PINATA_SECRET_KEY=')) {
      secretKey = line.split('=')[1].trim()
    }
  }
} else {
  console.error('❌ Arquivo .env não encontrado em frontend/.env')
  process.exit(1)
}

if (!apiKey || !secretKey) {
  console.error('❌ API keys não encontradas no arquivo .env')
  console.error('Certifique-se de que VITE_PINATA_API_KEY e VITE_PINATA_SECRET_KEY estão configuradas')
  process.exit(1)
}

// Valida formato básico
console.log('🔍 Validando formato das keys...')
console.log(`API Key length: ${apiKey.length}`)
console.log(`Secret Key length: ${secretKey.length}`)

const apiKeyValid = /^[a-zA-Z0-9]+$/.test(apiKey) && apiKey.length === 20
const secretKeyValid = /^[a-fA-F0-9]+$/.test(secretKey) && secretKey.length === 64

if (!apiKeyValid) {
  console.error('❌ API Key tem formato inválido. Deve ter 20 caracteres alfanuméricos')
  process.exit(1)
}

if (!secretKeyValid) {
  console.error('❌ Secret Key tem formato inválido. Deve ter 64 caracteres hexadecimais')
  process.exit(1)
}

console.log('✅ Formato das keys está correto\n')

// Testa autenticação na API Pinata
console.log('🔐 Testando autenticação na API Pinata...')

async function testPinataAuth() {
  try {
    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': secretKey
      }
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ Autenticação bem-sucedida!')
      console.log(`📧 Email da conta: ${data.email || 'N/A'}`)
      console.log(`🔑 Permissões: ${JSON.stringify(data.permissions || {})}`)
      return true
    } else {
      console.error('❌ Autenticação falhou!')
      console.error(`Status: ${response.status}`)
      console.error(`Erro: ${JSON.stringify(data, null, 2)}`)
      
      if (response.status === 401) {
        console.error('\n⚠️  Keys inválidas ou expiradas. Verifique:')
        console.error('   1. Se as keys foram copiadas corretamente')
        console.error('   2. Se as keys ainda estão ativas no painel do Pinata')
        console.error('   3. Se há espaços ou caracteres extras')
      }
      
      return false
    }
  } catch (error) {
    console.error('❌ Erro ao testar autenticação:', error.message)
    return false
  }
}

testPinataAuth().then(success => {
  if (success) {
    console.log('\n🎉 Todas as verificações passaram! As API keys estão corretas.')
    process.exit(0)
  } else {
    console.log('\n⚠️  As keys precisam ser verificadas no painel do Pinata.')
    process.exit(1)
  }
})

