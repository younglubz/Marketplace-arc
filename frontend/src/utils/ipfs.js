/**
 * Serviço para upload de arquivos para IPFS
 * Usa Pinata API (gratuito até 1GB/mês) ou gateway IPFS público
 */

// Configuração do Pinata (opcional - pode deixar vazio para usar gateway público)
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY || ''
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY || ''

// Gateway IPFS público (fallback se Pinata não configurado)
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/'

/**
 * Faz upload de um arquivo para IPFS usando Pinata
 * @param {File} file - Arquivo para fazer upload
 * @returns {Promise<string>} Hash IPFS do arquivo
 */
export const uploadToIPFS = async (file) => {
  try {
    // Debug: verifica se as variáveis estão carregadas
    console.log('🔍 Verificando configuração Pinata...')
    console.log('API Key presente:', !!PINATA_API_KEY, PINATA_API_KEY ? `${PINATA_API_KEY.substring(0, 10)}...` : 'não encontrada')
    console.log('Secret Key presente:', !!PINATA_SECRET_KEY, PINATA_SECRET_KEY ? `${PINATA_SECRET_KEY.substring(0, 10)}...` : 'não encontrada')
    
    // Se Pinata não estiver configurado, usa método alternativo com gateway público
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      console.warn('⚠️ Pinata não configurado. Verifique o arquivo frontend/.env')
      console.warn('Variáveis esperadas: VITE_PINATA_API_KEY e VITE_PINATA_SECRET_KEY')
      return await uploadToIPFSAlternative(file)
    }

    console.log('📤 Fazendo upload para Pinata...')
    
    // Prepara form data
    const formData = new FormData()
    formData.append('file', file)

    // Metadados opcionais
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        timestamp: new Date().toISOString(),
      }
    })
    formData.append('pinataMetadata', metadata)

    // Opções de pinning
    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    })
    formData.append('pinataOptions', pinataOptions)

    // Faz upload para Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Erro no upload Pinata (${response.status})`
      
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error?.reason || errorJson.error?.message || errorText
      } catch {
        errorMessage = errorText || errorMessage
      }
      
      console.error('❌ Erro da API Pinata:', errorMessage)
      throw new Error(`Erro no upload Pinata: ${errorMessage}`)
    }

    const data = await response.json()
    const ipfsHash = data.IpfsHash

    console.log('✅ Upload IPFS concluído:', ipfsHash)
    return ipfsHash

  } catch (error) {
    console.error('❌ Erro ao fazer upload para IPFS:', error)
    console.error('Detalhes do erro:', {
      message: error.message,
      stack: error.stack
    })
    
    // Fallback: tenta método alternativo
    if (error.message && !error.message.includes('alternative')) {
      console.log('🔄 Tentando método alternativo...')
      return await uploadToIPFSAlternative(file)
    }
    
    throw error
  }
}

/**
 * Método alternativo: tenta usar web3.storage se token estiver configurado
 * Se não, informa que precisa configurar Pinata
 */
const uploadToIPFSAlternative = async (file) => {
  const web3StorageToken = import.meta.env.VITE_WEB3_STORAGE_TOKEN
  
  if (web3StorageToken) {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('https://api.web3.storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${web3StorageToken}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        return data.cid
      }
    } catch (error) {
      console.error('Erro ao usar web3.storage:', error)
    }
  }

  // Se chegou aqui, nenhum serviço está configurado
  throw new Error('Configure Pinata API keys no arquivo frontend/.env\n\nVeja IPFS_SETUP.md para instruções.\n\nExemplo:\nVITE_PINATA_API_KEY=sua_key\nVITE_PINATA_SECRET_KEY=sua_secret')
}

/**
 * Faz upload de JSON/metadados para IPFS
 * @param {Object} metadata - Objeto JSON para fazer upload
 * @returns {Promise<string>} Hash IPFS do JSON
 */
export const uploadMetadataToIPFS = async (metadata) => {
  try {
    // Se Pinata não estiver configurado
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      throw new Error('Pinata não configurado. Configure as API keys no .env')
    }

    const jsonString = JSON.stringify(metadata)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const file = new File([blob], 'metadata.json', { type: 'application/json' })

    return await uploadToIPFS(file)

  } catch (error) {
    console.error('Erro ao fazer upload de metadados:', error)
    throw error
  }
}

/**
 * Converte hash IPFS para URL completa
 * @param {string} ipfsHash - Hash IPFS
 * @returns {string} URL completa do arquivo
 */
export const getIPFSUrl = (ipfsHash) => {
  if (!ipfsHash) return ''
  // Remove 'ipfs://' se presente
  const hash = ipfsHash.replace(/^ipfs:\/\//, '')
  return `${IPFS_GATEWAY}${hash}`
}

/**
 * Verifica se uma string é um hash IPFS válido
 * @param {string} hash - Hash para verificar
 * @returns {boolean}
 */
export const isValidIPFSHash = (hash) => {
  if (!hash) return false
  // Hash IPFS geralmente começa com Qm (CIDv0) ou tem formato específico (CIDv1)
  const ipfsPattern = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58}|z[1-9a-km-zA-HJ-NP-Z]{58})$/i
  return ipfsPattern.test(hash.replace(/^ipfs:\/\//, ''))
}

