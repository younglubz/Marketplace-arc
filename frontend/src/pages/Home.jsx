import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { useWeb3 } from '../context/Web3Context'
import GenesisLogo from '../components/GenesisLogo'
import ArcLogo from '../components/ArcLogo'
import { normalizeIPFSUrl } from '../utils/ipfs'

// GENESIS Marketplace - Home Page
function Home() {
  const { account, connectWallet, marketplaceContract, nftContract } = useWeb3()
  const [featuredNFTs, setFeaturedNFTs] = useState([])
  const [stats, setStats] = useState({ totalVolume: 0, totalItems: 0, loading: true })

  // Carrega NFTs em destaque
  useEffect(() => {
    const loadFeaturedNFTs = async () => {
      if (!marketplaceContract || !nftContract) {
        setStats(prev => ({ ...prev, loading: false }))
        return
      }

      try {
        setStats(prev => ({ ...prev, loading: true }))
        
        const listingCounter = await marketplaceContract.listingCounter()
        const counterValue = Number(listingCounter)
        
        if (counterValue === 0) {
          setStats({ totalVolume: 0, totalItems: 0, loading: false })
          setFeaturedNFTs([])
          return
        }

        // Busca todas as listagens ativas
        const allListings = []
        let totalVolume = ethers.parseEther('0')
        
        for (let i = 0; i < counterValue && allListings.length < 6; i++) {
          try {
            const listing = await marketplaceContract.getListing(i)
            if (listing.active) {
              allListings.push({
                listingId: i,
                nftContract: listing.nftContract,
                tokenId: listing.tokenId,
                seller: listing.seller,
                price: listing.price,
                active: listing.active
              })
              totalVolume = totalVolume + listing.price
            }
          } catch (e) {
            continue
          }
        }

        // Ordena por preço (maior primeiro)
        allListings.sort((a, b) => {
          const priceA = BigInt(a.price)
          const priceB = BigInt(b.price)
          return priceB > priceA ? 1 : priceB < priceA ? -1 : 0
        })

        // Pega os top 3
        const topListings = allListings.slice(0, 3)

        // Carrega metadados dos NFTs destacados
        const nftsWithMetadata = await Promise.all(
          topListings.map(async (listing) => {
            try {
              const provider = marketplaceContract.runner || marketplaceContract.provider
              const nftContractInstance = new ethers.Contract(
                listing.nftContract,
                nftContract.interface,
                provider
              )
              
              const tokenURI = await nftContractInstance.tokenURI(listing.tokenId)
              
              let metadata = {
                name: `NFT #${listing.tokenId}`,
                description: 'NFT from Arc Marketplace',
                image: '',
                supply: '1'
              }

              try {
                const parsed = JSON.parse(tokenURI)
                metadata = {
                  name: parsed.name || `NFT #${listing.tokenId}`,
                  description: parsed.description || 'NFT from Arc Marketplace',
                  image: parsed.image ? normalizeIPFSUrl(parsed.image) : '',
                  social_links: parsed.social_links || {},
                  external_url: parsed.external_url || '',
                  supply: parsed.supply || '1'
                }
              } catch (e) {
                let metadataUrl = tokenURI
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
                        name: fetchedMetadata.name || `NFT #${listing.tokenId}`,
                        description: fetchedMetadata.description || 'NFT from Arc Marketplace',
                        image: fetchedMetadata.image || '',
                        social_links: fetchedMetadata.social_links || {},
                        external_url: fetchedMetadata.external_url || '',
                        supply: fetchedMetadata.supply || '1'
                      }
                      
                      if (metadata.image) {
                        metadata.image = normalizeIPFSUrl(metadata.image)
                      }
                    }
                  } catch (fetchError) {
                    console.log('Could not load metadata:', fetchError)
                  }
                }
              }

              return {
                ...listing,
                metadata
              }
            } catch (error) {
              return {
                ...listing,
                metadata: {
                  name: `NFT #${listing.tokenId}`,
                  description: 'NFT from Arc Marketplace',
                  image: '',
                  supply: '1'
                }
              }
            }
          })
        )

        // Calcula volume total de todas as listagens
        let totalVolumeAll = ethers.parseEther('0')
        for (let i = 0; i < counterValue; i++) {
          try {
            const listing = await marketplaceContract.getListing(i)
            if (listing.active) {
              totalVolumeAll = totalVolumeAll + listing.price
            }
          } catch (e) {
            continue
          }
        }

        setFeaturedNFTs(nftsWithMetadata.filter(nft => nft !== null))
        setStats({
          totalVolume: parseFloat(ethers.formatEther(totalVolumeAll)),
          totalItems: allListings.length,
          loading: false
        })
      } catch (error) {
        console.error('Error loading featured NFTs:', error)
        setStats({ totalVolume: 0, totalItems: 0, loading: false })
        setFeaturedNFTs([])
      }
    }

    loadFeaturedNFTs()
  }, [marketplaceContract, nftContract])

  return (
    <div className="container">
      <section className="hero">
        {/* Logo Central Grande */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
          <GenesisLogo size={120} animate={true} />
        </div>
        
        <h1 style={{ 
          fontSize: '6rem', 
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-light))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 30px rgba(212, 175, 55, 0.5))',
          fontWeight: '900',
          letterSpacing: '0.15em'
        }}>
          GENESIS
        </h1>
        <div style={{
          fontSize: '0.875rem',
          letterSpacing: '0.3em',
          color: 'var(--text-secondary)',
          marginBottom: '1rem',
          textTransform: 'uppercase'
        }}>
          NFT Marketplace
        </div>
        <div style={{
          fontSize: '0.75rem',
          letterSpacing: '0.2em',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          color: 'var(--text-secondary)'
        }}>
          <span>POWERED BY</span>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: 'var(--accent-gold)'
          }}>
            <ArcLogo size={18} showText={true} textSize="0.75rem" uppercase={true} />
          </div>
        </div>
        <p className="hero-subtitle" style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
          Discover, Collect, and Sell Extraordinary NFTs
        </p>
        
        <div className="flex-center gap-2" style={{ marginTop: '2rem' }}>
          {account ? (
            <>
              <Link to="/collections">
                <button className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.0625rem' }}>
                  Collections
                </button>
              </Link>
              <Link to="/launchpad">
                <button className="btn btn-outline" style={{ padding: '1rem 2rem', fontSize: '1.0625rem' }}>
                  Launchpad
                </button>
              </Link>
            </>
          ) : (
            <button className="btn btn-primary" onClick={connectWallet} style={{ padding: '1rem 2.5rem', fontSize: '1.0625rem' }}>
              Get Started
            </button>
          )}
        </div>
      </section>

      <section className="mt-4">
        <div className="nft-grid">
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 2rem', background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(244, 208, 63, 0.05) 100%)' }}>
            <div style={{ 
              fontSize: '3rem', 
              marginBottom: '1rem',
              filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.5))'
            }}>
              ⬡
            </div>
            <h3 style={{ 
              marginBottom: '0.75rem', 
              fontSize: '1.25rem', 
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              Create
            </h3>
            <p className="text-secondary" style={{ lineHeight: '1.6' }}>
              Transform your digital creations into unique, authentic NFTs
            </p>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 2rem', background: 'linear-gradient(135deg, rgba(244, 208, 63, 0.05) 0%, rgba(212, 175, 55, 0.05) 100%)' }}>
            <div style={{ 
              fontSize: '3rem', 
              marginBottom: '1rem',
              filter: 'drop-shadow(0 0 10px rgba(244, 208, 63, 0.5))'
            }}>
              ⬢
            </div>
            <h3 style={{ 
              marginBottom: '0.75rem', 
              fontSize: '1.25rem', 
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              Trade
            </h3>
            <p className="text-secondary" style={{ lineHeight: '1.6' }}>
              List your NFTs with fair fees and secure blockchain transactions
            </p>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 2rem', background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(244, 208, 63, 0.05) 100%)' }}>
            <div style={{ 
              fontSize: '3rem', 
              marginBottom: '1rem',
              filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.5))'
            }}>
              ⬣
            </div>
            <h3 style={{ 
              marginBottom: '0.75rem', 
              fontSize: '1.25rem', 
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              Collect
            </h3>
            <p className="text-secondary" style={{ lineHeight: '1.6' }}>
              Enjoy fast transactions and low fees on Arc Testnet
            </p>
          </div>
        </div>
      </section>

      {/* Featured NFTs Section com Volume e Valor */}
      <section className="mt-4" style={{ marginTop: '4rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-end',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}>
          <div>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-light))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              ⭐ Top 3 Featured NFTs
            </h2>
            <p className="text-secondary">Featured NFTs with highest market value</p>
          </div>

          {/* Estatísticas */}
          {!stats.loading && (
            <div style={{
              display: 'flex',
              gap: '2rem',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <div style={{
                textAlign: 'right'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '0.25rem'
                }}>
                  Total Volume
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-light))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {stats.totalVolume.toFixed(2)} USDC
                </div>
              </div>
              <div style={{
                textAlign: 'right'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '0.25rem'
                }}>
                  Items Listed
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}>
                  {stats.totalItems}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Grid de NFTs Destacados */}
        {stats.loading ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'var(--border-light)',
            borderRadius: '16px',
            border: '2px solid var(--border)'
          }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p className="text-secondary">Loading featured NFTs...</p>
          </div>
        ) : featuredNFTs.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {featuredNFTs.map((nft) => (
              <div
                key={nft.listingId}
                className="card"
                style={{
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{
                  width: '100%',
                  height: '300px',
                  overflow: 'hidden',
                  background: 'var(--border-light)'
                }}>
                  {nft.metadata.image ? (
                    <img
                      src={normalizeIPFSUrl(nft.metadata.image)}
                      alt={nft.metadata.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
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
                <div style={{ padding: '1.25rem' }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {nft.nftContract.substring(0, 6)}...{nft.nftContract.substring(38)}
                  </div>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    marginBottom: '0.5rem',
                    color: 'var(--text-primary)'
                  }}>
                    {nft.metadata.name}
                  </h3>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border)',
                    marginTop: '1rem'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.25rem'
                      }}>
                        Price
                      </div>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: 'var(--accent-gold)'
                      }}>
                        {ethers.formatEther(nft.price)} USDC
                      </div>
                    </div>
                    <Link to="/explore">
                      <button className="btn btn-primary" style={{
                        padding: '0.625rem 1.25rem',
                        fontSize: '0.875rem'
                      }}>
                        View →
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            background: 'var(--border-light)',
            borderRadius: '16px',
            border: '2px solid var(--border)'
          }}>
            <p className="text-secondary" style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
              No NFTs listed in the marketplace yet
            </p>
            <Link to="/launchpad">
              <button className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1rem' }}>
                Create First NFT →
              </button>
            </Link>
          </div>
        )}

        {/* Link para ver todos */}
        {featuredNFTs.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link to="/explore">
              <button className="btn btn-outline" style={{
                padding: '1rem 2rem',
                fontSize: '1rem'
              }}>
                View All NFTs →
              </button>
            </Link>
          </div>
        )}
      </section>

      <section className="mt-4 text-center">
        <div className="card" style={{ 
          maxWidth: '800px', 
          margin: '0 auto', 
          padding: '3rem 2rem',
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.03) 0%, rgba(244, 208, 63, 0.03) 100%)',
          border: '2px solid',
          borderImage: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-light)) 1'
        }}>
          <h2 style={{ 
            marginBottom: '1rem', 
            fontSize: '1.75rem', 
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            color: 'var(--text)'
          }}>
            <span style={{
              background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-light))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Powered by
            </span>
            <div style={{ color: 'var(--accent-gold)' }}>
              <ArcLogo size={32} showText={true} textSize="1.75rem" />
            </div>
          </h2>
          <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '1.0625rem', lineHeight: '1.6' }}>
            Arc Testnet offers robust and efficient infrastructure for NFTs,
            with native USDC support and seamless Web3 integration.
          </p>
          <div className="flex-center gap-2" style={{ marginTop: '2rem', flexWrap: 'wrap' }}>
            <div className="badge badge-success">Chain ID: 5042002</div>
            <div className="badge badge-success">Currency: USDC</div>
            <div className="badge badge-success">Fast & Secure</div>
          </div>
          <div style={{ marginTop: '2rem' }}>
            <a 
              href="https://testnet.arcscan.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ padding: '0.875rem 1.5rem' }}
            >
              View Explorer →
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home

