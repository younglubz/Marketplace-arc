import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { useWeb3 } from '../context/Web3Context'
import { CONTRACT_ADDRESSES, ARC_TESTNET_CONFIG } from '../config/contracts'
import ArcLogo from '../components/ArcLogo'
import CollectionNFTABI from '../abis/CollectionNFT.json'
import { normalizeIPFSUrl } from '../utils/ipfs'

function MyNFTs() {
  const { nftContract, marketplaceContract, collectionFactoryContract, account, isCorrectNetwork, signer } = useWeb3()
  const [myNFTs, setMyNFTs] = useState([])
  const [myListings, setMyListings] = useState([])
  const [myCreatedCollections, setMyCreatedCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showListModal, setShowListModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showUpdatePriceModal, setShowUpdatePriceModal] = useState(false)
  const [selectedNFT, setSelectedNFT] = useState(null)
  const [selectedListing, setSelectedListing] = useState(null)
  const [listPrice, setListPrice] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [listing, setListing] = useState(false)
  const [updatingPrice, setUpdatingPrice] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    twitter: '',
    discord: '',
    instagram: '',
    website: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (nftContract && marketplaceContract && account) {
      loadMyNFTs()
    } else if (account && (!nftContract || !marketplaceContract)) {
      // Se tem conta mas não tem contratos, mostra erro
      setLoading(false)
      console.warn('Contratos não inicializados')
    } else {
      setLoading(false)
    }
  }, [nftContract, marketplaceContract, account])

  // Função auxiliar para carregar metadados de um NFT
  const loadNFTMetadata = async (tokenURI, tokenId, contractAddress) => {
    let metadata = {
      name: `NFT #${tokenId}`,
      description: 'NFT from Genesis Marketplace',
      image: '',
      supply: '1',
      contractAddress
    }

    try {
      // Primeiro tenta parsear como JSON (se for JSON inline)
      const parsed = JSON.parse(tokenURI)
      metadata = {
        name: parsed.name || `NFT #${tokenId}`,
        description: parsed.description || 'NFT from Genesis Marketplace',
        image: parsed.image || '',
        social_links: parsed.social_links || {},
        external_url: parsed.external_url || '',
        supply: parsed.collection_supply || parsed.supply || '1',
        collection_name: parsed.collection_name || '',
        edition_number: parsed.edition_number || null,
        rarity: parsed.rarity || null,
        is_collection: parsed.is_collection || false,
        contractAddress
      }
    } catch (e) {
      // Se não for JSON, tenta buscar de URL ou IPFS
      let metadataUrl = tokenURI
      
      // Converte IPFS para URL acessível
      if (tokenURI.startsWith('ipfs://')) {
        const ipfsHash = tokenURI.replace('ipfs://', '')
        metadataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
      } else if (tokenURI.startsWith('Qm') || tokenURI.startsWith('baf')) {
        metadataUrl = `https://gateway.pinata.cloud/ipfs/${tokenURI}`
      }
      
      if (metadataUrl.startsWith('http')) {
        try {
          const response = await fetch(metadataUrl)
          if (response.ok) {
            const fetchedMetadata = await response.json()
            metadata = {
              name: fetchedMetadata.name || `NFT #${tokenId}`,
              description: fetchedMetadata.description || 'NFT from Genesis Marketplace',
              image: fetchedMetadata.image || '',
              social_links: fetchedMetadata.social_links || {},
              external_url: fetchedMetadata.external_url || '',
              supply: fetchedMetadata.collection_supply || fetchedMetadata.supply || '1',
              collection_name: fetchedMetadata.collection_name || '',
              edition_number: fetchedMetadata.edition_number || null,
              rarity: fetchedMetadata.rarity || null,
              is_collection: fetchedMetadata.is_collection || false,
              contractAddress
            }
            
            // Normaliza imagem IPFS (trata hash, ipfs://, ou URL completa)
            if (metadata.image) {
              metadata.image = normalizeIPFSUrl(metadata.image)
            }
          }
        } catch (fetchError) {
          console.log('Could not load metadata from URI:', fetchError)
        }
      }
    }

    return metadata
  }

  const loadMyNFTs = async () => {
    try {
      setLoading(true)
      
      if (!marketplaceContract) {
        console.error('Contratos não inicializados')
        toast.error('Contracts not initialized. Please reconnect your wallet.')
        return
      }

      const nfts = []

      // 1. Carrega NFTs do MockNFT (NFTs únicos)
      if (nftContract) {
        try {
          const balance = await nftContract.balanceOf(account)
          console.log('📦 MockNFT - Saldo de NFTs:', Number(balance))
          
          for (let i = 0; i < 100 && nfts.length < Number(balance); i++) {
            try {
              const owner = await nftContract.ownerOf(i)
              if (owner.toLowerCase() === account.toLowerCase()) {
                const tokenURI = await nftContract.tokenURI(i)
                const metadata = await loadNFTMetadata(tokenURI, i, CONTRACT_ADDRESSES.mockNFT)
                
                nfts.push({
                  tokenId: i,
                  tokenURI,
                  metadata,
                  contractAddress: CONTRACT_ADDRESSES.mockNFT,
                  isFromCollection: false
                })
              }
            } catch (e) {
              continue
            }
          }
        } catch (mockError) {
          console.warn('Erro ao carregar do MockNFT:', mockError)
        }
      }

      // 2. Carrega NFTs de TODAS as coleções (incluindo comprados)
      console.log('🔍 Verificando CollectionFactory...', {
        hasFactory: !!collectionFactoryContract,
        factoryAddress: collectionFactoryContract?.target || 'N/A',
        hasSigner: !!signer,
        account
      })
      
      const createdCollections = []
      const checkedCollections = new Set() // Para evitar duplicatas
      
      if (collectionFactoryContract && signer) {
        try {
          console.log('🏭 Buscando TODAS as coleções no CollectionFactory...')
          console.log('   Factory Address:', collectionFactoryContract.target)
          console.log('   User Account:', account)
          
          // Busca TODAS as coleções para verificar NFTs do usuário
          let allCollections = []
          try {
            allCollections = await collectionFactoryContract.getAllCollections()
            console.log('   📊 Total de coleções no Factory:', allCollections.length)
          } catch (e) {
            console.warn('   Erro ao buscar todas as coleções:', e.message)
          }
          
          // Obtém coleções criadas pelo usuário (para marcar como "minhas")
          let userCreatedCollections = []
          try {
            userCreatedCollections = await collectionFactoryContract.getCreatorCollections(account)
            console.log('📁 Coleções criadas pelo usuário:', userCreatedCollections.length)
          } catch (e) {
            console.warn('Erro ao buscar coleções criadas:', e.message)
          }
          
          // Processa TODAS as coleções para encontrar NFTs do usuário
          for (const collectionAddress of allCollections) {
            try {
              console.log('📂 Verificando coleção:', collectionAddress)
              checkedCollections.add(collectionAddress.toLowerCase())
              
              // Cria instância do contrato da coleção
              const collectionContract = new ethers.Contract(
                collectionAddress,
                CollectionNFTABI,
                signer
              )
              
              // Obtém informações da coleção
              const collectionName = await collectionContract.collectionName()
              const totalSupply = await collectionContract.totalSupply()
              const maxSupply = await collectionContract.maxSupply()
              
              // Verifica se o usuário criou esta coleção
              const isCreator = userCreatedCollections.some(
                addr => addr.toLowerCase() === collectionAddress.toLowerCase()
              )
              
              // Busca imagem da coleção do primeiro NFT
              let collectionImage = ''
              if (Number(totalSupply) > 0) {
                try {
                  const firstTokenURI = await collectionContract.tokenURI(1)
                  const firstMetadata = await loadNFTMetadata(firstTokenURI, 1, collectionAddress)
                  collectionImage = firstMetadata.image
                } catch (e) {
                  // Ignora erro
                }
              }
              
              // Adiciona às coleções criadas (se for o criador)
              if (isCreator) {
                createdCollections.push({
                  address: collectionAddress,
                  name: collectionName,
                  totalSupply: Number(totalSupply),
                  maxSupply: Number(maxSupply),
                  image: collectionImage
                })
              }
              
              // Carrega todos os NFTs da coleção pertencentes ao usuário (criados OU comprados)
              for (let tokenId = 1; tokenId <= Number(totalSupply); tokenId++) {
                try {
                  const owner = await collectionContract.ownerOf(tokenId)
                  if (owner.toLowerCase() === account.toLowerCase()) {
                    const tokenURI = await collectionContract.tokenURI(tokenId)
                    const metadata = await loadNFTMetadata(tokenURI, tokenId, collectionAddress)
                    
                    console.log(`   ✅ NFT encontrado: ${collectionName} #${tokenId}`)
                    
                    nfts.push({
                      tokenId,
                      tokenURI,
                      metadata: {
                        ...metadata,
                        collection_name: collectionName
                      },
                      contractAddress: collectionAddress,
                      isFromCollection: true,
                      collectionName,
                      isCreator // Marca se o usuário é o criador da coleção
                    })
                  }
                } catch (tokenError) {
                  // Token pode não existir, ignora
                  continue
                }
              }
            } catch (collError) {
              console.warn('Erro ao carregar coleção:', collectionAddress, collError.message)
              continue
            }
          }
        } catch (factoryError) {
          console.warn('Erro ao buscar coleções do CollectionFactory:', factoryError)
        }
      }
      
      setMyCreatedCollections(createdCollections)

      console.log('✅ Total de NFTs carregados:', nfts.length)
      setMyNFTs(nfts)

      // Carrega minhas listagens
      try {
        const listingCounter = await marketplaceContract.listingCounter()
        const listings = []

        for (let i = 0; i < Number(listingCounter); i++) {
          try {
            const listing = await marketplaceContract.getListing(i)
            if (listing.seller.toLowerCase() === account.toLowerCase() && listing.active) {
              // Extrai os campos da struct explicitamente (ethers.js v6)
              listings.push({
                listingId: i,
                nftContract: listing.nftContract,
                tokenId: listing.tokenId,
                seller: listing.seller,
                price: listing.price,
                active: listing.active
              })
            }
          } catch (e) {
            // Listagem não existe ou erro
            continue
          }
        }

        console.log('Listagens encontradas:', listings.length)
        if (listings.length > 0) {
          console.log('Primeiro listing:', {
            listingId: listings[0].listingId,
            nftContract: listings[0].nftContract,
            tokenId: Number(listings[0].tokenId)
          })
        }
        setMyListings(listings)
      } catch (listingError) {
        console.error('Erro ao carregar listagens:', listingError)
        // Não bloqueia se falhar, apenas não mostra listagens
        setMyListings([])
      }
    } catch (error) {
      console.error('Error loading my NFTs:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        data: error.data
      })
      toast.error(`Erro ao carregar NFTs: ${error.message?.substring(0, 100) || 'Erro desconhecido'}`)
      setMyNFTs([])
      setMyListings([])
    } finally {
      setLoading(false)
    }
  }

  const openListModal = (nft) => {
    setSelectedNFT(nft)
    setShowListModal(true)
    setListPrice('')
  }

  const closeListModal = () => {
    setShowListModal(false)
    setSelectedNFT(null)
    setListPrice('')
  }

  const openEditModal = (nft) => {
    setSelectedNFT(nft)
    
    // Tenta parsear metadata se estiver em JSON
    let metadata = { name: nft.metadata.name, description: nft.metadata.description }
    try {
      const parsed = JSON.parse(nft.tokenURI)
      metadata = {
        name: parsed.name || nft.metadata.name,
        description: parsed.description || nft.metadata.description,
        twitter: parsed.social_links?.twitter || '',
        discord: parsed.social_links?.discord || '',
        instagram: parsed.social_links?.instagram || '',
        website: parsed.external_url || ''
      }
    } catch (e) {
      // Se não for JSON, usa valores padrão
      metadata = {
        name: nft.metadata.name,
        description: nft.metadata.description,
        twitter: '',
        discord: '',
        instagram: '',
        website: ''
      }
    }
    
    setEditFormData(metadata)
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setSelectedNFT(null)
    setEditFormData({
      name: '',
      description: '',
      twitter: '',
      discord: '',
      instagram: '',
      website: ''
    })
  }

  const handleEditChange = (e) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value
    })
  }

  const saveNFTInfo = async () => {
    if (!editFormData.name || !editFormData.description) {
      toast.error('Nome e descrição são obrigatórios')
      return
    }

    try {
      setSaving(true)
      
      // Nota: No Ethereum padrão, você não pode editar o tokenURI após mint
      // Esta funcionalidade só funcionaria se o contrato NFT tiver uma função setTokenURI
      // Por enquanto, vamos apenas atualizar localmente e mostrar feedback
      
      toast.success('Information saved locally! (To save on blockchain, contract needs update function)', { duration: 5000 })
      
      // Atualiza o NFT localmente
      const updatedNFTs = myNFTs.map(nft => {
        if (nft.tokenId === selectedNFT.tokenId) {
          return {
            ...nft,
            metadata: {
              ...nft.metadata,
              name: editFormData.name,
              description: editFormData.description
            }
          }
        }
        return nft
      })
      
      setMyNFTs(updatedNFTs)
      closeEditModal()
      
    } catch (error) {
      console.error('Error saving NFT info:', error)
      toast.error('Error saving information')
    } finally {
      setSaving(false)
    }
  }

  const listNFT = async () => {
    if (!listPrice || parseFloat(listPrice) <= 0) {
      toast.error('Enter a valid price')
      return
    }

    if (!isCorrectNetwork) {
      toast.error('Por favor, conecte-se à Arc Testnet')
      return
    }

    try {
      setListing(true)
      toast.loading('Listing NFT...', { id: 'list' })

      // Determina o endereço do contrato NFT (pode ser MockNFT ou um contrato de coleção)
      const nftContractAddress = selectedNFT.contractAddress || CONTRACT_ADDRESSES.mockNFT
      
      // Cria instância do contrato correto
      const targetNFTContract = selectedNFT.isFromCollection 
        ? new ethers.Contract(nftContractAddress, CollectionNFTABI, signer)
        : nftContract

      // Primeiro, aprova o marketplace
      const isApproved = await targetNFTContract.isApprovedForAll(
        account,
        CONTRACT_ADDRESSES.marketplace
      )

      if (!isApproved) {
        toast.loading('Approving marketplace...', { id: 'list' })
        const approveTx = await targetNFTContract.setApprovalForAll(
          CONTRACT_ADDRESSES.marketplace,
          true
        )
        await approveTx.wait()
      }

      // Lista o NFT
      toast.loading('Creating listing...', { id: 'list' })
      const price = ethers.parseEther(listPrice)
      
      console.log('📝 Listando NFT:', {
        nftContract: nftContractAddress,
        tokenId: selectedNFT.tokenId,
        price: listPrice,
        priceWei: price.toString(),
        account: account,
        isFromCollection: selectedNFT.isFromCollection
      })
      
      const tx = await marketplaceContract.listItem(
        nftContractAddress,
        selectedNFT.tokenId,
        price
      )
      
      console.log('⏳ Aguardando confirmação da transação...', tx.hash)
      const receipt = await tx.wait()
      console.log('✅ Transação confirmada:', receipt)
      
      // Tenta capturar o evento ItemListed
      try {
        const iface = marketplaceContract.interface
        const event = receipt.logs.find(log => {
          try {
            const parsed = iface.parseLog(log)
            return parsed.name === 'ItemListed'
          } catch {
            return false
          }
        })
        
        if (event) {
          const parsed = iface.parseLog(event)
          const listingId = parsed.args.listingId
          console.log('✅ NFT listado com sucesso! Listing ID:', listingId.toString())
          console.log('Detalhes da listagem:', {
            listingId: listingId.toString(),
            seller: parsed.args.seller,
            nftContract: parsed.args.nftContract,
            tokenId: parsed.args.tokenId.toString(),
            price: parsed.args.price.toString()
          })
        } else {
          console.warn('⚠️ Evento ItemListed não encontrado nos logs')
        }
      } catch (eventError) {
        console.error('Erro ao parsear evento:', eventError)
      }

      toast.success('NFT listed successfully! Reload the Explore page to see it.', { id: 'list', duration: 5000 })
      closeListModal()
      loadMyNFTs()
    } catch (error) {
      console.error('Error listing NFT:', error)
      toast.error('Error listing NFT', { id: 'list' })
    } finally {
      setListing(false)
    }
  }

  const cancelListing = async (listingId) => {
    if (!isCorrectNetwork) {
      toast.error('Por favor, conecte-se à Arc Testnet')
      return
    }

    try {
      toast.loading('Canceling listing...', { id: 'cancel' })

      const tx = await marketplaceContract.cancelListing(listingId)
      await tx.wait()

      toast.success('Listing canceled!', { id: 'cancel' })
      loadMyNFTs()
    } catch (error) {
      console.error('Error canceling listing:', error)
      toast.error('Error canceling listing', { id: 'cancel' })
    }
  }

  const openUpdatePriceModal = (listing, nft) => {
    setSelectedListing(listing)
    setSelectedNFT(nft)
    setNewPrice(ethers.formatEther(listing.price))
    setShowUpdatePriceModal(true)
  }

  const closeUpdatePriceModal = () => {
    setShowUpdatePriceModal(false)
    setSelectedListing(null)
    setNewPrice('')
  }

  const updateListingPrice = async () => {
    if (!newPrice || parseFloat(newPrice) <= 0) {
      toast.error('Enter a valid price')
      return
    }

    if (!isCorrectNetwork) {
      toast.error('Please connect to Arc Testnet')
      return
    }

    try {
      setUpdatingPrice(true)
      toast.loading('Updating price...', { id: 'updatePrice' })

      const priceInWei = ethers.parseEther(newPrice)
      const tx = await marketplaceContract.updateListingPrice(selectedListing.listingId, priceInWei)
      await tx.wait()

      toast.success(`Price updated to ${newPrice} USDC!`, { id: 'updatePrice' })
      closeUpdatePriceModal()
      loadMyNFTs()
    } catch (error) {
      console.error('Error updating price:', error)
      let errorMsg = 'Error updating price'
      if (error.message?.includes('Apenas o vendedor')) {
        errorMsg = 'Only the seller can update the price'
      } else if (error.message?.includes('Listagem nao esta ativa')) {
        errorMsg = 'Listing is no longer active'
      }
      toast.error(errorMsg, { id: 'updatePrice' })
    } finally {
      setUpdatingPrice(false)
    }
  }

  if (!account) {
    return (
      <div className="container">
        <div className="loading">
          <h2>Conecte sua carteira para ver seus NFTs</h2>
          <p className="text-secondary mt-2">
            Clique em "Conectar Carteira" no topo da página
          </p>
        </div>
      </div>
    )
  }

  if (!nftContract || !marketplaceContract) {
    return (
      <div className="container">
        <div className="loading">
          <h2>Contracts not initialized</h2>
          <p className="text-secondary mt-2">
            Reconecte sua carteira para carregar seus NFTs
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p className="text-secondary">Loading your NFTs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      {/* Seção My Collections - Coleções criadas pelo usuário */}
      {myCreatedCollections.length > 0 && (
        <section style={{ padding: '3rem 0', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h1 className="section-title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                🏭 My Collections
              </h1>
              <p className="section-subtitle" style={{ margin: 0 }}>
                {myCreatedCollections.length} collection{myCreatedCollections.length !== 1 ? 's' : ''} created by you
              </p>
            </div>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {myCreatedCollections.map((collection) => (
              <div 
                key={collection.address}
                style={{
                  background: 'var(--surface)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Collection Image */}
                <div style={{ height: '160px', overflow: 'hidden', position: 'relative' }}>
                  {collection.image ? (
                    <img 
                      src={normalizeIPFSUrl(collection.image)}
                      alt={collection.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      background: 'linear-gradient(135deg, var(--primary), var(--accent-gold))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3rem'
                    }}>
                      📦
                    </div>
                  )}
                  {/* Progress Badge */}
                  <div style={{
                    position: 'absolute',
                    bottom: '0.75rem',
                    right: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.8)',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: 'white'
                  }}>
                    {collection.totalSupply} / {collection.maxSupply} minted
                  </div>
                </div>
                
                {/* Collection Info */}
                <div style={{ padding: '1.25rem' }}>
                  <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.125rem' }}>
                    {collection.name}
                  </h3>
                  
                  {/* Progress Bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ 
                      height: '6px', 
                      background: 'var(--border)', 
                      borderRadius: '3px', 
                      overflow: 'hidden' 
                    }}>
                      <div style={{ 
                        width: `${(collection.totalSupply / collection.maxSupply) * 100}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, var(--primary), var(--accent-gold))',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                  
                  {/* Contract Address */}
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-secondary)', 
                    marginBottom: '1rem',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}>
                    {collection.address.substring(0, 10)}...{collection.address.substring(36)}
                  </div>
                  
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link 
                      to={`/dashboard/${collection.address}`}
                      className="btn btn-primary"
                      style={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '0.5rem',
                        textDecoration: 'none'
                      }}
                    >
                      <span>⚙️</span>
                      Dashboard
                    </Link>
                    <a
                      href={`${ARC_TESTNET_CONFIG.blockExplorerUrls[0]}/address/${collection.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                      style={{ 
                        padding: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="View on Explorer"
                    >
                      <ArcLogo size={20} showText={false} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ padding: '3rem 0' }}>
        <h1 className="section-title" style={{ fontSize: '2rem' }}>My NFTs</h1>
        <p className="section-subtitle">
          {myNFTs.length} item{myNFTs.length !== 1 ? 's' : ''} in your wallet
        </p>

        {myNFTs.length === 0 ? (
          <div className="card text-center">
            <h3 style={{ marginBottom: '1rem' }}>You don't have any NFTs yet</h3>
            <p className="text-secondary mb-2">
              Create your first NFT or buy one on the marketplace
            </p>
          </div>
        ) : (
          <div className="nft-grid">
            {myNFTs.map((nft) => {
              // Compara tanto tokenId quanto contractAddress para identificar corretamente o listing
              const isListed = myListings.some(l => 
                Number(l.tokenId) === nft.tokenId && 
                l.nftContract?.toLowerCase() === nft.contractAddress?.toLowerCase()
              )
              const listing = myListings.find(l => 
                Number(l.tokenId) === nft.tokenId && 
                l.nftContract?.toLowerCase() === nft.contractAddress?.toLowerCase()
              )

              return (
                <div key={nft.tokenId} className="nft-card">
                  <div className="nft-image">
                    {nft.metadata.image ? (
                      <img 
                      src={normalizeIPFSUrl(nft.metadata.image)}
                        alt={nft.metadata.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          console.error('Erro ao carregar imagem:', nft.metadata.image)
                          e.target.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '4rem'
                      }}>
                        🖼️
                      </div>
                    )}
                  </div>
                  <div className="nft-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div className="nft-collection-name">
                        {nft.collectionName || nft.metadata.collection_name || 'Genesis Collection'}
                      </div>
                      {nft.metadata.rarity && (
                        <span style={{
                          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(255, 215, 0, 0.1))',
                          color: 'var(--accent-gold)',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(212, 175, 55, 0.3)'
                        }}>
                          Rank #{nft.metadata.rarity.rank}
                        </span>
                      )}
                      {nft.metadata.edition_number && !nft.metadata.rarity && (
                        <span style={{
                          background: 'var(--border-light)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border)'
                        }}>
                          #{nft.metadata.edition_number}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 className="nft-title" style={{ margin: 0, flex: 1 }}>{nft.metadata.name}</h3>
                      {/* Ícone do Explorer ARC */}
                      <a 
                        href={`${ARC_TESTNET_CONFIG.blockExplorerUrls[0]}/token/${nft.contractAddress || CONTRACT_ADDRESSES.mockNFT}?a=${nft.tokenId.toString()}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(255, 215, 0, 0.1))',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          textDecoration: 'none',
                          opacity: 0.8,
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                          marginLeft: '0.5rem',
                          flexShrink: 0,
                          padding: '4px'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.opacity = 1
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(255, 215, 0, 0.2))'
                          e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)'
                          e.currentTarget.style.transform = 'scale(1.1)'
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.opacity = 0.8
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(255, 215, 0, 0.1))'
                          e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)'
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                        title="View on Arc Explorer"
                      >
                        <ArcLogo size={20} showText={false} />
                      </a>
                    </div>
                    <p className="nft-description">
                      {nft.metadata.description?.substring(0, 80)}
                      {nft.metadata.description?.length > 80 ? '...' : ''}
                    </p>

                    {isListed && listing ? (
                      <>
                        <div className="nft-price">
                          <div style={{ width: '100%' }}>
                            <div className="price-label">Listed For</div>
                            <div className="price-value" style={{ marginTop: '0.25rem' }}>
                              <span style={{ fontSize: '0.875rem', marginRight: '0.25rem' }}>💵</span>
                              {ethers.formatEther(listing.price)} USDC
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <button
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                            onClick={() => openUpdatePriceModal(listing, nft)}
                          >
                            💰 Update Price
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-outline"
                            style={{ flex: 1 }}
                            onClick={() => cancelListing(listing.listingId)}
                          >
                            Cancel Listing
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.75rem' }}
                            onClick={() => openEditModal(nft)}
                            title="Edit NFT Info"
                          >
                            ✏️
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-primary"
                          style={{ width: '100%', marginTop: '1rem' }}
                          onClick={() => openListModal(nft)}
                        >
                          List for Sale
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                          onClick={() => openEditModal(nft)}
                        >
                          <span>✏️</span>
                          Edit Info
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Modal de Edição */}
      {showEditModal && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Edit NFT Information</h2>
              <button className="modal-close" onClick={closeEditModal}>
                ×
              </button>
            </div>

            <div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  placeholder="Item name"
                  value={editFormData.name}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  name="description"
                  className="form-textarea"
                  placeholder="Provide a detailed description"
                  value={editFormData.description}
                  onChange={handleEditChange}
                  required
                  rows="4"
                />
              </div>

              <div style={{ 
                marginBottom: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border)'
              }}>
                <label className="form-label" style={{ marginBottom: '1rem' }}>Social Links</label>
                
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <span>🐦</span> Twitter
                  </label>
                  <input
                    type="url"
                    name="twitter"
                    className="form-input"
                    placeholder="https://twitter.com/yourusername"
                    value={editFormData.twitter}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <span>💬</span> Discord
                  </label>
                  <input
                    type="url"
                    name="discord"
                    className="form-input"
                    placeholder="https://discord.gg/yourserver"
                    value={editFormData.discord}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <span>📸</span> Instagram
                  </label>
                  <input
                    type="url"
                    name="instagram"
                    className="form-input"
                    placeholder="https://instagram.com/yourusername"
                    value={editFormData.instagram}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <span>🌐</span> Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    className="form-input"
                    placeholder="https://yoursite.com"
                    value={editFormData.website}
                    onChange={handleEditChange}
                  />
                </div>
              </div>

              <div style={{
                background: 'var(--border-light)',
                padding: '1rem',
                borderRadius: '10px',
                marginBottom: '1.5rem',
                border: '1px solid var(--border)'
              }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                  ℹ️ <strong>Note:</strong> Metadata changes are saved locally. To permanently save on blockchain, 
                  the NFT contract would need an update function (not standard in ERC-721).
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '1rem' }}
                  onClick={closeEditModal}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '1rem' }}
                  onClick={saveNFTInfo}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Listagem */}
      {showListModal && (
        <div className="modal-overlay" onClick={closeListModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">List Item for Sale</h2>
              <button className="modal-close" onClick={closeListModal}>
                ×
              </button>
            </div>

            <div>
              <p className="text-secondary mb-2" style={{ fontSize: '0.9375rem' }}>
                You are listing: <strong>{selectedNFT?.metadata.name}</strong>
              </p>

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">Price (USDC)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  className="form-input"
                  placeholder="0.0"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                />
              </div>

              <div style={{ 
                background: 'var(--border-light)', 
                padding: '1rem', 
                borderRadius: '10px', 
                marginBottom: '1.5rem',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>Listing Price</span>
                  <span style={{ fontWeight: '600' }}>{listPrice || '0'} USDC</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>Service Fee (2.5%)</span>
                  <span style={{ fontWeight: '600' }}>{listPrice ? (parseFloat(listPrice) * 0.025).toFixed(4) : '0'} USDC</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  paddingTop: '0.75rem', 
                  borderTop: '1px solid var(--border)',
                  fontWeight: '600'
                }}>
                  <span>You'll receive</span>
                  <span style={{ color: 'var(--primary)' }}>{listPrice ? (parseFloat(listPrice) * 0.975).toFixed(4) : '0'} USDC</span>
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '1rem' }}
                onClick={listNFT}
                disabled={listing}
              >
                {listing ? 'Processing...' : 'Complete Listing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Update de Preço */}
      {showUpdatePriceModal && (
        <div className="modal-overlay" onClick={closeUpdatePriceModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">💰 Update Listing Price</h2>
              <button className="modal-close" onClick={closeUpdatePriceModal}>
                ×
              </button>
            </div>

            <div>
              <p className="text-secondary mb-2" style={{ fontSize: '0.9375rem' }}>
                You are updating: <strong>{selectedNFT?.metadata.name}</strong>
              </p>

              <div style={{ 
                background: 'var(--border-light)', 
                padding: '1rem', 
                borderRadius: '10px', 
                marginBottom: '1.5rem',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>Current Price</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>
                    {selectedListing ? ethers.formatEther(selectedListing.price) : '0'} USDC
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">New Price (USDC)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  className="form-input"
                  placeholder="0.0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  style={{ fontSize: '1.25rem', fontWeight: '600' }}
                />
              </div>

              <div style={{ 
                background: 'var(--border-light)', 
                padding: '1rem', 
                borderRadius: '10px', 
                marginBottom: '1.5rem',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>New Price</span>
                  <span style={{ fontWeight: '600' }}>{newPrice || '0'} USDC</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>Service Fee (2.5%)</span>
                  <span style={{ fontWeight: '600' }}>{newPrice ? (parseFloat(newPrice) * 0.025).toFixed(4) : '0'} USDC</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  paddingTop: '0.75rem', 
                  borderTop: '1px solid var(--border)',
                  fontWeight: '600'
                }}>
                  <span>You'll receive</span>
                  <span style={{ color: 'var(--primary)' }}>{newPrice ? (parseFloat(newPrice) * 0.975).toFixed(4) : '0'} USDC</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '1rem' }}
                  onClick={closeUpdatePriceModal}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '1rem' }}
                  onClick={updateListingPrice}
                  disabled={updatingPrice || !newPrice || parseFloat(newPrice) <= 0}
                >
                  {updatingPrice ? 'Updating...' : 'Update Price'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyNFTs

