import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ethers } from 'ethers'
import { Web3Provider } from './context/Web3Context'
import { useWeb3 } from './context/Web3Context'
import GenesisLogo from './components/GenesisLogo'
import Home from './pages/Home'
import Collections from './pages/Collections'
import MyNFTs from './pages/MyNFTs'
import Launchpad from './pages/Launchpad'
import CreatorDashboard from './pages/CreatorDashboard'

function HeaderContent() {
  const location = useLocation()
  const { account, connectWallet, disconnect, isCorrectNetwork, checkNetworkInfo, provider } = useWeb3()
  const [showNetworkInfo, setShowNetworkInfo] = useState(false)
  const [networkInfo, setNetworkInfo] = useState(null)
  const [balance, setBalance] = useState(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [theme, setTheme] = useState(() => {
    // Verifica se há tema salvo no localStorage ou usa o padrão do sistema
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) return savedTheme
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const handleCheckNetwork = async () => {
    const info = await checkNetworkInfo()
    if (info) {
      setNetworkInfo(info)
      setShowNetworkInfo(true)
      setShowAccountMenu(false) // Fecha o menu ao abrir o modal
    }
  }

  const handleAccountClick = () => {
    setShowAccountMenu(!showAccountMenu)
  }

  const handleDisconnect = () => {
    disconnect()
    setShowAccountMenu(false)
  }

  // Busca o saldo da carteira
  const fetchBalance = async () => {
    if (!account || !provider) {
      setBalance(null)
      return
    }

    try {
      setLoadingBalance(true)
      const balanceWei = await provider.getBalance(account)
      const balanceFormatted = ethers.formatEther(balanceWei)
      setBalance(parseFloat(balanceFormatted))
    } catch (error) {
      console.error('Error fetching balance:', error)
      setBalance(null)
    } finally {
      setLoadingBalance(false)
    }
  }

  // Aplica o tema ao documento
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Toggle de tema
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  // Atualiza o saldo quando a conta ou provider mudarem
  useEffect(() => {
    if (!account || !provider) {
      setBalance(null)
      return
    }

    const updateBalance = async () => {
      try {
        setLoadingBalance(true)
        const balanceWei = await provider.getBalance(account)
        const balanceFormatted = ethers.formatEther(balanceWei)
        setBalance(parseFloat(balanceFormatted))
      } catch (error) {
        console.error('Error fetching balance:', error)
        setBalance(null)
      } finally {
        setLoadingBalance(false)
      }
    }

    updateBalance()
    
    // Atualiza o saldo a cada 10 segundos
    const interval = setInterval(() => {
      updateBalance()
    }, 10000)

    return () => clearInterval(interval)
  }, [account, provider])

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAccountMenu && !event.target.closest('[data-account-menu]')) {
        setShowAccountMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAccountMenu])

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="header-logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <GenesisLogo size={52} animate={true} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
                <div className="logo" style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: '800', 
                  letterSpacing: '0.15em',
                  lineHeight: '1.2'
                }}>
                  GENESIS
                </div>
                <span style={{
                  fontSize: '0.625rem',
                  fontWeight: '700',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(244, 208, 63, 0.2))',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  color: 'var(--accent-gold)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  display: 'inline-block',
                  lineHeight: '1'
                }}>
                  Pre-alpha
                </span>
              </div>
              <div style={{ 
                fontSize: '0.625rem', 
                letterSpacing: '0.25em', 
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                fontWeight: '600',
                opacity: 0.8
              }}>
                NFT Marketplace
              </div>
            </div>
          </Link>
          
          <nav className="nav">
            <Link 
              to="/collections" 
              className={`nav-link ${location.pathname === '/collections' || location.pathname === '/' ? 'active' : ''}`}
            >
              Collections
            </Link>
            <Link 
              to="/launchpad" 
              className={`nav-link ${location.pathname === '/launchpad' ? 'active' : ''}`}
            >
              Launchpad
            </Link>
            <Link 
              to="/my-nfts" 
              className={`nav-link ${location.pathname === '/my-nfts' ? 'active' : ''}`}
            >
              My NFTs
            </Link>
          </nav>
          
          <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginLeft: 'auto' }}>
            <button
              className="btn btn-outline"
              onClick={toggleTheme}
              style={{
                padding: '0.625rem',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)'
              }}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {theme === 'light' ? (
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                ) : (
                  <>
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </>
                )}
              </svg>
            </button>
                  {!isCorrectNetwork && account && (
                    <span className="badge badge-error" style={{ fontSize: '0.75rem' }}>Wrong Network</span>
                  )}
            {account && balance !== null && (
              <div style={{
                padding: '0.625rem 1rem',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                {loadingBalance ? (
                  <span style={{ opacity: 0.7 }}>...</span>
                ) : (
                  <span>{balance.toFixed(4)} USDC</span>
                )}
              </div>
            )}
                  {account ? (
                    <div style={{ position: 'relative' }} data-account-menu>
                      <button 
                        className="btn btn-secondary" 
                        onClick={handleAccountClick}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.625rem',
                          padding: '0.625rem 1.125rem',
                          fontWeight: '600',
                          position: 'relative',
                          overflow: 'visible'
                        }}
                      >
                        <div style={{ 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          background: 'var(--accent-gold)',
                          boxShadow: '0 0 10px rgba(212, 175, 55, 0.6)',
                          flexShrink: 0
                        }}></div>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          {formatAddress(account)}
                        </span>
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{
                            transform: showAccountMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>
                      
                      {showAccountMenu && (
                        <div 
                          style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '0.5rem',
                            minWidth: '200px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                            zIndex: 1000,
                            overflow: 'hidden',
                            animation: 'slideDown 0.2s ease-out'
                          }}
                        >
                          <div 
                            style={{
                              padding: '0.75rem 1rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              transition: 'background 0.2s',
                              borderBottom: '1px solid var(--border)'
                            }}
                            onClick={handleCheckNetwork}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-alt)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="2" y1="12" x2="22" y2="12"/>
                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                            </svg>
                            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Network Info</span>
                          </div>
                          <div 
                            style={{
                              padding: '0.75rem 1rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              transition: 'background 0.2s',
                              color: 'var(--error)'
                            }}
                            onClick={handleDisconnect}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-alt)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                              <polyline points="16 17 21 12 16 7"></polyline>
                              <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Disconnect</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button 
                      className="btn btn-primary" 
                      onClick={connectWallet}
                      style={{
                        padding: '0.625rem 1.25rem',
                        fontWeight: '600',
                        fontSize: '0.9375rem',
                        letterSpacing: '0.05em'
                      }}
                    >
                      Connect Wallet
                    </button>
                  )}
          </div>
        </div>
      </div>
      
      {/* Network information modal */}
      {showNetworkInfo && networkInfo && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease-out',
            overflow: 'auto',
            padding: '1rem'
          }}
          onClick={() => setShowNetworkInfo(false)}
        >
          <div 
            style={{
              maxWidth: '540px',
              width: '100%',
              maxHeight: '90vh',
              padding: '0',
              background: 'var(--surface)',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              overflow: 'auto',
              animation: 'slideUp 0.3s ease-out',
              margin: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com gradiente */}
            <div style={{
              background: networkInfo.isCorrect 
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
              padding: '1.75rem 2rem',
              borderBottom: `1px solid ${networkInfo.isCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: networkInfo.isCorrect 
                    ? 'rgba(34, 197, 94, 0.2)' 
                    : 'rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={networkInfo.isCorrect ? '#22c55e' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </div>
                <div>
                  <h2 style={{ 
                    margin: 0,
                    fontSize: '1.375rem',
                    fontWeight: '700',
                    color: 'var(--text)'
                  }}>
                    Network Status
                  </h2>
                  <div style={{
                    marginTop: '0.25rem',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)'
                  }}>
                    {networkInfo.isCorrect ? 'Connected' : 'Disconnected'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowNetworkInfo(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  lineHeight: 1,
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-alt)'
                  e.currentTarget.style.color = 'var(--text)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '2rem' }}>
              {/* Status Badge */}
              <div style={{
                marginBottom: '2rem',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                background: networkInfo.isCorrect 
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))',
                border: `1px solid ${networkInfo.isCorrect ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: networkInfo.isCorrect ? '#22c55e' : '#ef4444',
                  boxShadow: `0 0 12px ${networkInfo.isCorrect ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                  animation: 'pulse 2s infinite'
                }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '0.9375rem', 
                    fontWeight: '600',
                    color: networkInfo.isCorrect ? '#22c55e' : '#ef4444',
                    marginBottom: '0.25rem'
                  }}>
                    {networkInfo.isCorrect ? 'Correct Network' : 'Wrong Network'}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {networkInfo.isCorrect 
                      ? `Connected to ${networkInfo.expectedName}`
                      : `Recommended: ${networkInfo.expectedName}`}
                  </div>
                </div>
              </div>

              {/* Network Info Grid */}
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{
                  padding: '1.25rem',
                  background: 'var(--surface-alt)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  transition: 'all 0.2s'
                }}>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-secondary)', 
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: '600'
                  }}>
                    Network Name
                  </div>
                  <div style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '700',
                    color: 'var(--text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {networkInfo.name}
                  </div>
                </div>

                <div style={{
                  padding: '1.25rem',
                  background: 'var(--surface-alt)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  transition: 'all 0.2s'
                }}>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-secondary)', 
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: '600'
                  }}>
                    Chain ID
                  </div>
                  <div style={{ 
                    fontSize: '1.125rem', 
                    fontFamily: 'monospace', 
                    fontWeight: '700',
                    color: 'var(--accent-gold)'
                  }}>
                    {networkInfo.chainId}
                    <span style={{ 
                      fontSize: '0.875rem', 
                      color: 'var(--text-secondary)',
                      marginLeft: '0.5rem',
                      fontWeight: '500'
                    }}>
                      ({networkInfo.chainIdHex})
                    </span>
                  </div>
                </div>

                <div style={{
                  padding: '1.25rem',
                  background: 'var(--surface-alt)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  transition: 'all 0.2s'
                }}>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-secondary)', 
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: '600'
                  }}>
                    Native Currency
                  </div>
                  <div style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '700',
                    color: 'var(--text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{
                      fontSize: '1.5rem'
                    }}>💵</span>
                    {networkInfo.currencySymbol}
                  </div>
                </div>

                {networkInfo.blockExplorer && (
                  <a
                    href={networkInfo.blockExplorer} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      padding: '1.25rem',
                      background: 'var(--surface-alt)',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-gold)'
                      e.currentTarget.style.background = 'rgba(212, 175, 55, 0.05)'
                      e.currentTarget.style.transform = 'translateX(4px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--surface-alt)'
                      e.currentTarget.style.transform = 'translateX(0)'
                    }}
                  >
                    <div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--text-secondary)', 
                        marginBottom: '0.5rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        fontWeight: '600'
                      }}>
                        Block Explorer
                      </div>
                      <div style={{ 
                        fontSize: '1rem', 
                        color: 'var(--accent-gold)',
                        fontWeight: '600'
                      }}>
                        View on Arcscan
                      </div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function AppContent() {
  return (
    <Router>
      <div className="app">
        <HeaderContent />
        
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/launchpad" element={<Launchpad />} />
            <Route path="/my-nfts" element={<MyNFTs />} />
            <Route path="/dashboard/:collectionAddress" element={<CreatorDashboard />} />
          </Routes>
        </main>

        <footer style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          padding: '2rem 0',
          marginTop: '4rem'
        }}>
          <div className="container">
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)'
            }}>
              <span>Follow us:</span>
              <a 
                href="https://twitter.com/younglubz" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: 'var(--accent-gold)',
                  textDecoration: 'none',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.9 }}>
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
                </svg>
                @younglubz
              </a>
            </div>
          </div>
        </footer>

        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            },
          }}
        />
      </div>
    </Router>
  )
}

function App() {
  return (
    <Web3Provider>
      <AppContent />
    </Web3Provider>
  )
}

export default App

