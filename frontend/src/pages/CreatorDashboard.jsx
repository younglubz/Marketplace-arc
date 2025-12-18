import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { useWeb3 } from '../context/Web3Context'
import { useNavigate, useParams, Link } from 'react-router-dom'
import CollectionNFTABI from '../abis/CollectionNFT.json'
import { normalizeIPFSUrl, loadMetadataFromURI } from '../utils/ipfs'

function CreatorDashboard() {
  const { collectionAddress } = useParams()
  const navigate = useNavigate()
  const { account, signer, collectionFactoryContract } = useWeb3()
  
  // Estados da coleção
  const [collection, setCollection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Estados de configuração
  const [mintPrice, setMintPrice] = useState('0')
  const [maxMintPerWallet, setMaxMintPerWallet] = useState('0')
  const [royaltyPercent, setRoyaltyPercent] = useState('5')
  const [description, setDescription] = useState('')
  const [collectionImageUrl, setCollectionImageUrl] = useState('')
  
  // Estados de airdrop
  const [airdropAddress, setAirdropAddress] = useState('')
  const [airdropAddresses, setAirdropAddresses] = useState('')
  const [airdropURI, setAirdropURI] = useState('')
  
  // Estados de whitelist
  const [whitelistAddress, setWhitelistAddress] = useState('')
  const [whitelistAddresses, setWhitelistAddresses] = useState('')

  // Função auxiliar para verificar se uma função existe no contrato
  const checkFunctionExists = async (contract, functionName) => {
    try {
      // Verifica se a função existe no contrato ABI
      if (!contract[functionName]) {
        console.log(`Dashboard: Função ${functionName} não existe no ABI`)
        return false
      }
      
      // Verifica se podemos obter o fragmento da função (significa que existe no contrato)
      try {
        const fragment = contract.interface.getFunction(functionName)
        if (fragment) {
          console.log(`Dashboard: Função ${functionName} encontrada no ABI:`, fragment.format())
          return true
        }
      } catch (e) {
        console.log(`Dashboard: Função ${functionName} não encontrada no interface`)
        return false
      }
      
      return true
    } catch (error) {
      console.log(`Dashboard: Erro ao verificar função ${functionName}:`, error.message)
      return false
    }
  }
  
  // Função para testar se setRoyalty realmente funciona (chama o contrato)
  const testSetRoyaltyFunction = async (contract, testReceiver) => {
    try {
      // Tenta estimar gas para setRoyalty - se funcionar, a função existe e é executável
      await contract.setRoyalty.estimateGas(testReceiver, 500)
      return true
    } catch (error) {
      // Se o erro é sobre permissão (onlyOwner), a função existe
      if (error.message?.includes('Ownable') || 
          error.message?.includes('caller is not the owner') ||
          error.message?.includes('OwnableUnauthorizedAccount')) {
        console.log('Dashboard: setRoyalty existe mas requer permissão de owner')
        return true // Função existe, só não temos permissão
      }
      
      // Se o erro é CALL_EXCEPTION com data null, o contrato não tem essa função
      if (error.code === 'CALL_EXCEPTION' && error.data === null) {
        console.log('Dashboard: setRoyalty não existe neste contrato (CALL_EXCEPTION)')
        return false
      }
      
      // Se o erro é sobre royalty muito alto, a função existe
      if (error.message?.includes('Royalty too high')) {
        return true
      }
      
      console.log('Dashboard: Erro ao testar setRoyalty:', error.message)
      // Assumimos que não suporta se não conseguimos verificar
      return false
    }
  }

  // Carrega dados da coleção (compatível com contratos antigos e novos)
  const loadCollection = useCallback(async () => {
    if (!collectionAddress || !signer) {
      console.log('Dashboard: Aguardando signer...', { collectionAddress, hasSigner: !!signer })
      return
    }
    
    try {
      setLoading(true)
      console.log('Dashboard: Carregando coleção:', collectionAddress)
      
      const contract = new ethers.Contract(collectionAddress, CollectionNFTABI, signer)
      
      // Variáveis padrão
      let name = 'Collection'
      let desc = ''
      let image = ''
      let maxSupply = 0
      let totalSupply = 0
      let price = BigInt(0)
      let mintingEnabled = true
      let publicMintEnabled = true
      let whitelistEnabled = false
      let maxPerWallet = 0
      let creator = account
      let createdAt = Math.floor(Date.now() / 1000)
      let isLegacyContract = false
      let supportsRoyalty = false
      
      // Primeiro verifica se é uma coleção válida do CollectionFactory
      let isFromFactory = false
      if (collectionFactoryContract) {
        try {
          isFromFactory = await collectionFactoryContract.isValidCollection(collectionAddress)
          console.log('Dashboard: Coleção do Factory?', isFromFactory)
        } catch (e) {
          console.log('Dashboard: Erro ao verificar Factory:', e.message)
        }
      }
      
      // Verifica se a função setRoyalty existe (teste definitivo para contrato novo)
      try {
        // Primeiro verifica se existe no ABI
        const existsInABI = await checkFunctionExists(contract, 'setRoyalty')
        console.log('Dashboard: setRoyalty existe no ABI?', existsInABI)
        
        if (existsInABI) {
          // Testa se a função realmente funciona no contrato deployado
          supportsRoyalty = await testSetRoyaltyFunction(contract, account)
        } else {
          supportsRoyalty = false
        }
        
        console.log('Dashboard: Contrato suporta setRoyalty?', supportsRoyalty)
      } catch (e) {
        console.log('Dashboard: Erro ao verificar setRoyalty:', e.message)
        supportsRoyalty = false
      }
      
      // Tenta usar getCollectionInfo (contrato novo criado via CollectionFactory)
      let hasGetCollectionInfo = false
      try {
        const info = await contract.getCollectionInfo()
        hasGetCollectionInfo = true
        name = info[0]
        desc = info[1]
        image = info[2]
        maxSupply = info[3]
        totalSupply = info[4]
        price = info[5]
        mintingEnabled = info[6]
        publicMintEnabled = info[7]
        whitelistEnabled = info[8]
        maxPerWallet = info[9]
        creator = info[10]
        createdAt = info[11]
        console.log('Dashboard: ✅ getCollectionInfo() disponível')
      } catch (e) {
        console.log('Dashboard: ⚠️ getCollectionInfo() não disponível')
      }
      
      // Determina se é contrato legado baseado em múltiplos fatores
      // É legado se: não tem getCollectionInfo E não suporta setRoyalty
      // OU se não foi criado via Factory e não suporta setRoyalty
      if (hasGetCollectionInfo && supportsRoyalty) {
        // Contrato novo completo
        isLegacyContract = false
        console.log('Dashboard: ✅ Contrato CollectionNFT completo detectado')
      } else if (supportsRoyalty) {
        // Tem setRoyalty mas não tem getCollectionInfo - pode ser versão intermediária
        isLegacyContract = false
        console.log('Dashboard: ✅ Contrato com suporte a royalty detectado')
        
        // Busca campos individuais
        try { name = await contract.collectionName() } catch {}
        try { creator = await contract.creator() } catch {}
        try { maxSupply = await contract.maxSupply() } catch {}
        try { totalSupply = await contract.totalSupply() } catch {}
        try { price = await contract.mintPrice() } catch { price = BigInt(0) }
        try { mintingEnabled = await contract.mintingEnabled() } catch { mintingEnabled = true }
        try { publicMintEnabled = await contract.publicMintEnabled() } catch { publicMintEnabled = true }
        try { whitelistEnabled = await contract.whitelistEnabled() } catch { whitelistEnabled = false }
        try { maxPerWallet = await contract.maxMintPerWallet() } catch { maxPerWallet = Number(maxSupply) }
      } else {
        // Contrato legado - não suporta setRoyalty
        isLegacyContract = true
        console.log('Dashboard: ❌ Contrato legado detectado (não suporta setRoyalty)')
        
        // Tenta buscar campos básicos que existem em contratos antigos
        try { name = await contract.collectionName() } catch { 
          try { name = await contract.name() } catch {} 
        }
        try { creator = await contract.creator() } catch { 
          try { creator = await contract.owner() } catch { creator = account }
        }
        try { maxSupply = await contract.maxSupply() } catch { maxSupply = 0 }
        try { totalSupply = await contract.totalSupply() } catch { totalSupply = 0 }
        
        // Valores padrão para contrato legado
        price = BigInt(0)
        mintingEnabled = true
        publicMintEnabled = false
        whitelistEnabled = false
        maxPerWallet = Number(maxSupply) || 0
      }
      
      // Se não tiver valores, usa padrão
      if (!desc) desc = ''
      if (!image) image = ''
      
      // Verifica se é o criador
      if (creator.toLowerCase() !== account.toLowerCase()) {
        toast.error('You are not the creator of this collection')
        navigate('/my-nfts')
        return
      }
      
      // Busca royalty info (se disponível)
      let royaltyInfo = { receiver: creator, percentage: 5 }
      try {
        const [receiver, amount] = await contract.royaltyInfo(1, ethers.parseEther('1'))
        royaltyInfo = {
          receiver,
          percentage: Number(ethers.formatEther(amount)) * 100
        }
      } catch (e) {
        console.log('Dashboard: Royalty info não disponível (contrato antigo)')
      }
      
      // Busca earnings (se disponível)
      let earnings = { total: '0', available: '0', withdrawn: '0' }
      try {
        const totalEarnings = await contract.totalEarnings()
        const availableEarnings = await contract.availableEarnings()
        const withdrawnEarnings = await contract.withdrawnEarnings()
        earnings = {
          total: ethers.formatEther(totalEarnings),
          available: ethers.formatEther(availableEarnings),
          withdrawn: ethers.formatEther(withdrawnEarnings)
        }
      } catch (e) {
        console.log('Dashboard: Earnings não disponível (contrato antigo)')
      }
      
      // Busca URIs disponíveis (se disponível)
      let availableURIs = 0
      try {
        availableURIs = Number(await contract.availableURIsCount())
      } catch (e) {
        console.log('Dashboard: URIs count não disponível')
      }
      
      // Busca imagem do primeiro NFT se não tiver imagem da coleção
      if (!image && Number(totalSupply) > 0) {
        try {
          const tokenURI = await contract.tokenURI(1)
          console.log('📋 Dashboard: TokenURI da coleção:', tokenURI.substring(0, 100) + '...')
          
          // Usa função robusta para carregar metadata
          const loadedMetadata = await loadMetadataFromURI(tokenURI)
          
          if (loadedMetadata && loadedMetadata.image) {
            image = loadedMetadata.image
            console.log('✅ Dashboard: Imagem da coleção carregada:', image.substring(0, 80) + '...')
          } else {
            console.warn('⚠️ Dashboard: Metadata carregado mas sem imagem')
          }
        } catch (e) {
          console.warn('❌ Dashboard: Erro ao obter imagem do NFT:', e)
        }
      }
      
      setCollection({
        address: collectionAddress,
        contract,
        name,
        description: desc,
        image,
        maxSupply: Number(maxSupply),
        totalSupply: Number(totalSupply),
        mintPrice: ethers.formatEther(price),
        mintingEnabled,
        publicMintEnabled,
        whitelistEnabled,
        maxMintPerWallet: Number(maxPerWallet),
        creator,
        createdAt: Number(createdAt),
        royalty: royaltyInfo,
        earnings,
        availableURIs,
        isLegacyContract,
        supportsRoyalty
      })
      
      // Atualiza estados de edição
      setMintPrice(ethers.formatEther(price))
      setMaxMintPerWallet(Number(maxPerWallet).toString())
      setRoyaltyPercent(royaltyInfo.percentage.toString())
      setDescription(desc)
      setCollectionImageUrl(image)
      
      console.log('Dashboard: Coleção carregada com sucesso', { name, isLegacyContract, supportsRoyalty })
      
    } catch (error) {
      console.error('Dashboard: Erro ao carregar coleção:', error)
      toast.error('Error loading collection: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [collectionAddress, signer, account, navigate])

  useEffect(() => {
    loadCollection()
  }, [loadCollection])

  // Handlers de atualização
  const handleUpdateMintPrice = async () => {
    if (!collection?.contract) return
    if (collection.isLegacyContract) {
      toast.error('This feature is not available for legacy contracts')
      return
    }
    try {
      setUpdating(true)
      const tx = await collection.contract.setMintPrice(ethers.parseEther(mintPrice))
      toast.loading('Updating mint price...')
      await tx.wait()
      toast.dismiss()
      toast.success('Mint price updated!')
      loadCollection()
    } catch (error) {
      console.error(error)
      toast.error('Error updating mint price')
    } finally {
      setUpdating(false)
    }
  }

  const checkLegacy = () => {
    if (collection?.isLegacyContract) {
      toast.error('This feature is not available for legacy contracts')
      return true
    }
    return false
  }

  const handleUpdateMaxPerWallet = async () => {
    if (!collection?.contract || checkLegacy()) return
    try {
      setUpdating(true)
      const tx = await collection.contract.setMaxMintPerWallet(parseInt(maxMintPerWallet))
      toast.loading('Updating wallet limit...')
      await tx.wait()
      toast.dismiss()
      toast.success('Wallet limit updated!')
      loadCollection()
    } catch (error) {
      console.error(error)
      toast.error('Error updating wallet limit')
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateRoyalty = async () => {
    if (!collection?.contract) return
    
    // Verifica se o contrato suporta royalties
    if (collection.isLegacyContract || !collection.supportsRoyalty) {
      toast.error('This contract does not support royalty updates. Create a new collection via Launchpad to use this feature.')
      return
    }
    
    // Valida o percentual
    const percent = parseFloat(royaltyPercent)
    if (isNaN(percent) || percent < 0 || percent > 10) {
      toast.error('Royalty must be between 0% and 10%')
      return
    }
    
    try {
      setUpdating(true)
      const feeNumerator = Math.round(percent * 100) // Converte % para basis points (5% = 500)
      
      // Usa o creator da coleção para receber os royalties
      // Se não tiver creator definido, usa a conta conectada (que deve ser o criador)
      const royaltyReceiver = collection.creator || account
      
      if (!royaltyReceiver) {
        toast.error('Creator address not found', { id: 'royalty' })
        return
      }
      
      console.log('Dashboard: Atualizando royalty...', {
        receiver: royaltyReceiver,
        feeNumerator,
        percent: `${percent}%`,
        collectionAddress: collection.address
      })
      
      // Primeiro verifica se a função setRoyalty existe no contrato
      if (!collection.contract.setRoyalty) {
        toast.error('This contract does not support royalty updates. It may be an older version.', { id: 'royalty' })
        return
      }
      
      toast.loading(`Setting royalty to ${percent}%...`, { id: 'royalty' })
      
      // Tenta estimar o gas primeiro para detectar erros antes de enviar
      try {
        await collection.contract.setRoyalty.estimateGas(royaltyReceiver, feeNumerator)
      } catch (estimateError) {
        console.error('Gas estimation failed:', estimateError)
        
        // Verifica se é erro de permissão (não é owner)
        if (estimateError.message?.includes('Ownable') || 
            estimateError.message?.includes('caller is not the owner') ||
            estimateError.code === 'CALL_EXCEPTION') {
          toast.error('You are not the owner of this contract. Only the creator can update royalties.', { id: 'royalty' })
          return
        }
        
        // Verifica se o contrato não suporta a função
        if (estimateError.message?.includes('missing revert data') || 
            estimateError.data === null) {
          toast.error('This contract does not support setRoyalty. It may be deployed with an older version.', { id: 'royalty' })
          return
        }
        
        throw estimateError
      }
      
      // Royalty vai para o CRIADOR da coleção
      const tx = await collection.contract.setRoyalty(royaltyReceiver, feeNumerator)
      
      toast.loading('Waiting for confirmation...', { id: 'royalty' })
      await tx.wait()
      
      toast.success(`Royalty updated to ${percent}%! Royalties will go to ${royaltyReceiver.substring(0, 6)}...${royaltyReceiver.substring(38)}`, { id: 'royalty', duration: 6000 })
      loadCollection()
    } catch (error) {
      console.error('Error updating royalty:', error)
      console.error('Error details:', {
        message: error.message,
        reason: error.reason,
        code: error.code,
        data: error.data
      })
      
      // Mensagem de erro mais detalhada
      let errorMessage = 'Error updating royalty'
      if (error.reason) {
        errorMessage = error.reason
      } else if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction was rejected by user'
      } else if (error.message?.includes('Royalty too high')) {
        errorMessage = 'Royalty cannot exceed 10%'
      } else if (error.message?.includes('not the owner') || error.message?.includes('Ownable')) {
        errorMessage = 'Only the collection creator can update royalties'
      } else if (error.message?.includes('execution reverted')) {
        errorMessage = 'Transaction reverted - make sure you are the collection owner'
      } else if (error.message?.includes('missing revert data') || error.code === 'CALL_EXCEPTION') {
        errorMessage = 'This contract does not support this operation. Try creating a new collection.'
      }
      
      toast.error(errorMessage, { id: 'royalty' })
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateMetadata = async () => {
    if (!collection?.contract || checkLegacy()) return
    try {
      setUpdating(true)
      const tx = await collection.contract.setCollectionMetadata(description, collectionImageUrl)
      toast.loading('Updating metadata...')
      await tx.wait()
      toast.dismiss()
      toast.success('Collection metadata updated!')
      loadCollection()
    } catch (error) {
      console.error(error)
      toast.error('Error updating metadata')
    } finally {
      setUpdating(false)
    }
  }

  const handleToggleMinting = async () => {
    if (!collection?.contract || checkLegacy()) return
    try {
      setUpdating(true)
      const tx = await collection.contract.setMintingEnabled(!collection.mintingEnabled)
      toast.loading(collection.mintingEnabled ? 'Disabling minting...' : 'Enabling minting...')
      await tx.wait()
      toast.dismiss()
      toast.success(collection.mintingEnabled ? 'Minting disabled!' : 'Minting enabled!')
      loadCollection()
    } catch (error) {
      console.error(error)
      toast.error('Error toggling minting')
    } finally {
      setUpdating(false)
    }
  }

  const handleTogglePublicMint = async () => {
    if (!collection?.contract || checkLegacy()) return
    try {
      setUpdating(true)
      const tx = await collection.contract.setPublicMintEnabled(!collection.publicMintEnabled)
      toast.loading(collection.publicMintEnabled ? 'Disabling public mint...' : 'Enabling public mint...')
      await tx.wait()
      toast.dismiss()
      toast.success(collection.publicMintEnabled ? 'Public mint disabled!' : 'Public mint enabled!')
      loadCollection()
    } catch (error) {
      console.error(error)
      toast.error('Error toggling public mint')
    } finally {
      setUpdating(false)
    }
  }

  const handleToggleWhitelist = async () => {
    if (!collection?.contract || checkLegacy()) return
    try {
      setUpdating(true)
      const tx = await collection.contract.setWhitelistEnabled(!collection.whitelistEnabled)
      toast.loading(collection.whitelistEnabled ? 'Disabling whitelist...' : 'Enabling whitelist...')
      await tx.wait()
      toast.dismiss()
      toast.success(collection.whitelistEnabled ? 'Whitelist disabled!' : 'Whitelist enabled!')
      loadCollection()
    } catch (error) {
      console.error(error)
      toast.error('Error toggling whitelist')
    } finally {
      setUpdating(false)
    }
  }

  const handleAirdropSingle = async () => {
    if (!collection?.contract || !airdropAddress || !airdropURI) return
    // Airdrop usa mint() que existe no contrato antigo também
    try {
      setUpdating(true)
      // Tenta usar airdrop (contrato novo) ou mint (contrato antigo)
      let tx
      if (collection.isLegacyContract) {
        tx = await collection.contract.mint(airdropAddress, airdropURI)
      } else {
        tx = await collection.contract.airdrop(airdropAddress, airdropURI)
      }
      toast.loading('Processing airdrop...')
      await tx.wait()
      toast.dismiss()
      toast.success('Airdrop sent!')
      setAirdropAddress('')
      setAirdropURI('')
      loadCollection()
    } catch (error) {
      console.error(error)
      toast.error('Error sending airdrop: ' + (error.reason || error.message))
    } finally {
      setUpdating(false)
    }
  }

  const handleAirdropBatch = async () => {
    if (!collection?.contract || !airdropAddresses || !airdropURI) return
    try {
      setUpdating(true)
      const addresses = airdropAddresses.split('\n').map(a => a.trim()).filter(a => a)
      
      if (collection.isLegacyContract) {
        // Contrato antigo: faz mint individual para cada endereço
        toast.loading(`Processing airdrop to ${addresses.length} addresses...`)
        for (const addr of addresses) {
          const tx = await collection.contract.mint(addr, airdropURI)
          await tx.wait()
        }
      } else {
        const tx = await collection.contract.airdropSameURI(addresses, airdropURI)
        toast.loading(`Processing airdrop to ${addresses.length} addresses...`)
        await tx.wait()
      }
      
      toast.dismiss()
      toast.success(`Airdrop sent to ${addresses.length} addresses!`)
      setAirdropAddresses('')
      setAirdropURI('')
      loadCollection()
    } catch (error) {
      console.error(error)
      toast.error('Error sending batch airdrop: ' + (error.reason || error.message))
    } finally {
      setUpdating(false)
    }
  }

  const handleAddToWhitelist = async () => {
    if (!collection?.contract || !whitelistAddress || checkLegacy()) return
    try {
      setUpdating(true)
      const tx = await collection.contract.addToWhitelist(whitelistAddress)
      toast.loading('Adding to whitelist...')
      await tx.wait()
      toast.dismiss()
      toast.success('Address added to whitelist!')
      setWhitelistAddress('')
    } catch (error) {
      console.error(error)
      toast.error('Error adding to whitelist')
    } finally {
      setUpdating(false)
    }
  }

  const handleAddBatchToWhitelist = async () => {
    if (!collection?.contract || !whitelistAddresses || checkLegacy()) return
    try {
      setUpdating(true)
      const addresses = whitelistAddresses.split('\n').map(a => a.trim()).filter(a => a)
      const tx = await collection.contract.addToWhitelistBatch(addresses)
      toast.loading(`Adding ${addresses.length} addresses to whitelist...`)
      await tx.wait()
      toast.dismiss()
      toast.success(`${addresses.length} addresses added to whitelist!`)
      setWhitelistAddresses('')
    } catch (error) {
      console.error(error)
      toast.error('Error adding batch to whitelist')
    } finally {
      setUpdating(false)
    }
  }

  const handleWithdrawEarnings = async () => {
    if (!collection?.contract || checkLegacy()) return
    try {
      setUpdating(true)
      const tx = await collection.contract.withdrawEarnings()
      toast.loading('Withdrawing earnings...')
      await tx.wait()
      toast.dismiss()
      toast.success('Earnings withdrawn!')
      loadCollection()
    } catch (error) {
      console.error(error)
      toast.error('Error withdrawing earnings')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading collection...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="container" style={{ padding: '4rem 1rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Collection not found</h2>
          <Link to="/my-nfts" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Back to My NFTs
          </Link>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'minting', label: 'Mint Settings', icon: '⚙️' },
    { id: 'earnings', label: 'Earnings', icon: '💰' },
    { id: 'airdrop', label: 'Airdrop', icon: '🎁' },
    { id: 'whitelist', label: 'Whitelist', icon: '📋' },
    { id: 'metadata', label: 'Metadata', icon: '📝' }
  ]

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem', 
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        <Link 
          to="/my-nfts" 
          style={{ 
            color: 'var(--text-secondary)', 
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          ← Back
        </Link>
        <h1 style={{ margin: 0, fontSize: '1.75rem' }}>
          {collection.name}
        </h1>
        <span style={{
          background: collection.mintingEnabled ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
          color: collection.mintingEnabled ? '#2ecc71' : '#e74c3c',
          padding: '0.25rem 0.75rem',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: '600'
        }}>
          {collection.mintingEnabled ? 'Minting Active' : 'Minting Paused'}
        </span>
        {collection.isLegacyContract && (
          <span style={{
            background: 'rgba(241, 196, 15, 0.2)',
            color: '#f1c40f',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            ⚠️ Legacy Contract
          </span>
        )}
      </div>

      {/* Aviso para contratos antigos */}
      {collection.isLegacyContract && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(241, 196, 15, 0.1), rgba(241, 196, 15, 0.05))',
          border: '1px solid rgba(241, 196, 15, 0.3)',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <strong style={{ color: '#f1c40f' }}>Legacy Contract</strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Esta coleção usa um contrato antigo. Algumas funcionalidades como royalties, airdrop, whitelist e earnings podem não estar disponíveis.
              Para ter acesso completo ao Dashboard, crie uma nova coleção após o deploy do contrato atualizado.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <StatCard title="Total Supply" value={`${collection.totalSupply} / ${collection.maxSupply}`} icon="📦" />
        <StatCard title="Mint Price" value={`${collection.mintPrice} ETH`} icon="💵" />
        <StatCard title="Royalty" value={`${collection.royalty.percentage}%`} icon="👑" />
        <StatCard title="Earnings" value={`${collection.earnings.total} ETH`} icon="💰" />
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem',
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '1rem'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.25rem',
              background: activeTab === tab.id ? 'var(--primary)' : 'var(--surface)',
              color: activeTab === tab.id ? 'white' : 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ 
        background: 'var(--surface)', 
        borderRadius: '12px', 
        padding: '2rem',
        border: '1px solid var(--border)'
      }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>📊 Overview</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <div>
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Collection Address
                </h3>
                <code style={{ 
                  fontSize: '0.875rem', 
                  background: 'var(--surface-alt)', 
                  padding: '0.5rem',
                  borderRadius: '6px',
                  display: 'block',
                  wordBreak: 'break-all'
                }}>
                  {collection.address}
                </code>
              </div>
              
              <div>
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Creator
                </h3>
                <code style={{ 
                  fontSize: '0.875rem', 
                  background: 'var(--surface-alt)', 
                  padding: '0.5rem',
                  borderRadius: '6px',
                  display: 'block',
                  wordBreak: 'break-all'
                }}>
                  {collection.creator}
                </code>
              </div>
              
              <div>
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Created At
                </h3>
                <p style={{ margin: 0 }}>
                  {new Date(collection.createdAt * 1000).toLocaleString()}
                </p>
              </div>
              
              <div>
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Status
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <StatusBadge active={collection.mintingEnabled} label="Minting" />
                  <StatusBadge active={collection.publicMintEnabled} label="Public Mint" />
                  <StatusBadge active={collection.whitelistEnabled} label="Whitelist" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mint Settings Tab */}
        {activeTab === 'minting' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>⚙️ Mint Settings</h2>
            
            {collection.isLegacyContract && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(241, 196, 15, 0.1), rgba(241, 196, 15, 0.05))',
                border: '1px solid rgba(241, 196, 15, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)'
              }}>
                ⚠️ Some features are disabled because this is a legacy contract. Create a new collection via Launchpad to access all features.
              </div>
            )}
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Toggle Minting */}
              <SettingRow
                title="Minting Status"
                description="Enable or disable all minting functionality"
              >
                <button
                  onClick={handleToggleMinting}
                  disabled={updating || collection.isLegacyContract}
                  className={`btn ${collection.mintingEnabled ? 'btn-secondary' : 'btn-primary'}`}
                  style={collection.isLegacyContract ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  title={collection.isLegacyContract ? 'Not available for legacy contracts' : ''}
                >
                  {collection.mintingEnabled ? 'Disable Minting' : 'Enable Minting'}
                </button>
              </SettingRow>

              {/* Toggle Public Mint */}
              <SettingRow
                title="Public Mint"
                description="Allow anyone to mint (if minting is enabled)"
              >
                <button
                  onClick={handleTogglePublicMint}
                  disabled={updating || collection.isLegacyContract}
                  className={`btn ${collection.publicMintEnabled ? 'btn-secondary' : 'btn-primary'}`}
                  style={collection.isLegacyContract ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  title={collection.isLegacyContract ? 'Not available for legacy contracts' : ''}
                >
                  {collection.publicMintEnabled ? 'Disable Public Mint' : 'Enable Public Mint'}
                </button>
              </SettingRow>

              {/* Mint Price */}
              <SettingRow
                title="Mint Price"
                description="Price per NFT in ETH"
              >
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    step="0.001"
                    value={mintPrice}
                    onChange={(e) => setMintPrice(e.target.value)}
                    disabled={collection.isLegacyContract}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-alt)',
                      color: 'var(--text)',
                      width: '150px',
                      opacity: collection.isLegacyContract ? 0.5 : 1
                    }}
                  />
                  <button 
                    onClick={handleUpdateMintPrice} 
                    disabled={updating || collection.isLegacyContract} 
                    className="btn btn-primary"
                    style={collection.isLegacyContract ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    title={collection.isLegacyContract ? 'Not available for legacy contracts' : ''}
                  >
                    Update
                  </button>
                </div>
              </SettingRow>

              {/* Max Per Wallet */}
              <SettingRow
                title="Max Mint Per Wallet"
                description="Maximum NFTs a single wallet can mint"
              >
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    value={maxMintPerWallet}
                    onChange={(e) => setMaxMintPerWallet(e.target.value)}
                    disabled={collection.isLegacyContract}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-alt)',
                      color: 'var(--text)',
                      width: '150px',
                      opacity: collection.isLegacyContract ? 0.5 : 1
                    }}
                  />
                  <button 
                    onClick={handleUpdateMaxPerWallet} 
                    disabled={updating || collection.isLegacyContract} 
                    className="btn btn-primary"
                    style={collection.isLegacyContract ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    title={collection.isLegacyContract ? 'Not available for legacy contracts' : ''}
                  >
                    Update
                  </button>
                </div>
              </SettingRow>

              {/* Royalty */}
              <SettingRow
                title="Royalty Percentage"
                description={!collection.supportsRoyalty 
                  ? "This contract does not support royalty updates. Create a new collection to use this feature." 
                  : "Percentage of secondary sales (max 10%) - You receive this on every resale!"
                }
              >
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={royaltyPercent}
                      onChange={(e) => setRoyaltyPercent(e.target.value)}
                      disabled={!collection.supportsRoyalty}
                      style={{
                        padding: '0.75rem',
                        paddingRight: '2rem',
                        borderRadius: '8px',
                        border: !collection.supportsRoyalty ? '1px solid var(--border)' : '1px solid var(--accent-gold)',
                        background: 'var(--surface-alt)',
                        color: 'var(--text)',
                        width: '120px',
                        opacity: !collection.supportsRoyalty ? 0.5 : 1
                      }}
                    />
                    <span style={{ 
                      position: 'absolute', 
                      right: '0.75rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem'
                    }}>%</span>
                  </div>
                  <button 
                    onClick={handleUpdateRoyalty} 
                    disabled={updating || !collection.supportsRoyalty} 
                    className="btn btn-primary"
                    style={!collection.supportsRoyalty 
                      ? { opacity: 0.5, cursor: 'not-allowed' } 
                      : { background: 'linear-gradient(135deg, var(--primary), var(--accent-gold))' }
                    }
                    title={!collection.supportsRoyalty ? 'This contract does not support royalty updates' : 'Update royalty percentage'}
                  >
                    {!collection.supportsRoyalty ? '🔒 Locked' : '👑 Set Royalty'}
                  </button>
                </div>
              </SettingRow>
              
              {/* Info box sobre royalties */}
              {collection.supportsRoyalty && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(212, 175, 55, 0.05))',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>💰</span>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent-gold)' }}>About Royalties</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Royalties are automatically paid when NFTs from this collection are resold on marketplaces that support ERC-2981.
                    </p>
                    <div style={{ 
                      display: 'flex', 
                      gap: '1.5rem', 
                      flexWrap: 'wrap',
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '8px'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          Current Royalty
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--accent-gold)' }}>
                          {collection.royalty?.percentage || 5}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          Royalties go to (Creator)
                        </div>
                        <div style={{ 
                          fontSize: '0.875rem', 
                          fontWeight: '600', 
                          color: 'var(--text)',
                          fontFamily: 'monospace',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: 'var(--accent-gold)',
                            display: 'inline-block'
                          }}></span>
                          {collection.creator?.substring(0, 6)}...{collection.creator?.substring(38)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>💰 Earnings</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <StatCard title="Total Earned" value={`${collection.earnings.total} ETH`} icon="📈" />
              <StatCard title="Withdrawn" value={`${collection.earnings.withdrawn} ETH`} icon="📤" />
              <StatCard title="Available" value={`${collection.earnings.available} ETH`} icon="💵" highlight />
            </div>
            
            <button
              onClick={handleWithdrawEarnings}
              disabled={updating || parseFloat(collection.earnings.available) === 0}
              className="btn btn-primary"
              style={{ fontSize: '1rem', padding: '1rem 2rem' }}
            >
              Withdraw {collection.earnings.available} ETH
            </button>
          </div>
        )}

        {/* Airdrop Tab */}
        {activeTab === 'airdrop' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>🎁 Airdrop</h2>
            
            <div style={{ display: 'grid', gap: '2rem' }}>
              {/* Single Airdrop */}
              <div style={{ 
                background: 'var(--surface-alt)', 
                padding: '1.5rem', 
                borderRadius: '12px',
                border: '1px solid var(--border)'
              }}>
                <h3 style={{ marginTop: 0 }}>Single Airdrop</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Send a single NFT to an address
                </p>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Recipient address (0x...)"
                    value={airdropAddress}
                    onChange={(e) => setAirdropAddress(e.target.value)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      width: '100%'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Token URI (ipfs://... or https://...)"
                    value={airdropURI}
                    onChange={(e) => setAirdropURI(e.target.value)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      width: '100%'
                    }}
                  />
                  <button 
                    onClick={handleAirdropSingle} 
                    disabled={updating || !airdropAddress || !airdropURI}
                    className="btn btn-primary"
                  >
                    Send Airdrop
                  </button>
                </div>
              </div>

              {/* Batch Airdrop */}
              <div style={{ 
                background: 'var(--surface-alt)', 
                padding: '1.5rem', 
                borderRadius: '12px',
                border: '1px solid var(--border)'
              }}>
                <h3 style={{ marginTop: 0 }}>Batch Airdrop</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Send the same NFT to multiple addresses
                </p>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <textarea
                    placeholder="Enter addresses (one per line)"
                    value={airdropAddresses}
                    onChange={(e) => setAirdropAddresses(e.target.value)}
                    rows={5}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      width: '100%',
                      resize: 'vertical'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Token URI for all (ipfs://... or https://...)"
                    value={airdropURI}
                    onChange={(e) => setAirdropURI(e.target.value)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      width: '100%'
                    }}
                  />
                  <button 
                    onClick={handleAirdropBatch} 
                    disabled={updating || !airdropAddresses || !airdropURI}
                    className="btn btn-primary"
                  >
                    Send Batch Airdrop ({airdropAddresses.split('\n').filter(a => a.trim()).length} addresses)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Whitelist Tab */}
        {activeTab === 'whitelist' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>📋 Whitelist</h2>
            
            <SettingRow
              title="Whitelist Status"
              description="When enabled, only whitelisted addresses can mint"
            >
              <button
                onClick={handleToggleWhitelist}
                disabled={updating}
                className={`btn ${collection.whitelistEnabled ? 'btn-secondary' : 'btn-primary'}`}
              >
                {collection.whitelistEnabled ? 'Disable Whitelist' : 'Enable Whitelist'}
              </button>
            </SettingRow>

            <div style={{ marginTop: '2rem', display: 'grid', gap: '2rem' }}>
              {/* Single Add */}
              <div style={{ 
                background: 'var(--surface-alt)', 
                padding: '1.5rem', 
                borderRadius: '12px',
                border: '1px solid var(--border)'
              }}>
                <h3 style={{ marginTop: 0 }}>Add Single Address</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Address (0x...)"
                    value={whitelistAddress}
                    onChange={(e) => setWhitelistAddress(e.target.value)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      flex: 1
                    }}
                  />
                  <button 
                    onClick={handleAddToWhitelist} 
                    disabled={updating || !whitelistAddress}
                    className="btn btn-primary"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Batch Add */}
              <div style={{ 
                background: 'var(--surface-alt)', 
                padding: '1.5rem', 
                borderRadius: '12px',
                border: '1px solid var(--border)'
              }}>
                <h3 style={{ marginTop: 0 }}>Add Multiple Addresses</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <textarea
                    placeholder="Enter addresses (one per line)"
                    value={whitelistAddresses}
                    onChange={(e) => setWhitelistAddresses(e.target.value)}
                    rows={5}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      width: '100%',
                      resize: 'vertical'
                    }}
                  />
                  <button 
                    onClick={handleAddBatchToWhitelist} 
                    disabled={updating || !whitelistAddresses}
                    className="btn btn-primary"
                  >
                    Add {whitelistAddresses.split('\n').filter(a => a.trim()).length} Addresses
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metadata Tab */}
        {activeTab === 'metadata' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>📝 Collection Metadata</h2>
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Enter collection description..."
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-alt)',
                    color: 'var(--text)',
                    width: '100%',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Collection Image URL
                </label>
                <input
                  type="text"
                  value={collectionImageUrl}
                  onChange={(e) => setCollectionImageUrl(e.target.value)}
                  placeholder="ipfs://... or https://..."
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-alt)',
                    color: 'var(--text)',
                    width: '100%'
                  }}
                />
              </div>

              {collectionImageUrl && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Preview
                  </label>
                  <img 
                    src={normalizeIPFSUrl(collectionImageUrl, true)}
                    alt="Collection preview"
                    style={{
                      maxWidth: '200px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)'
                    }}
                    onError={(e) => {
                      console.error('❌ Erro ao carregar preview da imagem:', collectionImageUrl)
                      console.error('URL tentada:', e.target.src)
                      e.target.style.display = 'none'
                    }}
                  />
                </div>
              )}

              <button 
                onClick={handleUpdateMetadata} 
                disabled={updating}
                className="btn btn-primary"
                style={{ width: 'fit-content' }}
              >
                Update Metadata
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Componentes auxiliares
function StatCard({ title, value, icon, highlight }) {
  return (
    <div style={{
      background: highlight ? 'linear-gradient(135deg, var(--primary), var(--accent-gold))' : 'var(--surface)',
      padding: '1.25rem',
      borderRadius: '12px',
      border: highlight ? 'none' : '1px solid var(--border)'
    }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ 
        fontSize: '0.75rem', 
        color: highlight ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)',
        marginBottom: '0.25rem'
      }}>
        {title}
      </div>
      <div style={{ 
        fontSize: '1.25rem', 
        fontWeight: '700',
        color: highlight ? 'white' : 'var(--text)'
      }}>
        {value}
      </div>
    </div>
  )
}

function StatusBadge({ active, label }) {
  return (
    <span style={{
      background: active ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
      color: active ? '#2ecc71' : '#e74c3c',
      padding: '0.25rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600'
    }}>
      {active ? '✓' : '✗'} {label}
    </span>
  )
}

function SettingRow({ title, description, children }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '1rem',
      background: 'var(--surface-alt)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>{title}</h3>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>
      {children}
    </div>
  )
}

export default CreatorDashboard

