import { useState } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { useWeb3 } from '../context/Web3Context'
import { useNavigate } from 'react-router-dom'
import { CONTRACT_ADDRESSES } from '../config/contracts'
import { uploadToIPFS, getIPFSUrl, uploadMetadataToIPFS } from '../utils/ipfs'

function Create() {
  const { nftContract, account, isCorrectNetwork } = useWeb3()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    price: '',
    supply: '1',
    twitter: '',
    discord: '',
    instagram: '',
    website: ''
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageIPFSHash, setImageIPFSHash] = useState(null) // Hash IPFS da imagem
  const [minting, setMinting] = useState(false)
  const [uploading, setUploading] = useState(false) // Estado de upload para IPFS
  const [showSocialLinks, setShowSocialLinks] = useState(false)
  const [autoList, setAutoList] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // Função para comprimir e redimensionar imagem (compressão agressiva)
  const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.75) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const img = new Image()
        
        img.onload = () => {
          // Calcula novas dimensões mantendo proporção (mais agressivo)
          let width = img.width
          let height = img.height
          
          // Redimensiona se for maior que o máximo
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width
              width = maxWidth
            } else {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }
          
          // Cria canvas para redimensionar
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          
          // Melhora qualidade de renderização
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          
          // Desenha imagem redimensionada
          ctx.drawImage(img, 0, 0, width, height)
          
          // Tenta comprimir, se ainda for muito grande, comprime mais
          const tryCompress = (currentQuality) => {
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  // Se ainda for maior que 100KB, comprime mais agressivamente
                  if (blob.size > 100 * 1024 && currentQuality > 0.5) {
                    tryCompress(currentQuality - 0.1)
                  } else {
                    // Se ainda for muito grande, reduz dimensões
                    if (blob.size > 150 * 1024 && (width > 800 || height > 800)) {
                      const newMaxWidth = Math.max(800, width * 0.8)
                      const newMaxHeight = Math.max(800, height * 0.8)
                      
                      const newCanvas = document.createElement('canvas')
                      newCanvas.width = newMaxWidth
                      newCanvas.height = newMaxHeight
                      const newCtx = newCanvas.getContext('2d')
                      newCtx.imageSmoothingEnabled = true
                      newCtx.imageSmoothingQuality = 'high'
                      newCtx.drawImage(canvas, 0, 0, newMaxWidth, newMaxHeight)
                      
                      newCanvas.toBlob(
                        (finalBlob) => {
                          if (finalBlob) {
                            const finalReader = new FileReader()
                            finalReader.onloadend = () => {
                              resolve({
                                dataUrl: finalReader.result,
                                size: finalBlob.size,
                                originalSize: file.size
                              })
                            }
                            finalReader.onerror = reject
                            finalReader.readAsDataURL(finalBlob)
                          } else {
                            reject(new Error('Falha ao comprimir imagem'))
                          }
                        },
                        'image/jpeg',
                        0.7
                      )
                    } else {
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        resolve({
                          dataUrl: reader.result,
                          size: blob.size,
                          originalSize: file.size
                        })
                      }
                      reader.onerror = reject
                      reader.readAsDataURL(blob)
                    }
                  }
                } else {
                  reject(new Error('Falha ao comprimir imagem'))
                }
              },
              'image/jpeg', // Sempre converte para JPEG para melhor compressão
              currentQuality
            )
          }
          
          tryCompress(quality)
        }
        
        img.onerror = reject
        img.src = e.target.result
      }
      
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (file) {
      // Verifica se é uma imagem
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de imagem')
        return
      }

      // Verifica o tamanho (máximo 20MB)
      if (file.size > 20 * 1024 * 1024) {
        toast.error('A imagem deve ter menos de 20MB')
        return
      }

      try {
        setUploading(true)
        
        // Primeiro comprime a imagem
        toast.loading('Comprimindo imagem...', { id: 'upload' })
        const compressed = await compressImage(file)
        
        console.log(`Imagem comprimida: ${(compressed.originalSize / 1024).toFixed(2)}KB -> ${(compressed.size / 1024).toFixed(2)}KB`)
        
        // Converte base64 para blob para fazer upload
        const base64Response = await fetch(compressed.dataUrl)
        const blob = await base64Response.blob()
        const compressedFile = new File([blob], file.name, { type: blob.type })
        
        // Faz upload para IPFS
        toast.loading('Fazendo upload para IPFS...', { id: 'upload' })
        const ipfsHash = await uploadToIPFS(compressedFile)
        const ipfsUrl = getIPFSUrl(ipfsHash)
        
        console.log('Imagem enviada para IPFS:', ipfsHash)
        console.log('URL IPFS:', ipfsUrl)
        
        // Atualiza estados
        setImageFile(file)
        setImagePreview(compressed.dataUrl) // Preview local
        setImageIPFSHash(ipfsHash) // Hash IPFS
        
        toast.success(`Imagem enviada para IPFS! (${((1 - compressed.size / compressed.originalSize) * 100).toFixed(0)}% menor)`, { 
          id: 'upload',
          duration: 5000
        })
      } catch (error) {
        console.error('Erro ao processar/upload imagem:', error)
        
        // Se falhar no IPFS, ainda permite usar base64 como fallback
        if (error.message.includes('IPFS') || error.message.includes('Pinata')) {
          toast.error('Erro ao fazer upload para IPFS. Usando compressão local...', { 
            id: 'upload',
            duration: 6000 
          })
          
          // Fallback: usa compressão local
          try {
            const compressed = await compressImage(file)
            setImageFile(file)
            setImagePreview(compressed.dataUrl)
            setImageIPFSHash(null) // Sem hash IPFS, usará base64
          } catch (compressError) {
            toast.error('Erro ao processar imagem. Tente novamente.', { id: 'upload' })
          }
        } else {
          toast.error('Erro ao processar imagem. Tente novamente.', { id: 'upload' })
        }
      } finally {
        setUploading(false)
      }
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageIPFSHash(null)
    setFormData({ ...formData, imageUrl: '' })
    setUploading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!account) {
      toast.error('Conecte sua carteira primeiro')
      return
    }

    if (!isCorrectNetwork) {
      toast.error('Por favor, conecte-se à Arc Testnet')
      return
    }

    if (!nftContract) {
      toast.error('Contrato não inicializado. Conecte sua carteira novamente.', { duration: 6000 })
      console.error('nftContract é null ou undefined')
      return
    }

    // Verifica se o provider está disponível
    try {
      if (!nftContract.runner || !nftContract.runner.provider) {
        toast.error('Provider não disponível. Reconecte sua carteira.', { duration: 6000 })
        console.error('Provider não disponível no contrato')
        return
      }
    } catch (providerError) {
      console.error('Erro ao verificar provider:', providerError)
      toast.error('Erro ao verificar conexão. Reconecte sua carteira.', { duration: 6000 })
      return
    }

    if (!formData.name || !formData.description) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (!imagePreview && !formData.imageUrl && !imageIPFSHash) {
      toast.error('Por favor, adicione uma imagem para o NFT')
      return
    }

    if (uploading) {
      toast.error('Aguarde o upload da imagem terminar')
      return
    }

    const supply = parseInt(formData.supply) || 1
    if (supply < 1 || supply > 100) {
      toast.error('Supply deve estar entre 1 e 100')
      return
    }

    try {
      setMinting(true)
      const mintCount = supply
      
      toast.loading(`Criando ${mintCount} NFT${mintCount > 1 ? 's' : ''}...`, { id: 'mint' })

      // Determina a URL da imagem (prioriza IPFS, depois URL externa, depois base64)
      let imageUrl = ''
      if (imageIPFSHash) {
        // Usa URL IPFS se disponível
        imageUrl = getIPFSUrl(imageIPFSHash)
        console.log('Usando imagem IPFS:', imageUrl)
      } else if (formData.imageUrl) {
        // Usa URL externa se fornecida
        imageUrl = formData.imageUrl
        console.log('Usando URL externa:', imageUrl)
      } else if (imagePreview && imagePreview.startsWith('data:')) {
        // Fallback: usa base64 (não recomendado para produção)
        console.warn('Usando base64 inline (não recomendado para produção)')
        imageUrl = imagePreview
      }

      // Cria um JSON com os metadados incluindo redes sociais e preço
      const metadata = {
        name: formData.name,
        description: formData.description,
        image: imageUrl,
        external_url: formData.website || '',
        initial_price: formData.price || '0',
        supply: supply,
        attributes: [],
        social_links: {
          twitter: formData.twitter || '',
          discord: formData.discord || '',
          instagram: formData.instagram || ''
        }
      }

      // Faz upload dos metadados para IPFS também (melhor prática)
      let tokenURI = ''
      try {
        toast.loading('Fazendo upload de metadados para IPFS...', { id: 'mint' })
        const metadataHash = await uploadMetadataToIPFS(metadata)
        tokenURI = getIPFSUrl(metadataHash)
        console.log('Metadados enviados para IPFS:', metadataHash)
      } catch (ipfsError) {
        console.warn('Erro ao fazer upload de metadados para IPFS, usando JSON inline:', ipfsError)
        // Fallback: usa JSON inline se IPFS falhar
        tokenURI = JSON.stringify(metadata)
        
        // Aviso se usar base64
        if (imageUrl.startsWith('data:')) {
          const tokenURISizeKB = (tokenURI.length / 1024).toFixed(2)
          if (tokenURI.length > 200000) {
            toast.error('Metadados muito grandes! Configure IPFS para usar imagens grandes.', { duration: 8000 })
            setMinting(false)
            return
          }
        }
      }

      // Verifica saldo antes de mintar
      try {
        const balance = await nftContract.runner.provider.getBalance(account)
        if (balance === 0n) {
          toast.error('Você não tem saldo de USDC para pagar o gas!', { id: 'mint', duration: 5000 })
          setMinting(false)
          return
        }
      } catch (e) {
        console.warn('Não foi possível verificar saldo:', e)
      }

      // Verifica se o contrato existe antes de tentar mintar
      console.log('=== DEBUG INFO ===')
      console.log('NFT Contract address:', CONTRACT_ADDRESSES.mockNFT)
      console.log('NFT Contract instance:', nftContract)
      console.log('Account:', account)
      console.log('Token URI length:', tokenURI.length)
      
      try {
        // Tenta verificar se o contrato tem código
        const contractCode = await nftContract.runner.provider.getCode(CONTRACT_ADDRESSES.mockNFT)
        console.log('Contract code exists:', contractCode !== '0x', 'Length:', contractCode?.length || 0)
        
        if (contractCode === '0x') {
          throw new Error('Contrato não encontrado no endereço fornecido')
        }
      } catch (codeError) {
        console.error('Erro ao verificar código do contrato:', codeError)
        throw new Error(`Contrato não acessível: ${codeError.message}`)
      }

      // Tenta fazer uma estimativa de gas primeiro
      try {
        console.log('Estimando gas para mint...')
        const gasEstimate = await nftContract.mint.estimateGas(account, tokenURI)
        console.log('Gas estimate:', gasEstimate.toString())
      } catch (estimateError) {
        console.error('Erro ao estimar gas:', estimateError)
        console.error('Erro completo:', JSON.stringify(estimateError, null, 2))
        // Não bloqueia, apenas loga
      }

      // Cria apenas 1 NFT que representa a coleção/projeto
      // O supply indica quantas unidades a coleção terá, não quantos NFTs criar agora
      toast.loading(supply > 1 ? `Criando projeto/coleção com ${supply} unidades...` : 'Criando NFT...', { id: 'mint' })
      
      try {
        console.log(`Criando ${supply > 1 ? 'coleção' : 'NFT'}...`)
        const tx = await nftContract.mint(account, tokenURI)
        console.log('Transação enviada:', tx.hash)
        await tx.wait()
        console.log(`${supply > 1 ? 'Coleção' : 'NFT'} criado com sucesso!`)
      } catch (mintError) {
        console.error(`Erro ao criar ${supply > 1 ? 'coleção' : 'NFT'}:`, mintError)
        console.error('Erro completo:', JSON.stringify(mintError, Object.getOwnPropertyNames(mintError), 2))
        throw new Error(`Falha ao criar ${supply > 1 ? 'coleção' : 'NFT'}: ${mintError.message}`)
      }

      if (supply > 1) {
        toast.success(`Projeto/coleção criado com sucesso! Esta coleção terá ${supply} unidades.`, { id: 'mint', duration: 6000 })
      } else {
        toast.success(`NFT criado com sucesso!`, { id: 'mint' })
      }
      
      // Se tiver preço e auto-list estiver marcado, redireciona com mensagem
      if (formData.price && parseFloat(formData.price) > 0 && autoList) {
        toast.success('Vá em "My NFTs" para listar seus NFTs para venda!', { duration: 5000 })
      }
      
      // Limpa o formulário
      setFormData({
        name: '',
        description: '',
        imageUrl: '',
        price: '',
        supply: '1',
        twitter: '',
        discord: '',
        instagram: '',
        website: ''
      })
      setImageFile(null)
      setImagePreview(null)
      setImageIPFSHash(null)
      setShowSocialLinks(false)
      setAutoList(false)

      // Redireciona para Meus NFTs após 2 segundos
      setTimeout(() => {
        navigate('/my-nfts')
      }, 2000)

    } catch (error) {
      console.error('Error minting NFT:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        data: error.data,
        reason: error.reason,
        error: error.error,
        transaction: error.transaction
      })
      
      // Mensagens de erro mais específicas
      let errorMessage = 'Erro ao criar NFT'
      let showDetails = false
      
      if (error.message?.includes('user rejected') || error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage = 'Transação rejeitada pelo usuário'
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('insufficient balance')) {
        errorMessage = 'Saldo insuficiente de USDC para pagar gas. Obtenha USDC na Arc Testnet.'
      } else if (error.message?.includes('missing revert data') || error.message?.includes('estimateGas') || error.message?.includes('execution reverted')) {
        errorMessage = '⚠️ Erro ao executar transação. Verifique: 1) Se está na Arc Testnet, 2) Se tem saldo suficiente, 3) Veja o console para mais detalhes.'
        showDetails = true
      } else if (error.message?.includes('Contrato não encontrado') || error.message?.includes('Contrato não acessível')) {
        errorMessage = '⚠️ Contrato não encontrado. Verifique se os contratos foram deployados corretamente.'
        showDetails = true
      } else if (error.code === 'NETWORK_ERROR' || error.code === 'NETWORK_ERROR') {
        errorMessage = 'Erro de rede. Verifique sua conexão com Arc Testnet'
      } else if (error.message?.includes('nonce')) {
        errorMessage = 'Erro de nonce. Aguarde alguns segundos e tente novamente'
      } else if (error.message?.includes('0x0000000000000000000000000000000000000000')) {
        errorMessage = '⚠️ Endereços dos contratos não configurados! Veja o console.'
        showDetails = true
      } else if (error.reason) {
        errorMessage = `Erro: ${error.reason}`
      } else if (error.message) {
        errorMessage = `Erro: ${error.message.substring(0, 200)}`
        showDetails = true
      }
      
      toast.error(errorMessage, { 
        id: 'mint', 
        duration: showDetails ? 10000 : 5000 
      })
      
      if (showDetails) {
        console.error('=== DETALHES DO ERRO ===')
        console.error('Mensagem completa:', error)
        console.error('Stack trace:', error.stack)
      }
    } finally {
      setMinting(false)
    }
  }

  // Verifica se os contratos estão configurados
  const contractsNotConfigured = 
    CONTRACT_ADDRESSES.marketplace === '0x0000000000000000000000000000000000000000' ||
    CONTRACT_ADDRESSES.mockNFT === '0x0000000000000000000000000000000000000000'

  if (!account) {
    return (
      <div className="container">
        <div className="loading">
          <h2>Conecte sua carteira para criar NFTs</h2>
          <p className="text-secondary mt-2">
            Clique em "Connect Wallet" no topo da página
          </p>
        </div>
      </div>
    )
  }

  if (contractsNotConfigured) {
    return (
      <div className="container">
        <div style={{ padding: '3rem 0', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: 'var(--surface)',
            border: '2px solid var(--error)',
            borderRadius: '16px',
            padding: '2.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--error)' }}>
              Contratos Não Configurados
            </h2>
            <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
              Os smart contracts ainda não foram deployados na Arc Testnet. 
              Você precisa fazer o deploy antes de criar NFTs.
            </p>

            <div style={{
              background: 'var(--border-light)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'left',
              marginBottom: '2rem'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                📋 Passos para Deploy:
              </h3>
              <ol style={{ 
                paddingLeft: '1.5rem', 
                color: 'var(--text-secondary)',
                lineHeight: '1.8',
                margin: 0
              }}>
                <li>Obtenha USDC na Arc Testnet (contate equipe Arc)</li>
                <li>Configure arquivo <code style={{ 
                  background: 'var(--surface)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  color: 'var(--primary)',
                  fontSize: '0.9375rem'
                }}>.env</code> com sua PRIVATE_KEY</li>
                <li>Execute: <code style={{ 
                  background: 'var(--surface)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  color: 'var(--primary)',
                  fontSize: '0.9375rem'
                }}>npm run compile</code></li>
                <li>Execute: <code style={{ 
                  background: 'var(--surface)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  color: 'var(--primary)',
                  fontSize: '0.9375rem'
                }}>npm run deploy</code></li>
                <li>Atualize endereços em <code style={{ 
                  background: 'var(--surface)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  color: 'var(--primary)',
                  fontSize: '0.9375rem'
                }}>frontend/src/config/contracts.js</code></li>
              </ol>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="https://github.com/yourusername/Marketplace-arc#deploy"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                📖 Ver Guia Completo
              </a>
              <button
                className="btn btn-secondary"
                onClick={() => window.location.reload()}
              >
                🔄 Recarregar Página
              </button>
            </div>

            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--text-muted)', 
              marginTop: '2rem',
              fontStyle: 'italic' 
            }}>
              💡 Dica: Consulte o arquivo DEPLOY_GUIDE.md para instruções detalhadas
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <section style={{ padding: '3rem 0', maxWidth: '600px', margin: '0 auto' }}>
        <h1 className="section-title">Create New Item</h1>
        <p className="section-subtitle">
          Turn your digital creation into a unique NFT
        </p>

        <form onSubmit={handleSubmit} className="card">
          {/* Image Upload Section */}
          <div className="form-group">
            <label className="form-label">Image, Video, Audio, or 3D Model *</label>
            <p className="text-muted" style={{ fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
              File types supported: JPG, PNG, GIF, SVG, MP4, WEBM, MP3, WAV, OGG, GLB, GLTF. Max size: 20 MB
            </p>
            
            <div 
              className="image-upload-area"
              onClick={() => document.getElementById('image-upload-input').click()}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: '12px',
                padding: imagePreview ? '0' : '3rem 2rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: imagePreview ? 'transparent' : 'var(--border-light)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.style.borderColor = 'var(--primary)'
                e.currentTarget.style.background = 'rgba(32, 129, 226, 0.05)'
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'var(--border-light)'
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'var(--border-light)'
                const file = e.dataTransfer.files[0]
                if (file) {
                  const fakeEvent = { target: { files: [file] } }
                  handleImageUpload(fakeEvent)
                }
              }}
            >
              {imagePreview ? (
                <div style={{ position: 'relative' }}>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    style={{ 
                      width: '100%', 
                      borderRadius: '12px',
                      display: 'block'
                    }} 
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage()
                    }}
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      background: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>
                    📁
                  </div>
                  <p style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Drag and drop file
                  </p>
                  <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                    or browse media on your device
                  </p>
                  <button 
                    type="button"
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      document.getElementById('image-upload-input').click()
                    }}
                  >
                    Choose File
                  </button>
                </>
              )}
            </div>
            
            <input
              id="image-upload-input"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Name *</label>
            <input
              type="text"
              name="name"
              className="form-input"
              placeholder="Item name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea
              name="description"
              className="form-textarea"
              placeholder="Provide a detailed description of your item"
              value={formData.description}
              onChange={handleChange}
              required
              rows="4"
            />
          </div>

          {/* Supply (Quantity) */}
          <div className="form-group">
            <label className="form-label">Supply *</label>
            <input
              type="number"
              name="supply"
              className="form-input"
              placeholder="1"
              min="1"
              max="100"
              value={formData.supply}
              onChange={handleChange}
              required
            />
            <p className="text-muted" style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
              {formData.supply > 1 
                ? `Este será um projeto/coleção com ${formData.supply} unidades. O primeiro NFT (#1) será criado agora.`
                : 'Criará um NFT único.'}
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">External Link (Optional)</label>
            <input
              type="url"
              name="website"
              className="form-input"
              placeholder="https://yoursite.io/item/123"
              value={formData.website}
              onChange={handleChange}
            />
            <p className="text-muted" style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
              Arc Marketplace will include a link to this URL on the item's detail page
            </p>
          </div>

          {/* Price Section */}
          <div style={{ 
            marginBottom: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border)'
          }}>
            <div className="form-group">
              <label className="form-label">Initial Price (Optional)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  name="price"
                  className="form-input"
                  placeholder="0.0"
                  step="0.001"
                  min="0"
                  value={formData.price}
                  onChange={handleChange}
                  style={{ paddingRight: '4rem' }}
                />
                <span style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  fontWeight: '600',
                  fontSize: '0.9375rem'
                }}>
                  USDC
                </span>
              </div>
              <p className="text-muted" style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                Set an initial listing price. Leave empty to not list immediately.
              </p>
            </div>

            {formData.price && parseFloat(formData.price) > 0 && (
              <div style={{
                background: 'var(--border-light)',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                marginTop: '1rem'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  marginBottom: '0.75rem'
                }}>
                  <input
                    type="checkbox"
                    id="auto-list"
                    checked={autoList}
                    onChange={(e) => setAutoList(e.target.checked)}
                    style={{ 
                      width: '18px', 
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: 'var(--primary)'
                    }}
                  />
                  <label 
                    htmlFor="auto-list" 
                    style={{ 
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '0.9375rem',
                      margin: 0
                    }}
                  >
                    Automatically list for sale after minting
                  </label>
                </div>
                
                <div style={{ paddingLeft: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <span className="text-muted">Listing Price</span>
                    <span style={{ fontWeight: '600' }}>{formData.price || '0'} USDC</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <span className="text-muted">Marketplace Fee (2.5%)</span>
                    <span style={{ fontWeight: '600' }}>{formData.price ? (parseFloat(formData.price) * 0.025).toFixed(4) : '0'} USDC</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border)',
                    fontWeight: '600',
                    fontSize: '0.9375rem'
                  }}>
                    <span>You'll receive</span>
                    <span style={{ color: 'var(--primary)' }}>
                      {formData.price ? (parseFloat(formData.price) * 0.975).toFixed(4) : '0'} USDC
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Social Links Section */}
          <div style={{ 
            marginBottom: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border)'
          }}>
            <div 
              onClick={() => setShowSocialLinks(!showSocialLinks)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                padding: '0.75rem 0'
              }}
            >
              <div>
                <label className="form-label" style={{ cursor: 'pointer', marginBottom: '0.25rem' }}>
                  Social Links (Optional)
                </label>
                <p className="text-muted" style={{ fontSize: '0.8125rem', margin: 0 }}>
                  Add your social media links
                </p>
              </div>
              <span style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>
                {showSocialLinks ? '−' : '+'}
              </span>
            </div>

            {showSocialLinks && (
              <div style={{ 
                marginTop: '1rem',
                padding: '1.5rem',
                background: 'var(--border-light)',
                borderRadius: '12px',
                border: '1px solid var(--border)'
              }}>
                {/* Twitter */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>🐦</span>
                    Twitter
                  </label>
                  <input
                    type="url"
                    name="twitter"
                    className="form-input"
                    placeholder="https://twitter.com/yourusername"
                    value={formData.twitter}
                    onChange={handleChange}
                  />
                </div>

                {/* Discord */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>💬</span>
                    Discord
                  </label>
                  <input
                    type="url"
                    name="discord"
                    className="form-input"
                    placeholder="https://discord.gg/yourserver"
                    value={formData.discord}
                    onChange={handleChange}
                  />
                </div>

                {/* Instagram */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>📸</span>
                    Instagram
                  </label>
                  <input
                    type="url"
                    name="instagram"
                    className="form-input"
                    placeholder="https://instagram.com/yourusername"
                    value={formData.instagram}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem', padding: '1rem', fontSize: '1.0625rem', fontWeight: '600' }}
            disabled={minting}
          >
            {minting ? 'Creating...' : `Create${formData.supply > 1 ? ` ${formData.supply} NFTs` : ' NFT'}`}
          </button>

          <p className="text-muted text-center" style={{ fontSize: '0.8125rem', marginTop: '1rem' }}>
            * Required fields
          </p>
        </form>
      </section>
    </div>
  )
}

export default Create

