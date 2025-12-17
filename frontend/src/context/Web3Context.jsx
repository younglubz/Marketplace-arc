import { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { CONTRACT_ADDRESSES, ARC_TESTNET_CONFIG } from '../config/contracts'
import MarketplaceABI from '../abis/Marketplace.json'
import MockNFTABI from '../abis/MockNFT.json'
import CollectionFactoryABI from '../abis/CollectionFactory.json'

const Web3Context = createContext()

export const useWeb3 = () => {
  const context = useContext(Web3Context)
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider')
  }
  return context
}

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState(null)
  const [marketplaceContract, setMarketplaceContract] = useState(null)
  const [nftContract, setNFTContract] = useState(null)
  const [collectionFactoryContract, setCollectionFactoryContract] = useState(null)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)
  const [loading, setLoading] = useState(false)

  // Verifica se está na rede correta
  const checkNetwork = async (provider) => {
    try {
      const network = await provider.getNetwork()
      const isCorrect = Number(network.chainId) === ARC_TESTNET_CONFIG.chainId
      setIsCorrectNetwork(isCorrect)
      return isCorrect
    } catch (error) {
      console.error('Error checking network:', error)
      return false
    }
  }

  // Adiciona/troca para a rede Arc Testnet
  const switchToArcNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${ARC_TESTNET_CONFIG.chainId.toString(16)}` }],
      })
      return true
    } catch (switchError) {
      // Se a rede não existe, adiciona ela
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${ARC_TESTNET_CONFIG.chainId.toString(16)}`,
                chainName: ARC_TESTNET_CONFIG.chainName,
                nativeCurrency: ARC_TESTNET_CONFIG.nativeCurrency,
                rpcUrls: ARC_TESTNET_CONFIG.rpcUrls,
                blockExplorerUrls: ARC_TESTNET_CONFIG.blockExplorerUrls,
              },
            ],
          })
          return true
        } catch (addError) {
          console.error('Error adding network:', addError)
          toast.error('Erro ao adicionar rede Arc Testnet')
          return false
        }
      }
      console.error('Error switching network:', switchError)
      toast.error('Erro ao trocar para rede Arc Testnet')
      return false
    }
  }

  // Conecta a carteira
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        toast.error('Por favor, instale o MetaMask!')
        return
      }

      setLoading(true)

      // Solicita acesso à carteira
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      const web3Provider = new ethers.BrowserProvider(window.ethereum)
      const network = await checkNetwork(web3Provider)

      // Se não está na rede correta, tenta trocar
      if (!network) {
        const switched = await switchToArcNetwork()
        if (!switched) {
          setLoading(false)
          return
        }
      }

      const web3Signer = await web3Provider.getSigner()

      setProvider(web3Provider)
      setSigner(web3Signer)
      setAccount(accounts[0])

      // Tenta verificar se os contratos existem na blockchain (não bloqueia se falhar)
      try {
        const marketplaceCode = await web3Provider.getCode(CONTRACT_ADDRESSES.marketplace)
        const nftCode = await web3Provider.getCode(CONTRACT_ADDRESSES.mockNFT)
        
        console.log('Marketplace code length:', marketplaceCode?.length || 0)
        console.log('NFT code length:', nftCode?.length || 0)
        
        if (marketplaceCode === '0x' || nftCode === '0x') {
          console.warn('Contratos podem não estar deployados ou endereços incorretos')
          // Não bloqueia, apenas avisa
        }
      } catch (codeError) {
        console.warn('Erro ao verificar código dos contratos:', codeError)
        // Continua mesmo se a verificação falhar
      }

      // Inicializa contratos
      const marketplace = new ethers.Contract(
        CONTRACT_ADDRESSES.marketplace,
        MarketplaceABI,
        web3Signer
      )
      const nft = new ethers.Contract(
        CONTRACT_ADDRESSES.mockNFT,
        MockNFTABI,
        web3Signer
      )
      
      // Inicializa CollectionFactory se o endereço estiver configurado
      let collectionFactory = null
      if (CONTRACT_ADDRESSES.collectionFactory) {
        try {
          // Verifica se o contrato existe na blockchain
          const factoryCode = await web3Provider.getCode(CONTRACT_ADDRESSES.collectionFactory)
          console.log('CollectionFactory code length:', factoryCode?.length || 0)
          
          if (factoryCode && factoryCode !== '0x') {
            collectionFactory = new ethers.Contract(
              CONTRACT_ADDRESSES.collectionFactory,
              CollectionFactoryABI,
              web3Signer
            )
            console.log('✅ CollectionFactory inicializado:', CONTRACT_ADDRESSES.collectionFactory)
          } else {
            console.warn('⚠️ CollectionFactory não deployado no endereço:', CONTRACT_ADDRESSES.collectionFactory)
          }
        } catch (factoryError) {
          console.error('❌ Erro ao inicializar CollectionFactory:', factoryError)
        }
      } else {
        console.warn('⚠️ Endereço do CollectionFactory não configurado')
      }

      setMarketplaceContract(marketplace)
      setNFTContract(nft)
      setCollectionFactoryContract(collectionFactory)

      toast.success('Carteira conectada com sucesso!')
      setLoading(false)
    } catch (error) {
      console.error('Error connecting wallet:', error)
      toast.error('Erro ao conectar carteira')
      setLoading(false)
    }
  }

  // Verifica informações da rede conectada
  const checkNetworkInfo = async () => {
    try {
      if (!window.ethereum) {
        toast.error('MetaMask não está instalado')
        return null
      }

      if (!provider) {
        toast.error('Carteira não conectada')
        return null
      }

      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)
      
      // Tenta obter mais informações da rede via MetaMask
      let networkName = network.name || 'Unknown'
      let currencySymbol = 'ETH'
      let currencyDecimals = 18
      let blockExplorer = null

      try {
        const chainData = await window.ethereum.request({
          method: 'eth_chainId',
        })
        
        // Mapeia algumas redes conhecidas
        const knownNetworks = {
          '0x1': { name: 'Ethereum Mainnet', symbol: 'ETH', explorer: 'https://etherscan.io' },
          '0x5': { name: 'Goerli Testnet', symbol: 'ETH', explorer: 'https://goerli.etherscan.io' },
          '0x89': { name: 'Polygon Mainnet', symbol: 'MATIC', explorer: 'https://polygonscan.com' },
          '0x4d9c4d': { name: 'Arc Testnet', symbol: 'USDC', explorer: 'https://testnet.arcscan.app' },
        }
        
        const hexChainId = `0x${chainId.toString(16)}`
        if (knownNetworks[hexChainId]) {
          networkName = knownNetworks[hexChainId].name
          currencySymbol = knownNetworks[hexChainId].symbol
          blockExplorer = knownNetworks[hexChainId].explorer
        }

        // Se for Arc Testnet (Chain ID 5042002)
        if (chainId === ARC_TESTNET_CONFIG.chainId) {
          networkName = ARC_TESTNET_CONFIG.chainName
          currencySymbol = ARC_TESTNET_CONFIG.nativeCurrency.symbol
          blockExplorer = ARC_TESTNET_CONFIG.blockExplorerUrls[0]
        }
      } catch (e) {
        console.warn('Erro ao obter informações extras da rede:', e)
      }

      const networkInfo = {
        chainId,
        chainIdHex: `0x${chainId.toString(16)}`,
        name: networkName,
        currencySymbol,
        currencyDecimals,
        blockExplorer,
        isCorrect: chainId === ARC_TESTNET_CONFIG.chainId,
        expectedChainId: ARC_TESTNET_CONFIG.chainId,
        expectedName: ARC_TESTNET_CONFIG.chainName,
      }

      return networkInfo
    } catch (error) {
      console.error('Erro ao verificar informações da rede:', error)
      toast.error('Erro ao verificar informações da rede')
      return null
    }
  }

  // Desconecta a carteira
  const disconnect = () => {
    setProvider(null)
    setSigner(null)
    setAccount(null)
    setMarketplaceContract(null)
    setNFTContract(null)
    setCollectionFactoryContract(null)
    setIsCorrectNetwork(false)
    toast.success('Carteira desconectada')
  }

  // Monitora mudanças de conta
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnect()
        } else {
          setAccount(accounts[0])
        }
      })

      window.ethereum.on('chainChanged', () => {
        window.location.reload()
      })
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged')
        window.ethereum.removeAllListeners('chainChanged')
      }
    }
  }, [])

  const value = {
    provider,
    signer,
    account,
    marketplaceContract,
    nftContract,
    collectionFactoryContract,
    isCorrectNetwork,
    loading,
    connectWallet,
    disconnect,
    switchToArcNetwork,
    checkNetworkInfo,
  }

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>
}

