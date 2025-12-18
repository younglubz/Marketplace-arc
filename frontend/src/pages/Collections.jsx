import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { useWeb3 } from '../context/Web3Context'
import { ARC_TESTNET_CONFIG, CONTRACT_ADDRESSES, FEE_CONFIG } from '../config/contracts'
import ArcLogo from '../components/ArcLogo'
import CollectionNFTABI from '../abis/CollectionNFT.json'
import { normalizeIPFSUrl } from '../utils/ipfs'

function Collections() {
  const { marketplaceContract, account, nftContract, isCorrectNetwork } = useWeb3()
  const [allListings, setAllListings] = useState([]) // Listagens originais
  const [listings, setListings] = useState([]) // Listagens filtradas
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(null)
  
  // Filtros
  const [sortBy, setSortBy] = useState('price-desc') // price-desc, price-asc, rarity-desc, rarity-asc, recent
  const [filterByRarity, setFilterByRarity] = useState('all') // all, rare, common
  const [filterByCollection, setFilterByCollection] = useState('all') // all ou nome da coleção
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (marketplaceContract && nftContract) {
      loadListings()
    }
  }, [marketplaceContract, nftContract])

  // Aplica filtros e ordenação
  const applyFilters = (listingsToFilter) => {
    const source = listingsToFilter !== undefined ? listingsToFilter : allListings
    let filtered = [...source]

    // Filtro por raridade
    if (filterByRarity === 'rare') {
      filtered = filtered.filter(listing => {
        const rarity = listing.metadata?.rarity?.rank || listing.metadata?.rarity?.score
        return rarity && rarity <= 10 // Top 10 mais raros
      })
    } else if (filterByRarity === 'common') {
      filtered = filtered.filter(listing => {
        const rarity = listing.metadata?.rarity?.rank || listing.metadata?.rarity?.score
        return !rarity || rarity > 10 // Mais comuns
      })
    }

    // Filtro por coleção
    if (filterByCollection !== 'all') {
      filtered = filtered.filter(listing => {
        const collectionName = listing.metadata?.collection_name
        return collectionName && collectionName.toLowerCase().includes(filterByCollection.toLowerCase())
      })
    }

    // Filtro por faixa de preço
    if (priceRange.min !== '') {
      const minPrice = ethers.parseEther(priceRange.min)
      filtered = filtered.filter(listing => listing.price >= minPrice)
    }
    if (priceRange.max !== '') {
      const maxPrice = ethers.parseEther(priceRange.max)
      filtered = filtered.filter(listing => listing.price <= maxPrice)
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-desc':
          return parseFloat(ethers.formatEther(b.price)) - parseFloat(ethers.formatEther(a.price))
        case 'price-asc':
          return parseFloat(ethers.formatEther(a.price)) - parseFloat(ethers.formatEther(b.price))
        case 'rarity-desc': {
          const rarityA = a.metadata?.rarity?.score || a.metadata?.rarity?.rank || 0
          const rarityB = b.metadata?.rarity?.score || b.metadata?.rarity?.rank || 0
          return rarityB - rarityA // Maior score = mais raro
        }
        case 'rarity-asc': {
          const rarityA = a.metadata?.rarity?.score || a.metadata?.rarity?.rank || 0
          const rarityB = b.metadata?.rarity?.score || b.metadata?.rarity?.rank || 0
          return rarityA - rarityB
        }
        case 'recent':
        default:
          return 0 // Mantém ordem original (mais recentes primeiro)
      }
    })

    setListings(filtered)
  }

  // Atualiza filtros quando mudarem
  useEffect(() => {
    if (allListings.length > 0) {
      applyFilters(allListings)
    } else if (allListings.length === 0 && listings.length > 0) {
      // Se allListings foi limpo, limpa também listings
      setListings([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, filterByRarity, filterByCollection, priceRange.min, priceRange.max, allListings.length])

  const loadListings = async () => {
    try {
      setLoading(true)
      
      if (!marketplaceContract || !nftContract) {
        console.error('Contratos não inicializados')
        toast.error('Contratos não inicializados. Reconecte sua carteira.')
        setAllListings([])
        setListings([])
        return
      }

      console.log('=== INICIANDO CARREGAMENTO DE LISTAGENS ===')
      console.log('Marketplace Contract:', marketplaceContract?.target)
      console.log('NFT Contract:', nftContract?.target)

      // Primeiro, obtém o contador de listagens
      try {
        const listingCounter = await marketplaceContract.listingCounter()
        const counterValue = Number(listingCounter)
        console.log('✅ Total de listagens no contrato:', counterValue)
        console.log('   (listingCounter value:', listingCounter.toString(), ')')
        
        if (counterValue === 0) {
          console.log('ℹ️ Nenhuma listagem encontrada no contrato')
          console.log('   Se você acabou de listar um NFT, aguarde alguns segundos e recarregue')
          setAllListings([])
          setListings([])
          return
        }

        // Itera por todas as listagens e filtra as ativas
        const allListings = []
        console.log(`📋 Iniciando iteração por ${counterValue} listagens...`)
        for (let i = 0; i < counterValue; i++) {
          try {
            console.log(`📋 Carregando listagem ${i}/${counterValue - 1}...`)
            const listing = await marketplaceContract.getListing(i)
            
            const listingData = {
              listingId: i,
              nftContract: listing.nftContract,
              tokenId: listing.tokenId.toString(),
              seller: listing.seller,
              price: listing.price.toString(),
              active: listing.active
            }
            
            console.log(`   Listagem ${i}:`, listingData)
            
            if (listing.active) {
              allListings.push({
                listingId: i,
                nftContract: listing.nftContract,
                tokenId: listing.tokenId,
                seller: listing.seller,
                price: listing.price,
                active: listing.active
              })
              console.log(`   ✅ Listagem ${i} está ATIVA - será exibida`)
            } else {
              console.log(`   ⚠️ Listagem ${i} está INATIVA - não será exibida`)
            }
          } catch (e) {
            console.error(`   ❌ Erro ao carregar listagem ${i}:`, {
              message: e.message,
              code: e.code,
              data: e.data
            })
            continue
          }
        }

        console.log(`✅ Listagens ativas encontradas: ${allListings.length}`)
        console.log('Detalhes das listagens ativas:', allListings)
        
        if (allListings.length === 0) {
          console.log('⚠️ Nenhuma listagem ativa encontrada')
          setAllListings([])
          setListings([])
          return
        }

        // Carrega metadados dos NFTs
        const listingsWithMetadata = await Promise.all(
          allListings.map(async (listing) => {
            try {
              // Garante que temos os dados necessários
              const nftContractAddress = listing.nftContract || listing[0]
              const tokenIdValue = listing.tokenId?.toString() || listing[1]?.toString()
              
              if (!nftContractAddress || tokenIdValue === undefined) {
                console.error('❌ Listagem sem dados válidos:', listing)
                return null
              }
              
              console.log(`🖼️ Carregando metadados para NFT ${tokenIdValue} do contrato ${nftContractAddress}`)
              
              // Cria instância do contrato NFT usando o provider do marketplace
              // Usa ABI correto: MockNFT ou CollectionNFT
              const provider = marketplaceContract.runner || marketplaceContract.provider
              const isFromMockNFT = nftContractAddress.toLowerCase() === CONTRACT_ADDRESSES.mockNFT.toLowerCase()
              const nftABI = isFromMockNFT ? nftContract.interface : CollectionNFTABI
              
              const nftContractInstance = new ethers.Contract(
                nftContractAddress,
                nftABI,
                provider
              )
              
              const tokenURI = await nftContractInstance.tokenURI(tokenIdValue)
              console.log(`   TokenURI: ${tokenURI.substring(0, 100)}...`)
            
            let metadata = {
              name: `NFT #${tokenIdValue}`,
              description: 'NFT from Arc Marketplace',
              image: '',
              supply: '1'
            }

            // Tenta carregar metadados da URI
            try {
              // Primeiro tenta parsear como JSON (se for JSON inline)
              const parsed = JSON.parse(tokenURI)
              metadata = {
                name: parsed.name || `NFT #${tokenIdValue}`,
                description: parsed.description || 'NFT from Arc Marketplace',
                image: parsed.image || '',
                social_links: parsed.social_links || {},
                external_url: parsed.external_url || '',
                supply: parsed.supply || '1',
                rarity: parsed.rarity || null,
                collection_name: parsed.collection_name || null,
                collection_supply: parsed.collection_supply || null,
                edition_number: parsed.edition_number || null
              }
            } catch (e) {
              // Se não for JSON, tenta buscar de URL ou IPFS
              let metadataUrl = tokenURI
              
              // Converte IPFS para URL acessível
              if (tokenURI.startsWith('ipfs://')) {
                const ipfsHash = tokenURI.replace('ipfs://', '')
                metadataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
              } else if (tokenURI.startsWith('Qm') || tokenURI.startsWith('baf')) {
                // Hash IPFS sem prefixo
                metadataUrl = `https://gateway.pinata.cloud/ipfs/${tokenURI}`
              }
              
              if (metadataUrl.startsWith('http')) {
                try {
                  const response = await fetch(metadataUrl)
                  if (response.ok) {
                    const fetchedMetadata = await response.json()
                    metadata = {
                      name: fetchedMetadata.name || `NFT #${tokenIdValue}`,
                      description: fetchedMetadata.description || 'NFT from Arc Marketplace',
                      image: fetchedMetadata.image || '',
                      social_links: fetchedMetadata.social_links || {},
                      external_url: fetchedMetadata.external_url || '',
                      supply: fetchedMetadata.supply || '1',
                      rarity: fetchedMetadata.rarity || null,
                      collection_name: fetchedMetadata.collection_name || null,
                      collection_supply: fetchedMetadata.collection_supply || null,
                      edition_number: fetchedMetadata.edition_number || null
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

            return {
              ...listing,
              metadata
            }
          } catch (error) {
            console.error(`   ❌ Error loading NFT metadata for listing ${listing.listingId}:`, error)
            const tokenIdValue = listing.tokenId?.toString() || 'unknown'
            return {
              ...listing,
              metadata: {
                name: `NFT #${tokenIdValue}`,
                description: 'NFT from Arc Marketplace',
                image: '',
                supply: '1'
              }
            }
          }
        }).filter(listing => listing !== null)
        )

        const validListings = listingsWithMetadata.filter(l => l && l.active)
        console.log(`✅ Listagens válidas com metadados: ${validListings.length}`)
        console.log('Listagens finais:', validListings)
        setAllListings(validListings)
        // Aplica filtros imediatamente com os novos dados
        applyFilters(validListings)
      } catch (counterError) {
        console.error('❌ Erro ao buscar listingCounter:', counterError)
        throw counterError
      }
    } catch (error) {
      console.error('Error loading listings:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        data: error.data
      })
      toast.error(`Error loading NFTs: ${error.message?.substring(0, 100) || 'Unknown error'}`)
      setAllListings([])
      setListings([])
    } finally {
      setLoading(false)
    }
  }

  const buyNFT = async (listingId, price) => {
    if (!account) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!isCorrectNetwork) {
      toast.error('Please connect to Arc Testnet')
      return
    }

    try {
      setBuying(listingId)
      toast.loading('Processing purchase...', { id: 'buy' })
      
      console.log('🛒 Iniciando compra:', {
        listingId,
        price: price.toString(),
        priceFormatted: ethers.formatEther(price),
        buyer: account
      })

      // Verifica se a listagem ainda está ativa
      const listing = await marketplaceContract.getListing(listingId)
      console.log('📋 Listagem encontrada:', {
        nftContract: listing.nftContract,
        tokenId: listing.tokenId.toString(),
        seller: listing.seller,
        price: listing.price.toString(),
        active: listing.active
      })
      
      if (!listing.active) {
        toast.error('This listing is no longer active', { id: 'buy' })
        return
      }
      
      if (listing.seller.toLowerCase() === account.toLowerCase()) {
        toast.error('You cannot buy your own NFT', { id: 'buy' })
        return
      }

      const tx = await marketplaceContract.buyItem(listingId, {
        value: price
      })
      
      console.log('⏳ Transação enviada:', tx.hash)

      const receipt = await tx.wait()
      console.log('✅ Transação confirmada:', receipt)

      toast.success('NFT purchased successfully!', { id: 'buy' })
      loadListings() // Recarrega listagens
    } catch (error) {
      console.error('Error buying NFT:', error)
      
      // Mensagens de erro mais específicas
      let errorMessage = 'Error purchasing NFT'
      if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient balance to complete purchase'
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction rejected by user'
      } else if (error.message?.includes('Marketplace nao aprovado')) {
        errorMessage = 'NFT not approved for marketplace. Seller needs to re-list.'
      } else if (error.message?.includes('Listagem nao esta ativa')) {
        errorMessage = 'This listing is no longer active'
      } else if (error.message?.includes('Voce nao e o dono')) {
        errorMessage = 'Seller no longer owns this NFT'
      } else if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction cancelled'
      }
      
      toast.error(errorMessage, { id: 'buy' })
    } finally {
      setBuying(null)
    }
  }

  if (!marketplaceContract || !nftContract) {
    return (
      <div className="container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading" style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Connect your wallet to view collections</h2>
          <p className="text-secondary mt-2" style={{ marginBottom: '1rem' }}>
            Click "Connect Wallet" at the top of the page
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem' }}
          >
            🔄 Refresh Page
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading" style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p className="text-secondary">Loading NFTs...</p>
        </div>
      </div>
    )
  }

  if (listings.length === 0 && !loading) {
    return (
      <div className="container">
        <section style={{ padding: '3rem 0' }}>
          <h1 className="section-title" style={{ fontSize: '2rem' }}>Collections</h1>
          <p className="section-subtitle">
            Real blockchain creations only
          </p>
          <div className="card text-center" style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>No NFTs available</h3>
            <p className="text-secondary mb-2">
              Be the first to create and list an NFT!
            </p>
            <button 
              className="btn btn-primary" 
              onClick={loadListings}
              style={{ marginTop: '1rem' }}
            >
              🔄 Reload
            </button>
          </div>
        </section>
      </div>
    )
  }

  // Separa NFTs principais (top 3 por preço) para exibir em destaque
  const sortedByPrice = [...listings].sort((a, b) => {
    return parseFloat(ethers.formatEther(b.price)) - parseFloat(ethers.formatEther(a.price))
  })
  const featuredListings = sortedByPrice.slice(0, 3)
  const regularListings = sortedByPrice.slice(3)

  // Componente para renderizar card de NFT
  const renderNFTCard = (listing, isFeatured = false) => (
    <div 
      key={listing.listingId} 
      className="nft-card"
      style={isFeatured ? {
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer'
      } : {}}
      onMouseEnter={(e) => {
        if (isFeatured) {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)'
        }
      }}
      onMouseLeave={(e) => {
        if (isFeatured) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      <div className="nft-image" style={isFeatured ? { height: '400px', position: 'relative' } : { position: 'relative' }}>
        {listing.metadata.image ? (
          <img 
            src={normalizeIPFSUrl(listing.metadata.image)}
            alt={listing.metadata.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              console.error('Erro ao carregar imagem:', listing.metadata.image)
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
            fontSize: isFeatured ? '6rem' : '4rem'
          }}>
            🖼️
          </div>
        )}
        {/* Badge de Raridade */}
        {listing.metadata?.rarity && (
          <div style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            background: listing.metadata.rarity.rank <= 5 ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.95), rgba(255, 215, 0, 0.95))' :
                        listing.metadata.rarity.rank <= 10 ? 'linear-gradient(135deg, rgba(192, 192, 192, 0.95), rgba(230, 230, 230, 0.95))' :
                        'rgba(139, 69, 19, 0.9)',
            color: listing.metadata.rarity.rank <= 10 ? 'var(--text)' : 'white',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '700',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            {listing.metadata.rarity.rank <= 5 ? '⭐' : listing.metadata.rarity.rank <= 10 ? '✨' : '💎'}
            Rank #{listing.metadata.rarity.rank}
            {listing.metadata.rarity.percentile && (
              <span style={{ fontSize: '0.65rem', opacity: 0.9 }}>
                ({listing.metadata.rarity.percentile})
              </span>
            )}
          </div>
        )}
      </div>
      <div className="nft-content" style={isFeatured ? { padding: '1.25rem' } : {}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="nft-collection-name" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {listing.metadata?.collection_name || `${listing.nftContract.substring(0, 6)}...${listing.nftContract.substring(38)}`}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {listing.metadata?.edition_number && listing.metadata?.collection_supply && (
              <span style={{
                background: 'var(--border-light)',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: '600',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                #{listing.metadata.edition_number}/{listing.metadata.collection_supply}
              </span>
            )}
          </div>
        </div>
        <h3 className="nft-title" style={isFeatured ? { fontSize: '1.25rem', marginBottom: '0.5rem' } : {}}>
          {listing.metadata.name}
        </h3>
        {isFeatured && listing.metadata.description && (
          <p className="nft-description" style={{ marginBottom: '1rem', fontSize: '0.9375rem' }}>
            {listing.metadata.description?.substring(0, 120)}
            {listing.metadata.description?.length > 120 ? '...' : ''}
          </p>
        )}
        
        {/* Links Sociais e Explorer */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginBottom: '0.75rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border-light)',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Links Sociais */}
          {listing.metadata.social_links && Object.values(listing.metadata.social_links).some(link => link) && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {listing.metadata.social_links.twitter && (
                <a 
                  href={listing.metadata.social_links.twitter} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ 
                    fontSize: '1.25rem',
                    textDecoration: 'none',
                    opacity: 0.7,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                  onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                  title="Twitter"
                >
                  🐦
                </a>
              )}
              {listing.metadata.social_links.discord && (
                <a 
                  href={listing.metadata.social_links.discord} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ 
                    fontSize: '1.25rem',
                    textDecoration: 'none',
                    opacity: 0.7,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                  onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                  title="Discord"
                >
                  💬
                </a>
              )}
              {listing.metadata.social_links.instagram && (
                <a 
                  href={listing.metadata.social_links.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ 
                    fontSize: '1.25rem',
                    textDecoration: 'none',
                    opacity: 0.7,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                  onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                  title="Instagram"
                >
                  📸
                </a>
              )}
              {listing.metadata.external_url && (
                <a 
                  href={listing.metadata.external_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ 
                    fontSize: '1.25rem',
                    textDecoration: 'none',
                    opacity: 0.7,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                  onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                  title="Website"
                >
                  🌐
                </a>
              )}
            </div>
          )}
          
            {/* Ícone do Explorer ARC */}
            <a 
              href={`${ARC_TESTNET_CONFIG.blockExplorerUrls[0]}/token/${listing.nftContract}?a=${listing.tokenId.toString()}`}
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
        <div className="nft-price" style={isFeatured ? { marginBottom: '0.75rem' } : { marginBottom: '0.5rem' }}>
          <div style={{ width: '100%' }}>
            <div className="price-label">Current Price</div>
            <div className="price-value" style={{ marginTop: '0.25rem', fontSize: isFeatured ? '1.25rem' : '1rem' }}>
              <span style={{ fontSize: isFeatured ? '1rem' : '0.875rem', marginRight: '0.25rem' }}>💵</span>
              {ethers.formatEther(listing.price)} USDC
            </div>
          </div>
        </div>
        
        {/* Fee Info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
          color: 'var(--text-secondary)',
          padding: '0.5rem',
          background: 'var(--surface-alt)',
          borderRadius: '6px',
          marginBottom: '0.75rem',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>🏷️</span>
            <span>Marketplace: {FEE_CONFIG.marketplaceFee}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>👑</span>
            <span>Royalty: {FEE_CONFIG.defaultRoyalty}%</span>
          </div>
        </div>
        
        <button
          className={isFeatured ? "btn btn-primary" : "btn btn-primary"}
          style={{ width: '100%', padding: isFeatured ? '1rem' : '0.75rem', fontSize: isFeatured ? '1rem' : '0.875rem' }}
          onClick={() => buyNFT(listing.listingId, listing.price)}
          disabled={buying === listing.listingId || listing.seller.toLowerCase() === account?.toLowerCase()}
        >
          {buying === listing.listingId ? 'Processing...' : 
           listing.seller.toLowerCase() === account?.toLowerCase() ? 'Your NFT' : 'Buy Now'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="container">
      <section style={{ padding: '3rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="section-title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Collections</h1>
            <p className="section-subtitle">
              {listings.length} NFT{listings.length !== 1 ? 's' : ''} available • Real blockchain creations only
            </p>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={loadListings}
            style={{ padding: '0.75rem 1.5rem' }}
            title="Reload listings"
          >
            🔄 Reload
          </button>
        </div>

        {/* NFTs em Destaque (similar ao OpenSea) */}
        {featuredListings.length > 0 && (
          <div style={{ marginBottom: '4rem' }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>⭐</span>
              Featured NFTs
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: featuredListings.length === 1 ? '1fr' : featuredListings.length === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {featuredListings.map((listing) => renderNFTCard(listing, true))}
            </div>
          </div>
        )}

        {/* Todos os NFTs em Grid */}
        {regularListings.length > 0 && (
          <div>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              marginBottom: '1.5rem'
            }}>
              All NFTs
            </h2>
            <div className="nft-grid">
              {regularListings.map((listing) => renderNFTCard(listing, false))}
            </div>
          </div>
        )}

        {/* Fallback: se não há featured nem regular, mas listings.length > 0 */}
        {featuredListings.length === 0 && regularListings.length === 0 && listings.length > 0 && (
          <div className="card text-center" style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Error displaying NFTs</h3>
            <p className="text-secondary mb-2">
              There are {listings.length} NFT(s) available but they couldn't be displayed.
            </p>
            <button 
              className="btn btn-primary" 
              onClick={loadListings}
              style={{ marginTop: '1rem' }}
            >
              🔄 Reload
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

export default Collections

