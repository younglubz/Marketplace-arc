import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { useWeb3 } from '../context/Web3Context'
import { useNavigate } from 'react-router-dom'
import { uploadToIPFS, getIPFSUrl, uploadMetadataToIPFS, normalizeIPFSUrl } from '../utils/ipfs'
import CollectionNFTABI from '../abis/CollectionNFT.json'

// Componente de botão que verifica whitelist
function LaunchCardButton({ launch, isScheduled, account, buying, onMint, canMint }) {
  const [userCanMint, setUserCanMint] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkWhitelist = async () => {
      if (!account || !isScheduled || !launch.metadata.has_whitelist) {
        setUserCanMint(true)
        setChecking(false)
        return
      }
      
      try {
        const canUserMint = await canMint(launch)
        setUserCanMint(canUserMint)
      } catch (error) {
        console.error('Erro ao verificar whitelist:', error)
        setUserCanMint(false)
      } finally {
        setChecking(false)
      }
    }

    checkWhitelist()
  }, [account, isScheduled, launch, canMint])

  const isDisabled = buying === launch.templateTokenId || !account || checking || (isScheduled && launch.metadata.has_whitelist && userCanMint === false)

  let buttonText = 'Mint'
  if (buying === launch.templateTokenId) {
    buttonText = 'Minting...'
  } else if (!account) {
    buttonText = 'Connect Wallet'
  } else if (checking) {
    buttonText = 'Checking...'
  } else if (isScheduled && launch.metadata.has_whitelist && !userCanMint) {
    buttonText = 'Not Whitelisted'
  } else if (isScheduled && launch.metadata.has_whitelist) {
    buttonText = 'Mint Now (Whitelist)'
  } else if (isScheduled) {
    buttonText = 'Mint'
  }

  return (
    <button
      className="btn btn-primary"
      style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem' }}
      onClick={() => onMint(launch)}
      disabled={isDisabled}
    >
      {buttonText}
    </button>
  )
}

function Launchpad() {
  const { nftContract, account, isCorrectNetwork, collectionFactoryContract, signer } = useWeb3()
  const navigate = useNavigate()
  
  console.log('🎯 Launchpad: Componente renderizado', { 
    hasNftContract: !!nftContract, 
    account, 
    isCorrectNetwork 
  })
  
  // Estados para visualização
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [currentLaunches, setCurrentLaunches] = useState([])
  const [pastLaunches, setPastLaunches] = useState([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(null)

  // Estados para criação
  const [contractType, setContractType] = useState('new') // 'new' = CollectionFactory, 'legacy' = MockNFT
  const [launchType, setLaunchType] = useState('instant')
  const [scheduledTime, setScheduledTime] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [hasWhitelist, setHasWhitelist] = useState(false)
  const [whitelistType, setWhitelistType] = useState('nftContract')
  const [whitelistProject, setWhitelistProject] = useState('')
  const [whitelistAddresses, setWhitelistAddresses] = useState('')
  const [whitelistDuration, setWhitelistDuration] = useState('24')
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    supply: '1',
    twitter: '',
    discord: '',
    instagram: '',
    website: ''
  })
  
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageIPFSHash, setImageIPFSHash] = useState(null)
  const [collectionImages, setCollectionImages] = useState([]) // Array de imagens para coleções
  const [minting, setMinting] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Carrega lançamentos - busca todas as coleções do CollectionFactory
  const loadLaunches = useCallback(async () => {
    try {
      setLoading(true)
      console.log('🔍 Launchpad: Iniciando busca de coleções...')
      
      const allCollections = []
      
      // 1. Busca coleções do CollectionFactory
      if (collectionFactoryContract) {
        try {
          const factoryAddress = await collectionFactoryContract.getAddress()
          console.log('🏭 Buscando coleções do CollectionFactory:', factoryAddress)
          const collections = await collectionFactoryContract.getAllCollections()
          console.log(`📁 Coleções encontradas: ${collections.length}`)
          
          for (const collectionAddress of collections) {
            try {
              // Cria instância do contrato da coleção
              const collectionContract = new ethers.Contract(
                collectionAddress,
                CollectionNFTABI,
                signer || collectionFactoryContract.runner
              )
              
              // Obtém informações da coleção
              const collectionName = await collectionContract.collectionName()
              const maxSupply = await collectionContract.maxSupply()
              const totalSupply = await collectionContract.totalSupply()
              const creator = await collectionContract.creator()
              
              // Verifica quantos NFTs ainda estão disponíveis para mint público
              let availableForMint = 0
              let publicMintEnabled = false
              let contractMintPrice = 0n
              let rawAvailableURIs = 0
              try {
                rawAvailableURIs = Number(await collectionContract.availableURIsCount())
                availableForMint = rawAvailableURIs
                publicMintEnabled = await collectionContract.publicMintEnabled()
                contractMintPrice = await collectionContract.mintPrice()
                
                console.log(`🔍 [${collectionName}] Raw values:`, {
                  rawAvailableURIs,
                  publicMintEnabled,
                  totalSupply: Number(totalSupply),
                  maxSupply: Number(maxSupply)
                })
                
                // Fallback: Se não tem URIs mas ainda não mintou nada, usa maxSupply - totalSupply
                // Isso acontece com coleções antigas que foram criadas sem adicionar as URIs corretamente
                if (availableForMint === 0 && Number(totalSupply) < Number(maxSupply)) {
                  console.log(`⚠️ [${collectionName}] Using fallback: maxSupply - totalSupply`)
                  availableForMint = Number(maxSupply) - Number(totalSupply)
                }
              } catch (e) {
                console.log(`❌ [${collectionName}] Error getting contract data:`, e.message)
                // Se não suporta, calcula manualmente
                availableForMint = Number(maxSupply) - Number(totalSupply)
              }
              
              // No modelo de launchpad:
              // - O criador apenas OFERTA a coleção (não minta nada para si)
              // - Os compradores mintam diretamente via publicMint()
              // - totalSupply = quantos NFTs foram VENDIDOS/COMPRADOS
              // - available = quantos ainda podem ser comprados
              
              // "minted" = quantos NFTs foram vendidos (comprados por usuários)
              const minted = Number(totalSupply)
              
              // "available" = quantos NFTs ainda podem ser comprados
              const available = availableForMint
              
              console.log(`📊 Collection ${collectionName}:`, {
                maxSupply: Number(maxSupply),
                totalSupply: Number(totalSupply),
                availableURIsCount: availableForMint,
                publicMintEnabled,
                minted,
                available
              })
              
              // Converte o preço do contrato de wei para USDC (18 decimais)
              const mintPriceInUsdc = contractMintPrice > 0n 
                ? ethers.formatEther(contractMintPrice) 
                : '0'
              
              // Busca o primeiro NFT para obter metadados da coleção
              let metadata = {
                name: collectionName,
                description: '',
                image: '',
                initial_price: mintPriceInUsdc, // Usa o preço do contrato
                mint_price_wei: contractMintPrice.toString(), // Preço em wei para transações
                supply: Number(maxSupply),
                minted: minted, // Quantos foram vendidos/comprados por usuários
                available: available, // Quantos ainda podem ser comprados
                publicMintEnabled: publicMintEnabled,
                creator: creator
              }
              
              if (Number(totalSupply) > 0) {
                try {
                  const tokenURI = await collectionContract.tokenURI(1)
                  
                  // Tenta parsear metadados
                  try {
                    const parsed = JSON.parse(tokenURI)
                    metadata = {
                      ...metadata,
                      name: parsed.collection_name || collectionName,
                      description: parsed.description || '',
                      image: parsed.image ? normalizeIPFSUrl(parsed.image) : '',
                      // Prioriza o preço do contrato, se existir; senão usa dos metadados
                      initial_price: metadata.initial_price !== '0' ? metadata.initial_price : (parsed.initial_price || '0'),
                      social_links: parsed.social_links || {},
                      launch_time: parsed.launch_time || null,
                      has_whitelist: parsed.has_whitelist || false
                    }
                  } catch (e) {
                    // Se não for JSON, tenta buscar do IPFS
                    let metadataUrl = tokenURI
                    if (tokenURI.startsWith('ipfs://')) {
                      metadataUrl = tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
                    } else if (tokenURI.startsWith('Qm') || tokenURI.startsWith('baf')) {
                      metadataUrl = `https://gateway.pinata.cloud/ipfs/${tokenURI}`
                    }
                    
                    if (metadataUrl.startsWith('http')) {
                      try {
                        const response = await fetch(metadataUrl)
                        if (response.ok) {
                          const fetched = await response.json()
                          metadata = {
                            ...metadata,
                            name: fetched.collection_name || collectionName,
                            description: fetched.description || '',
                            image: fetched.image || '',
                            // Prioriza o preço do contrato, se existir; senão usa dos metadados
                            initial_price: metadata.initial_price !== '0' ? metadata.initial_price : (fetched.initial_price || '0'),
                            social_links: fetched.social_links || {},
                            launch_time: fetched.launch_time || null,
                            has_whitelist: fetched.has_whitelist || false
                          }
                          
                          // Normaliza imagem IPFS (trata hash, ipfs://, ou URL completa)
                          if (metadata.image) {
                            metadata.image = normalizeIPFSUrl(metadata.image)
                          }
                        }
                      } catch (fetchError) {
                        console.warn('Erro ao buscar metadados:', fetchError)
                      }
                    }
                  }
                } catch (uriError) {
                  console.warn('Erro ao buscar tokenURI:', uriError)
                }
              }
              
              allCollections.push({
                collectionAddress,
                collectionContract,
                metadata,
                isCollection: true
              })
              
              console.log(`✅ Coleção carregada: ${collectionName} (${Number(totalSupply)}/${Number(maxSupply)} minted)`)
            } catch (collError) {
              console.warn('Erro ao carregar coleção:', collectionAddress, collError.message)
            }
          }
        } catch (factoryError) {
          console.error('Erro ao buscar do CollectionFactory:', factoryError)
        }
      } else {
        console.log('⚠️ CollectionFactory não disponível')
      }
      
      console.log(`📊 Total de coleções carregadas: ${allCollections.length}`)
      
      // Separa em Current (disponíveis para mint/compra) e Past (esgotadas)
      const current = []
      const past = []
      
      allCollections.forEach(collection => {
        const available = collection.metadata.available !== undefined 
          ? collection.metadata.available 
          : (collection.metadata.supply - collection.metadata.minted)
        
        if (available > 0) {
          // Ainda tem NFTs disponíveis para compra/mint
          current.push(collection)
        } else {
          // Esgotada (vendida ou totalmente mintada)
          past.push(collection)
        }
      })
      
      console.log(`📈 Coleções disponíveis: ${current.length}, Esgotadas: ${past.length}`)
      
      setCurrentLaunches(current)
      setPastLaunches(past)
    } catch (error) {
      console.error('❌ Error loading launches:', error)
      setCurrentLaunches([])
      setPastLaunches([])
    } finally {
      setLoading(false)
      console.log('✅ Launchpad: Carregamento finalizado')
    }
  }, [collectionFactoryContract, signer])

  useEffect(() => {
    if (nftContract) {
      console.log('🚀 Launchpad: Iniciando carregamento de lançamentos')
      loadLaunches()
    } else {
      console.log('⚠️ Launchpad: nftContract não disponível, não é possível carregar lançamentos')
      setLoading(false)
    }
  }, [nftContract, loadLaunches])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.75) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          let width = img.width
          let height = img.height
          
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width
              width = maxWidth
            } else {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }
          
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const reader2 = new FileReader()
                reader2.onload = () => resolve({ blob, dataUrl: reader2.result })
                reader2.onerror = reject
                reader2.readAsDataURL(blob)
              } else {
                reject(new Error('Erro ao comprimir imagem'))
              }
            },
            'image/jpeg',
            quality
          )
        }
        img.onerror = reject
        img.src = e.target.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImageUpload = async (e) => {
    const files = e.target.files || e.dataTransfer?.files
    if (!files || files.length === 0) return

    const supply = parseInt(formData.supply) || 1
    const isCollection = supply > 1

    // Se for coleção, permite múltiplas imagens
    if (isCollection) {
      const fileArray = Array.from(files).slice(0, supply) // Limita ao supply
      
      try {
        setUploading(true)
        toast.loading(`Processando ${fileArray.length} imagem${fileArray.length > 1 ? 'ns' : ''}...`, { id: 'upload' })
        
        const processedImages = await Promise.all(
          fileArray.map(async (file, index) => {
            if (!file.type.startsWith('image/')) {
              throw new Error(`Arquivo ${index + 1} não é uma imagem`)
            }
            
            const compressed = await compressImage(file)
            const ipfsHash = await uploadToIPFS(compressed.blob, file.name)
            
            return {
              file,
              preview: compressed.dataUrl,
              ipfsHash,
              ipfsUrl: getIPFSUrl(ipfsHash),
              rarity: null // Será calculado depois
            }
          })
        )
        
        // Calcula raridade baseada na ordem (primeira imagem = mais rara)
        const imagesWithRarity = processedImages.map((img, index) => ({
          ...img,
          rarity: index + 1, // Ordem crescente: 1 = mais raro, último = menos raro
          rarityScore: processedImages.length - index // Score inverso: maior = mais raro
        }))
        
        setCollectionImages(imagesWithRarity)
        setImagePreview(imagesWithRarity[0].preview) // Preview da primeira
        setImageIPFSHash(imagesWithRarity[0].ipfsHash)
        setImageFile(fileArray[0])
        
        toast.success(`${fileArray.length} image${fileArray.length > 1 ? 's' : ''} processed! Rarity ranking created.`, { id: 'upload', duration: 5000 })
      } catch (error) {
        console.error('Erro ao processar imagens:', error)
        toast.error(`Erro ao processar imagens: ${error.message}`, { id: 'upload' })
      } finally {
        setUploading(false)
      }
    } else {
      // NFT único: comportamento normal
      const file = files[0]
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de imagem')
        return
      }

      try {
        setUploading(true)
        toast.loading('Processando e fazendo upload da imagem...', { id: 'upload' })
        
        const compressed = await compressImage(file)
        const ipfsHash = await uploadToIPFS(compressed.blob, file.name)
        
        setImageIPFSHash(ipfsHash)
        setImageFile(file)
        setImagePreview(getIPFSUrl(ipfsHash))
        setCollectionImages([]) // Limpa imagens de coleção
        
        toast.success('Imagem enviada para IPFS com sucesso!', { id: 'upload' })
      } catch (error) {
        console.error('Erro ao processar/upload imagem:', error)
        toast.error('Erro ao fazer upload para IPFS', { id: 'upload' })
        try {
          const compressed = await compressImage(file)
          setImageFile(file)
          setImagePreview(compressed.dataUrl)
          setImageIPFSHash(null)
        } catch (compressError) {
          toast.error('Erro ao processar imagem', { id: 'upload' })
        }
      } finally {
        setUploading(false)
      }
    }
  }

  const calculateLaunchTime = () => {
    if (launchType === 'instant') {
      return Math.floor(Date.now() / 1000)
    }
    
    if (!scheduledDate || !scheduledTime) {
      return null
    }
    
    const dateTime = new Date(`${scheduledDate}T${scheduledTime}`)
    return Math.floor(dateTime.getTime() / 1000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!account) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!isCorrectNetwork) {
      toast.error('Please connect to Arc Testnet')
      return
    }

    if (!formData.name || !formData.description) {
      toast.error('Please fill all required fields')
      return
    }

    const supply = parseInt(formData.supply) || 1
    const isCollection = supply > 1
    
    if (isCollection) {
      if (collectionImages.length === 0 && !imagePreview && !imageIPFSHash) {
        toast.error(`Please add ${supply} image${supply > 1 ? 's' : ''} for the collection`)
        return
      }
      if (collectionImages.length > 0 && collectionImages.length < supply) {
        toast.error(`You need to add ${supply} images for the collection. You added ${collectionImages.length}.`)
        return
      }
    } else {
      if (!imagePreview && !imageIPFSHash) {
        toast.error('Please add an image for the NFT')
        return
      }
    }

    const launchTime = calculateLaunchTime()
    if (launchType === 'scheduled' && (!launchTime || launchTime <= Math.floor(Date.now() / 1000))) {
      toast.error('Select a future date/time for the launch')
      return
    }

    try {
      setMinting(true)
      toast.loading('Creating launch...', { id: 'launch' })

      const supply = parseInt(formData.supply) || 1
      const collectionName = supply > 1 ? formData.name : formData.name
      const isCollection = supply > 1 && collectionImages.length > 0
      
      // Determina se deve usar o contrato legado
      const useLegacyContract = contractType === 'legacy' || !collectionFactoryContract
      
      console.log('🎯 Launchpad: Tipo de contrato selecionado:', {
        contractType,
        useLegacyContract,
        hasFactory: !!collectionFactoryContract,
        factoryAddress: collectionFactoryContract?.target || 'N/A'
      })
      
      // Aviso importante: Se o usuário selecionou "new" mas não tem Factory
      if (contractType === 'new' && !collectionFactoryContract) {
        console.error('⚠️ CollectionFactory não disponível! Usando Legacy como fallback.')
        toast.error('CollectionFactory not available. Using Legacy Contract instead. Your collection will not support royalties.', { id: 'launch', duration: 5000 })
      }

      // Se for coleção com múltiplas imagens, cria um contrato de coleção e NFTs para cada imagem
      if (isCollection && collectionImages.length > 0) {
        const imagesToProcess = collectionImages.slice(0, supply) // Limita ao supply
        
        console.log('🏭 Launchpad: Criando coleção...', {
          hasFactory: !!collectionFactoryContract,
          factoryAddress: collectionFactoryContract?.target || 'N/A',
          supply,
          imagesCount: imagesToProcess.length,
          useLegacyContract
        })
        
        try {
          // Usa Legacy Contract se selecionado ou se Factory não estiver disponível
          if (useLegacyContract) {
            console.log('📦 Usando contrato Legacy (MockNFT) para criar coleção...')
            toast.loading(`Creating collection with ${imagesToProcess.length} NFTs using MockNFT...`, { id: 'launch' })
            
            // Fallback: usa MockNFT para criar a coleção
            for (let i = 0; i < imagesToProcess.length; i++) {
              const img = imagesToProcess[i]
              const editionNumber = i + 1
              const rarityPercent = ((imagesToProcess.length - i) / imagesToProcess.length * 100).toFixed(2)
              
              const nftMetadata = {
                name: `${collectionName} #${editionNumber}`,
                description: formData.description,
                image: img.ipfsUrl,
                external_url: formData.website || '',
                initial_price: formData.price || '0',
                collection_name: collectionName,
                collection_supply: supply,
                edition_number: editionNumber,
                is_collection: true,
                rarity: {
                  rank: img.rarity,
                  score: img.rarityScore,
                  percentile: `${rarityPercent}%`
                },
                attributes: [
                  { trait_type: 'Rarity Rank', value: img.rarity.toString() },
                  { trait_type: 'Rarity Score', value: img.rarityScore.toString() },
                  { trait_type: 'Collection', value: collectionName },
                  { trait_type: 'Edition', value: `${editionNumber} of ${supply}` }
                ],
                ...(launchTime && launchType !== 'instant' && { launch_time: launchTime }),
                has_whitelist: hasWhitelist,
                whitelist_type: hasWhitelist ? whitelistType : null,
                whitelist_project: hasWhitelist && (whitelistType === 'nftContract' || whitelistType === 'project') ? whitelistProject : null,
                whitelist_addresses: hasWhitelist && whitelistType === 'addresses' ? whitelistAddresses.split('\n').filter(a => a.trim()) : null,
                whitelist_duration: hasWhitelist ? parseInt(whitelistDuration) : null,
                social_links: {
                  twitter: formData.twitter || '',
                  discord: formData.discord || '',
                  instagram: formData.instagram || ''
                }
              }
              
              if (launchType === 'instant') {
                delete nftMetadata.launch_time
              }
              
              let nftTokenURI = ''
              try {
                const metadataHash = await uploadMetadataToIPFS(nftMetadata)
                nftTokenURI = getIPFSUrl(metadataHash)
              } catch (ipfsError) {
                nftTokenURI = JSON.stringify(nftMetadata)
              }
              
              toast.loading(`Minting NFT ${editionNumber} of ${imagesToProcess.length} (Rarity: ${rarityPercent}%)...`, { id: 'launch' })
              const tx = await nftContract.mint(account, nftTokenURI)
              await tx.wait()
              
              if (i < imagesToProcess.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500))
              }
            }
            
            toast.success(`Collection created successfully! ${imagesToProcess.length} NFT${imagesToProcess.length > 1 ? 's' : ''} with rarity ranking.`, { id: 'launch', duration: 6000 })
            
            // Limpa o formulário
            setFormData({
              name: '',
              description: '',
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
            setCollectionImages([])
            setLaunchType('instant')
            setContractType('new')
            setScheduledTime('')
            setScheduledDate('')
            setHasWhitelist(false)
            setShowCreateForm(false)
            
            setTimeout(() => {
              loadLaunches()
              navigate('/my-nfts')
            }, 2000)
            
            setMinting(false)
            return
          }
          
          toast.loading(`Creating collection contract...`, { id: 'launch' })
          
          // Cria o contrato da coleção
          const createTx = await collectionFactoryContract.createCollection(collectionName, supply)
          
          // Obtém o endereço do contrato criado através do evento
          const receipt = await createTx.wait()
          const collectionCreatedEvent = receipt.logs.find(
            log => {
              try {
                const parsed = collectionFactoryContract.interface.parseLog(log)
                return parsed && parsed.name === 'CollectionCreated'
              } catch {
                return false
              }
            }
          )
          
          let collectionAddress
          if (collectionCreatedEvent) {
            const parsed = collectionFactoryContract.interface.parseLog(collectionCreatedEvent)
            collectionAddress = parsed.args.collectionAddress
          } else {
            // Fallback: busca a última coleção do criador
            const creatorCollections = await collectionFactoryContract.getCreatorCollections(account)
            collectionAddress = creatorCollections[creatorCollections.length - 1]
          }
          
          console.log('✅ Collection contract created at:', collectionAddress)
          
          // Cria instância do contrato CollectionNFT usando o signer do usuário
          const collectionContract = new ethers.Contract(
            collectionAddress,
            CollectionNFTABI,
            signer
          )
          
          // Define o preço de mint no contrato (em wei - USDC tem 18 decimais)
          const priceInWei = formData.price && parseFloat(formData.price) > 0 
            ? ethers.parseEther(formData.price) 
            : 0n
          
          if (priceInWei > 0n) {
            toast.loading('Setting mint price...', { id: 'launch' })
            const setPriceTx = await collectionContract.setMintPrice(priceInWei)
            await setPriceTx.wait()
            console.log('✅ Mint price set to:', formData.price, 'USDC')
          }
          
          toast.loading(`Minting ${imagesToProcess.length} NFTs to collection...`, { id: 'launch' })
          
          // Cria metadados para cada NFT da coleção
          const tokenURIs = []
          for (let i = 0; i < imagesToProcess.length; i++) {
            const img = imagesToProcess[i]
            const editionNumber = i + 1
            
            // Calcula percentual de raridade
            const rarityPercent = ((imagesToProcess.length - i) / imagesToProcess.length * 100).toFixed(2)
            
            const nftMetadata = {
              name: `${collectionName} #${editionNumber}`,
              description: formData.description,
              image: img.ipfsUrl,
              external_url: formData.website || '',
              initial_price: formData.price || '0',
              collection_name: collectionName,
              collection_supply: supply,
              edition_number: editionNumber,
              is_collection: true,
              rarity: {
                rank: img.rarity, // 1 = mais raro
                score: img.rarityScore, // Score maior = mais raro
                percentile: `${rarityPercent}%` // Percentil de raridade
              },
              attributes: [
                {
                  trait_type: 'Rarity Rank',
                  value: img.rarity.toString()
                },
                {
                  trait_type: 'Rarity Score',
                  value: img.rarityScore.toString()
                },
                {
                  trait_type: 'Collection',
                  value: collectionName
                },
                {
                  trait_type: 'Edition',
                  value: `${editionNumber} of ${supply}`
                }
              ],
              ...(launchTime && { launch_time: launchTime }),
              has_whitelist: hasWhitelist,
              whitelist_type: hasWhitelist ? whitelistType : null,
              whitelist_project: hasWhitelist && (whitelistType === 'nftContract' || whitelistType === 'project') ? whitelistProject : null,
              whitelist_addresses: hasWhitelist && whitelistType === 'addresses' ? whitelistAddresses.split('\n').filter(a => a.trim()) : null,
              whitelist_duration: hasWhitelist ? parseInt(whitelistDuration) : null,
              social_links: {
                twitter: formData.twitter || '',
                discord: formData.discord || '',
                instagram: formData.instagram || ''
              }
            }
            
            // Remove launch_time se for instantâneo
            if (launchType === 'instant') {
              delete nftMetadata.launch_time
            }
            
            let nftTokenURI = ''
            try {
              const metadataHash = await uploadMetadataToIPFS(nftMetadata)
              nftTokenURI = getIPFSUrl(metadataHash)
            } catch (ipfsError) {
              console.warn('Erro ao fazer upload de metadados para IPFS, usando JSON inline:', ipfsError)
              nftTokenURI = JSON.stringify(nftMetadata)
            }
            
            tokenURIs.push(nftTokenURI)
          }
          
          // Adiciona as URIs ao contrato para permitir mint público
          toast.loading('Adding token URIs to collection...', { id: 'launch' })
          const addURIsTx = await collectionContract.addTokenURIs(tokenURIs)
          await addURIsTx.wait()
          console.log('✅ Token URIs added to collection')
          
          // Habilita o mint público para que compradores possam comprar
          toast.loading('Enabling public mint...', { id: 'launch' })
          const enablePublicMintTx = await collectionContract.setPublicMintEnabled(true)
          await enablePublicMintTx.wait()
          console.log('✅ Public mint enabled')
          
          toast.success(`Collection created successfully! ${imagesToProcess.length} NFT${imagesToProcess.length > 1 ? 's' : ''} available for purchase at ${formData.price || '0'} USDC each.`, { id: 'launch', duration: 6000 })
          
          // Limpa o formulário
          setFormData({
            name: '',
            description: '',
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
          setCollectionImages([])
          setLaunchType('instant')
          setContractType('new')
          setScheduledTime('')
          setScheduledDate('')
          setHasWhitelist(false)
          setShowCreateForm(false)
          
          // Recarrega lançamentos
          setTimeout(() => {
            loadLaunches()
            navigate('/my-nfts')
          }, 2000)
          
          setMinting(false)
          return
        } catch (error) {
          console.error('Erro ao criar coleção:', error)
          throw error
        }
      }

      // NFT único ou coleção sem múltiplas imagens (usa imagem única)
      const imageUrl = imageIPFSHash ? getIPFSUrl(imageIPFSHash) : imagePreview
      
      const metadata = {
        name: supply > 1 ? `${collectionName} #1` : formData.name, // Primeiro NFT da coleção sempre é #1
        description: formData.description,
        image: imageUrl,
        external_url: formData.website || '',
        initial_price: formData.price || '0',
        collection_name: supply > 1 ? collectionName : null, // Nome base da coleção
        collection_supply: supply > 1 ? supply : null, // Supply total da coleção
        edition_number: supply > 1 ? 1 : null, // Número da edição (1 de supply)
        is_collection: supply > 1, // Indica se é parte de uma coleção
        contract_type: useLegacyContract ? 'legacy' : 'new', // Tipo de contrato usado
        ...(launchTime && { launch_time: launchTime }), // Só inclui launch_time se não for null
        has_whitelist: hasWhitelist,
        whitelist_type: hasWhitelist ? whitelistType : null,
        whitelist_project: hasWhitelist && (whitelistType === 'nftContract' || whitelistType === 'project') ? whitelistProject : null,
        whitelist_addresses: hasWhitelist && whitelistType === 'addresses' ? whitelistAddresses.split('\n').filter(a => a.trim()) : null,
        whitelist_duration: hasWhitelist ? parseInt(whitelistDuration) : null,
        social_links: {
          twitter: formData.twitter || '',
          discord: formData.discord || '',
          instagram: formData.instagram || ''
        }
      }

      let tokenURI = ''
      try {
        const metadataHash = await uploadMetadataToIPFS(metadata)
        tokenURI = getIPFSUrl(metadataHash)
      } catch (ipfsError) {
        console.warn('Erro ao fazer upload de metadados para IPFS, usando JSON inline:', ipfsError)
        tokenURI = JSON.stringify(metadata)
      }

      // Se for coleção (supply > 1), tenta criar contrato de coleção ou usa MockNFT
      if (supply > 1) {
        // Usa Legacy Contract se selecionado ou se Factory não estiver disponível
        if (useLegacyContract) {
          console.log('📦 Usando contrato Legacy (MockNFT) para criar coleção simples...')
          toast.loading('Creating collection using MockNFT...', { id: 'launch' })
          
          // Usa MockNFT para criar a coleção
          if (launchType === 'instant') {
            const instantMetadata = { ...metadata }
            delete instantMetadata.launch_time
            
            let instantTokenURI = ''
            try {
              const instantMetadataHash = await uploadMetadataToIPFS(instantMetadata)
              instantTokenURI = getIPFSUrl(instantMetadataHash)
            } catch (ipfsError) {
              instantTokenURI = JSON.stringify(instantMetadata)
            }
            
            const tx = await nftContract.mint(account, instantTokenURI)
            await tx.wait()
            
            toast.success(`Collection created successfully! This collection will have ${supply} units.`, { id: 'launch', duration: 6000 })
          } else {
            const tx = await nftContract.mint(account, tokenURI)
            await tx.wait()
            
            toast.success(`Scheduled collection created! Will have ${supply} units and will be displayed on ${new Date(launchTime * 1000).toLocaleString()}`, { id: 'launch', duration: 8000 })
          }
          
          // Limpa o formulário e retorna
          setFormData({
            name: '',
            description: '',
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
          setCollectionImages([])
          setLaunchType('instant')
          setContractType('new')
          setScheduledTime('')
          setScheduledDate('')
          setHasWhitelist(false)
          setShowCreateForm(false)
          
          setTimeout(() => {
            loadLaunches()
            navigate('/my-nfts')
          }, 2000)
          
          setMinting(false)
          return
        }
        
        if (launchType === 'instant') {
          // Para lançamentos instantâneos, não inclui launch_time
          const instantMetadata = { ...metadata }
          delete instantMetadata.launch_time
          
          // Refaz upload dos metadados sem launch_time
          let instantTokenURI = ''
          try {
            const instantMetadataHash = await uploadMetadataToIPFS(instantMetadata)
            instantTokenURI = getIPFSUrl(instantMetadataHash)
          } catch (ipfsError) {
            console.warn('Erro ao fazer upload de metadados para IPFS, usando JSON inline:', ipfsError)
            instantTokenURI = JSON.stringify(instantMetadata)
          }
          
          toast.loading('Creating collection contract...', { id: 'launch' })
          
          // Cria o contrato da coleção
          const createTx = await collectionFactoryContract.createCollection(collectionName, supply)
          const receipt = await createTx.wait()
          
          // Obtém o endereço do contrato criado através do evento
          const collectionCreatedEvent = receipt.logs.find(
            log => {
              try {
                const parsed = collectionFactoryContract.interface.parseLog(log)
                return parsed && parsed.name === 'CollectionCreated'
              } catch {
                return false
              }
            }
          )
          
          let collectionAddress
          if (collectionCreatedEvent) {
            const parsed = collectionFactoryContract.interface.parseLog(collectionCreatedEvent)
            collectionAddress = parsed.args.collectionAddress
          } else {
            const creatorCollections = await collectionFactoryContract.getCreatorCollections(account)
            collectionAddress = creatorCollections[creatorCollections.length - 1]
          }
          
          // Cria instância do contrato CollectionNFT usando o signer do usuário
          const collectionContract = new ethers.Contract(
            collectionAddress,
            CollectionNFTABI,
            signer
          )
          
          // Define o preço de mint no contrato (em wei - USDC tem 18 decimais)
          const priceInWei = formData.price && parseFloat(formData.price) > 0 
            ? ethers.parseEther(formData.price) 
            : 0n
          
          if (priceInWei > 0n) {
            toast.loading('Setting mint price...', { id: 'launch' })
            const setPriceTx = await collectionContract.setMintPrice(priceInWei)
            await setPriceTx.wait()
            console.log('✅ Mint price set to:', formData.price, 'USDC')
          }
          
          // Adiciona as URIs ao contrato para mint público (uma URI por unidade de supply)
          toast.loading('Adding token URIs to collection...', { id: 'launch' })
          const urisToAdd = Array(supply).fill(instantTokenURI)
          console.log(`📝 Adding ${urisToAdd.length} URIs to collection...`)
          const addURITx = await collectionContract.addTokenURIs(urisToAdd)
          await addURITx.wait()
          
          // Verifica se as URIs foram adicionadas
          const addedURIsCount = await collectionContract.availableURIsCount()
          console.log(`✅ Added ${supply} token URIs to collection. Available URIs count: ${addedURIsCount}`)
          
          // Habilita o mint público
          toast.loading('Enabling public mint...', { id: 'launch' })
          const enableMintTx = await collectionContract.setPublicMintEnabled(true)
          await enableMintTx.wait()
          
          // Verifica status final
          const finalPublicMintEnabled = await collectionContract.publicMintEnabled()
          console.log(`✅ Public mint enabled: ${finalPublicMintEnabled}`)
          
          toast.success(`Collection created successfully! ${supply} units available for ${formData.price || 'free'} USDC each.`, { id: 'launch', duration: 6000 })
        } else {
          // Coleção agendada
          toast.loading('Creating scheduled collection contract...', { id: 'launch' })
          
          const createTx = await collectionFactoryContract.createCollection(collectionName, supply)
          const receipt = await createTx.wait()
          
          const collectionCreatedEvent = receipt.logs.find(
            log => {
              try {
                const parsed = collectionFactoryContract.interface.parseLog(log)
                return parsed && parsed.name === 'CollectionCreated'
              } catch {
                return false
              }
            }
          )
          
          let collectionAddress
          if (collectionCreatedEvent) {
            const parsed = collectionFactoryContract.interface.parseLog(collectionCreatedEvent)
            collectionAddress = parsed.args.collectionAddress
          } else {
            const creatorCollections = await collectionFactoryContract.getCreatorCollections(account)
            collectionAddress = creatorCollections[creatorCollections.length - 1]
          }
          
          const collectionContract = new ethers.Contract(
            collectionAddress,
            CollectionNFTABI,
            signer
          )
          
          // Define o preço de mint no contrato (em wei - USDC tem 18 decimais)
          const priceInWei = formData.price && parseFloat(formData.price) > 0 
            ? ethers.parseEther(formData.price) 
            : 0n
          
          if (priceInWei > 0n) {
            toast.loading('Setting mint price...', { id: 'launch' })
            const setPriceTx = await collectionContract.setMintPrice(priceInWei)
            await setPriceTx.wait()
            console.log('✅ Mint price set to:', formData.price, 'USDC')
          }
          
          // Adiciona as URIs ao contrato para mint público (uma URI por unidade de supply)
          toast.loading('Adding token URIs to collection...', { id: 'launch' })
          const urisToAdd = Array(supply).fill(tokenURI)
          const addURITx = await collectionContract.addTokenURIs(urisToAdd)
          await addURITx.wait()
          console.log(`✅ Added ${supply} token URIs to collection`)
          
          // Habilita o mint público
          toast.loading('Enabling public mint...', { id: 'launch' })
          const enableMintTx = await collectionContract.setPublicMintEnabled(true)
          await enableMintTx.wait()
          
          toast.success(`Scheduled collection created! ${supply} units available at ${formData.price || 'free'} USDC. Launches on ${new Date(launchTime * 1000).toLocaleString()}`, { id: 'launch', duration: 8000 })
        }
      } else {
        // NFT único: usa MockNFT
        if (launchType === 'instant') {
          const instantMetadata = { ...metadata }
          delete instantMetadata.launch_time
          
          let instantTokenURI = ''
          try {
            const instantMetadataHash = await uploadMetadataToIPFS(instantMetadata)
            instantTokenURI = getIPFSUrl(instantMetadataHash)
          } catch (ipfsError) {
            instantTokenURI = JSON.stringify(instantMetadata)
          }
          
          toast.loading('Creating NFT...', { id: 'launch' })
          const tx = await nftContract.mint(account, instantTokenURI)
          await tx.wait()
          
          toast.success(`NFT created successfully!`, { id: 'launch' })
        } else {
          toast.loading('Creating scheduled NFT...', { id: 'launch' })
          const tx = await nftContract.mint(account, tokenURI)
          await tx.wait()
          
          toast.success(`Scheduled launch created! Will be displayed on ${new Date(launchTime * 1000).toLocaleString()}`, { id: 'launch', duration: 8000 })
        }
      }

      // Limpa o formulário
      setFormData({
        name: '',
        description: '',
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
      setLaunchType('instant')
      setContractType('new')
      setScheduledTime('')
      setScheduledDate('')
      setHasWhitelist(false)
      setShowCreateForm(false)
      
      // Recarrega lançamentos
      setTimeout(() => {
        loadLaunches()
        navigate('/my-nfts')
      }, 2000)

    } catch (error) {
      console.error('Error creating launch:', error)
      toast.error(`Error creating launch: ${error.message?.substring(0, 100) || 'Unknown error'}`, { id: 'launch' })
    } finally {
      setMinting(false)
    }
  }


  // Verifica se usuário pode mintar (whitelist)
  const canMint = useCallback(async (launch) => {
    if (!account || !launch.metadata.has_whitelist) {
      return true // Sem whitelist, pode mintar
    }

    const now = Math.floor(Date.now() / 1000)
    const launchTime = launch.metadata.launch_time
    const whitelistEndTime = launchTime + (launch.metadata.whitelist_duration * 3600 || 86400)

    // Se passou o tempo de whitelist, todos podem mintar
    if (now > whitelistEndTime) {
      return true
    }

    // Verifica whitelist por projeto NFT
    if ((launch.metadata.whitelist_type === 'project' || launch.metadata.whitelist_type === 'nftContract') && launch.metadata.whitelist_project) {
      try {
        const provider = nftContract.runner || nftContract.provider
        const whitelistContract = new ethers.Contract(
          launch.metadata.whitelist_project,
          nftContract.interface,
          provider
        )
        
        // Verifica se o usuário possui pelo menos 1 NFT do contrato
        const balance = await whitelistContract.balanceOf(account)
        return Number(balance) > 0
      } catch (error) {
        console.error('Erro ao verificar whitelist por projeto:', error)
        return false
      }
    } else if (launch.metadata.whitelist_type === 'addresses' && launch.metadata.whitelist_addresses) {
      const addresses = Array.isArray(launch.metadata.whitelist_addresses) 
        ? launch.metadata.whitelist_addresses 
        : typeof launch.metadata.whitelist_addresses === 'string'
        ? launch.metadata.whitelist_addresses.split('\n').filter(a => a.trim())
        : []
      return addresses.some(addr => addr.toLowerCase() === account.toLowerCase())
    }

    return false
  }, [account, nftContract])

  // Compra um NFT de uma coleção criada pelo CollectionFactory
  const mintFromCollection = async (launch) => {
    if (!account) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!isCorrectNetwork) {
      toast.error('Please connect to Arc Testnet')
      return
    }

    try {
      setBuying(launch.collectionAddress)
      
      // Usa o contrato da coleção diretamente
      const collectionContract = new ethers.Contract(
        launch.collectionAddress,
        CollectionNFTABI,
        signer
      )

      // Verifica se ainda há NFTs disponíveis
      const availableURIs = await collectionContract.availableURIsCount()
      if (Number(availableURIs) === 0) {
        toast.error('Collection is sold out!', { id: 'mint' })
        setBuying(null)
        return
      }

      // Verifica se o mint público está habilitado
      const publicMintEnabled = await collectionContract.publicMintEnabled()
      if (!publicMintEnabled) {
        toast.error('Public mint is not enabled for this collection', { id: 'mint' })
        setBuying(null)
        return
      }

      // Obtém o preço de mint do contrato
      const mintPrice = await collectionContract.mintPrice()
      const priceInUsdc = ethers.formatEther(mintPrice)
      
      console.log('💰 Mint price:', priceInUsdc, 'USDC')
      
      // Verifica se o usuário tem saldo suficiente
      const balance = await signer.provider.getBalance(account)
      if (balance < mintPrice) {
        toast.error(`Insufficient balance. You need ${priceInUsdc} USDC`, { id: 'mint' })
        setBuying(null)
        return
      }

      // Mostra o preço ao usuário
      if (mintPrice > 0n) {
        toast.loading(`Purchasing NFT for ${priceInUsdc} USDC...`, { id: 'mint' })
      } else {
        toast.loading('Minting free NFT...', { id: 'mint' })
      }

      // Usa publicMint que é payable e envia o valor do preço
      const tx = await collectionContract.publicMint(1, { value: mintPrice })
      await tx.wait()

      toast.success(`NFT purchased successfully for ${priceInUsdc} USDC!`, { id: 'mint' })
      loadLaunches()
    } catch (error) {
      console.error('Error purchasing NFT:', error)
      
      // Mensagens de erro mais amigáveis
      let errorMsg = error.message?.substring(0, 100) || 'Unknown error'
      if (error.message?.includes('insufficient funds')) {
        errorMsg = 'Insufficient USDC balance'
      } else if (error.message?.includes('Public mint not enabled')) {
        errorMsg = 'Public mint is not enabled'
      } else if (error.message?.includes('No URIs available')) {
        errorMsg = 'Collection is sold out'
      }
      
      toast.error(`Error purchasing: ${errorMsg}`, { id: 'mint' })
    } finally {
      setBuying(null)
    }
  }

  const mintLaunchNFT = async (launch) => {
    if (!account) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!isCorrectNetwork) {
      toast.error('Please connect to Arc Testnet')
      return
    }

    const now = Math.floor(Date.now() / 1000)
    const launchTime = launch.metadata.launch_time

    // Verifica se já pode mintar
    if (launchTime && launchTime > now) {
      const canUserMint = await canMint(launch)
      if (!canUserMint) {
        toast.error('Você não está na whitelist para este lançamento')
        return
      }
    }

    try {
      setBuying(launch.templateTokenId)
      toast.loading('Mintando NFT...', { id: 'mint' })

      // Busca o tokenURI do template
      const templateTokenURI = await nftContract.tokenURI(launch.templateTokenId)
      
      // Cria metadata sem launch_time (já está sendo mintado)
      let metadata
      try {
        // Tenta parsear se for JSON direto
        metadata = JSON.parse(templateTokenURI)
      } catch (e) {
        // Se não for JSON, tenta buscar do IPFS
        let metadataUrl = templateTokenURI
        if (templateTokenURI.startsWith('ipfs://')) {
          const ipfsHash = templateTokenURI.replace('ipfs://', '')
          metadataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
        } else if (templateTokenURI.startsWith('Qm') || templateTokenURI.startsWith('baf')) {
          metadataUrl = `https://gateway.pinata.cloud/ipfs/${templateTokenURI}`
        }
        
        if (metadataUrl.startsWith('http')) {
          const response = await fetch(metadataUrl)
          if (response.ok) {
            metadata = await response.json()
          } else {
            throw new Error('Não foi possível carregar metadados')
          }
        } else {
          throw new Error('URI de metadados inválida')
        }
      }
      
      // Remove informações de lançamento dos metadados
      delete metadata.launch_time
      delete metadata.has_whitelist
      delete metadata.whitelist_type
      delete metadata.whitelist_project
      delete metadata.whitelist_addresses
      delete metadata.whitelist_duration

      // Faz upload dos metadados atualizados
      let finalTokenURI
      try {
        const metadataHash = await uploadMetadataToIPFS(metadata)
        finalTokenURI = getIPFSUrl(metadataHash)
      } catch (ipfsError) {
        console.warn('Erro ao fazer upload de metadados atualizados, usando JSON inline:', ipfsError)
        finalTokenURI = JSON.stringify(metadata)
      }

      // Minta o NFT (NFT único sempre usa MockNFT)
      const tx = await nftContract.mint(account, finalTokenURI)
      await tx.wait()

      toast.success('NFT mintado com sucesso!', { id: 'mint' })
      loadLaunches()
    } catch (error) {
      console.error('Error minting NFT:', error)
      toast.error(`Error minting NFT: ${error.message?.substring(0, 100) || 'Unknown error'}`, { id: 'mint' })
    } finally {
      setBuying(null)
    }
  }

  const formatTimeRemaining = (timestamp) => {
    const now = Math.floor(Date.now() / 1000)
    const diff = timestamp - now
    
    if (diff <= 0) return 'Launched'
    
    const days = Math.floor(diff / 86400)
    const hours = Math.floor((diff % 86400) / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const renderLaunchCard = (launch) => {
    const isCollection = launch.isCollection
    const minted = launch.metadata.minted || 0 // NFTs vendidos
    const supply = launch.metadata.supply || 0
    const available = launch.metadata.available !== undefined ? launch.metadata.available : (supply - minted)
    const progress = supply > 0 ? (minted / supply) * 100 : 0
    
    return (
      <div 
        key={launch.collectionAddress || launch.templateTokenId} 
        className="nft-card" 
        style={{ 
          background: 'var(--surface-alt)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <div className="nft-image" style={{ height: '300px', overflow: 'hidden', position: 'relative' }}>
          {launch.metadata.image ? (
            <img 
              src={normalizeIPFSUrl(launch.metadata.image)}
              alt={launch.metadata.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                console.error('Erro ao carregar imagem:', launch.metadata.image)
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
              fontSize: '4rem',
              background: 'var(--background)'
            }}>
              🖼️
            </div>
          )}
          {/* Badge de Supply */}
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: available > 0 ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            {available > 0 ? `${available} left` : 'Sold Out'}
          </div>
          {/* Badge de Coleção */}
          {isCollection && (
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              background: 'rgba(212, 175, 55, 0.9)',
              color: 'var(--text)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}>
              📦 Collection
            </div>
          )}
        </div>
        <div className="nft-content" style={{ padding: '1rem', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 className="nft-title" style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
            {launch.metadata.name}
          </h3>
          <p className="nft-description" style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {launch.metadata.description?.substring(0, 80)}
            {launch.metadata.description?.length > 80 ? '...' : ''}
          </p>
          
          {/* Barra de Progresso */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Minted</span>
              <span style={{ fontWeight: '600' }}>{minted} / {supply}</span>
            </div>
            <div style={{ 
              height: '8px', 
              background: 'var(--border)', 
              borderRadius: '4px', 
              overflow: 'hidden' 
            }}>
              <div style={{ 
                width: `${progress}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, var(--primary), var(--accent-gold))',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
          
          {/* Preço */}
          <div className="nft-price" style={{ marginBottom: '0.75rem' }}>
            <div style={{ width: '100%' }}>
              <div className="price-label">
                {launch.metadata.initial_price && parseFloat(launch.metadata.initial_price) > 0 
                  ? 'Purchase Price' 
                  : 'Price'}
              </div>
              <div className="price-value" style={{ marginTop: '0.25rem', fontSize: '1.125rem' }}>
                💵 {launch.metadata.initial_price && parseFloat(launch.metadata.initial_price) > 0 
                  ? `${launch.metadata.initial_price} USDC` 
                  : 'Free'}
              </div>
            </div>
          </div>
          
          {/* Info de taxas para o comprador */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            padding: '0.5rem',
            background: 'var(--surface-alt)',
            borderRadius: '6px',
            marginBottom: '0.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>💰 Você paga:</span>
              <span style={{ fontWeight: '600', color: 'var(--text)' }}>
                {launch.metadata.initial_price || '0'} USDC
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>👑 Royalty (revenda):</span>
              <span>5%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🏷️ Taxa marketplace (revenda):</span>
              <span>2.5%</span>
            </div>
          </div>
          
          {/* Criador */}
          {launch.metadata.creator && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-secondary)', 
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>👤</span>
              <span>{launch.metadata.creator.substring(0, 6)}...{launch.metadata.creator.substring(38)}</span>
            </div>
          )}
          
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', marginTop: 'auto' }}
            onClick={() => mintFromCollection(launch)}
            disabled={buying === launch.collectionAddress || available <= 0 || !account}
          >
            {buying === launch.collectionAddress ? 'Purchasing...' : 
             available <= 0 ? 'Sold Out' :
             !account ? 'Connect Wallet' : 
             launch.metadata.initial_price && parseFloat(launch.metadata.initial_price) > 0 
               ? `Buy for ${launch.metadata.initial_price} USDC` 
               : 'Mint Free'}
          </button>
        </div>
      </div>
    )
  }


  return (
    <div className="container">
      <section style={{ padding: '3rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="section-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              Launchpad
            </h1>
            <p className="section-subtitle">
              Discover and participate in the most awaited NFT launches
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{ padding: '0.75rem 1.5rem' }}
          >
            {showCreateForm ? 'Cancel' : '+ Create Launch'}
          </button>
        </div>

        {/* Formulário de criação */}
        {showCreateForm && (
          <div className="card" style={{ padding: '2.5rem', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Create New Launch</h2>
            <form onSubmit={handleSubmit}>
              {/* Seleção do tipo de contrato */}
              <div className="form-group">
                <label className="form-label">Contract Type</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setContractType('new')}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '12px',
                      border: contractType === 'new' 
                        ? '2px solid var(--accent-gold)' 
                        : '1px solid var(--border)',
                      background: contractType === 'new' 
                        ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))' 
                        : 'var(--surface-alt)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>🏭</span>
                      <span style={{ 
                        fontWeight: '700', 
                        fontSize: '1rem',
                        color: contractType === 'new' ? 'var(--accent-gold)' : 'var(--text)'
                      }}>
                        New Contract
                      </span>
                      {contractType === 'new' && (
                        <span style={{
                          background: 'var(--accent-gold)',
                          color: 'var(--background)',
                          fontSize: '0.625rem',
                          fontWeight: '700',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}>
                          Recommended
                        </span>
                      )}
                    </div>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.8125rem', 
                      color: 'var(--text-secondary)',
                      lineHeight: '1.4'
                    }}>
                      Full features: royalties, whitelist, airdrop, earnings dashboard
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setContractType('legacy')}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '12px',
                      border: contractType === 'legacy' 
                        ? '2px solid var(--text-secondary)' 
                        : '1px solid var(--border)',
                      background: contractType === 'legacy' 
                        ? 'var(--surface-alt)' 
                        : 'var(--surface)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>📦</span>
                      <span style={{ 
                        fontWeight: '700', 
                        fontSize: '1rem',
                        color: 'var(--text)'
                      }}>
                        Legacy Contract
                      </span>
                    </div>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.8125rem', 
                      color: 'var(--text-secondary)',
                      lineHeight: '1.4'
                    }}>
                      Simple NFT minting only. No royalties or advanced features.
                    </p>
                  </button>
                </div>
                
                {contractType === 'new' && !collectionFactoryContract && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    color: '#ef4444'
                  }}>
                    ⚠️ CollectionFactory not available. Will use Legacy Contract as fallback.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Launch Type</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setLaunchType('instant')}
                    className={launchType === 'instant' ? 'btn btn-primary' : 'btn btn-outline'}
                    style={{ flex: 1 }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem' }}>
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Instant
                  </button>
                  <button
                    type="button"
                    onClick={() => setLaunchType('scheduled')}
                    className={launchType === 'scheduled' ? 'btn btn-primary' : 'btn btn-outline'}
                    style={{ flex: 1 }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem' }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Future
                  </button>
                </div>
              </div>

              {launchType === 'scheduled' && (
                <div className="form-group">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required={launchType === 'scheduled'}
                      />
                    </div>
                    <div>
                      <label className="form-label">Time</label>
                      <input
                        type="time"
                        className="form-input"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        required={launchType === 'scheduled'}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Collection Name *</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g: Genesis Collection"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  name="description"
                  className="form-textarea"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe your NFT collection..."
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {parseInt(formData.supply) > 1 ? 'Collection Images *' : 'Collection Image *'}
                </label>
                {parseInt(formData.supply) > 1 && collectionImages.length > 0 ? (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      {collectionImages.map((img, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                          <div style={{
                            border: '2px solid var(--border)',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            background: 'var(--surface-alt)',
                            position: 'relative'
                          }}>
                            <img
                              src={img.preview}
                              alt={`NFT #${index + 1}`}
                              style={{
                                width: '100%',
                                height: '120px',
                                objectFit: 'cover'
                              }}
                            />
                            <div style={{
                              position: 'absolute',
                              top: '0.25rem',
                              left: '0.25rem',
                              background: index === 0 ? 'rgba(212, 175, 55, 0.9)' : 'rgba(0, 0, 0, 0.7)',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              #{index + 1} - Rank {img.rarity}
                            </div>
                            <div style={{
                              position: 'absolute',
                              bottom: '0',
                              left: '0',
                              right: '0',
                              background: 'rgba(0, 0, 0, 0.8)',
                              color: 'white',
                              padding: '0.25rem',
                              fontSize: '0.7rem',
                              textAlign: 'center'
                            }}>
                              {img.rarityPercent || `${((collectionImages.length - index) / collectionImages.length * 100).toFixed(1)}%`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        setCollectionImages([])
                        setImagePreview(null)
                        setImageFile(null)
                        setImageIPFSHash(null)
                      }}
                    >
                      Remove All Images
                    </button>
                  </div>
                ) : null}
                <div
                  className="image-upload-area"
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--surface-alt)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    minHeight: parseInt(formData.supply) > 1 && collectionImages.length > 0 ? '100px' : '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleImageUpload(e)
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => document.getElementById('launchpad-image-upload').click()}
                >
                  {imagePreview && collectionImages.length === 0 ? (
                    <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{
                          width: '100%',
                          borderRadius: '8px',
                          maxHeight: '300px',
                          objectFit: 'contain'
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setImagePreview(null)
                          setImageFile(null)
                          setImageIPFSHash(null)
                        }}
                        style={{
                          position: 'absolute',
                          top: '0.5rem',
                          right: '0.5rem',
                          background: 'var(--error)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div>
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" style={{ margin: '0 auto 1rem' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        {parseInt(formData.supply) > 1 
                          ? `Click or drag ${formData.supply} image${parseInt(formData.supply) > 1 ? 's' : ''} here`
                          : 'Click or drag an image here'}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {parseInt(formData.supply) > 1 
                          ? `Select up to ${formData.supply} images. Order defines rarity (first = rarest).`
                          : 'PNG, JPG, GIF up to 10MB'}
                      </p>
                    </div>
                  )}
                  <input
                    id="launchpad-image-upload"
                    type="file"
                    accept="image/*"
                    multiple={parseInt(formData.supply) > 1}
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Price (USDC)</label>
                  <input
                    type="number"
                    name="price"
                    className="form-input"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Supply (Number of collection units)</label>
                  <input
                    type="number"
                    name="supply"
                    className="form-input"
                    value={formData.supply}
                    onChange={handleChange}
                    placeholder="1"
                    min="1"
                    max="10000"
                    required
                  />
                  <p className="text-muted" style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                    {formData.supply > 1 
                      ? `This will be a project/collection with ${formData.supply} units. The first NFT (#1) will be created now.`
                      : 'Will create a unique NFT.'}
                  </p>
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <input
                    type="checkbox"
                    id="hasWhitelist"
                    checked={hasWhitelist}
                    onChange={(e) => setHasWhitelist(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <label htmlFor="hasWhitelist" style={{ fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>
                    Enable Whitelist
                  </label>
                </div>

                {hasWhitelist && (
                  <div style={{ 
                    padding: '1.5rem', 
                    background: 'var(--surface-alt)', 
                    borderRadius: '12px',
                    border: '1px solid var(--border)'
                  }}>
                    <div className="form-group">
                      <label className="form-label">Whitelist Type</label>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setWhitelistType('nftContract')}
                          className={whitelistType === 'nftContract' ? 'btn btn-primary' : 'btn btn-outline'}
                          style={{ flex: 1 }}
                        >
                          By NFT Project
                        </button>
                        <button
                          type="button"
                          onClick={() => setWhitelistType('addresses')}
                          className={whitelistType === 'addresses' ? 'btn btn-primary' : 'btn btn-outline'}
                          style={{ flex: 1 }}
                        >
                          By Addresses
                        </button>
                      </div>
                    </div>

                    {whitelistType === 'nftContract' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">NFT Contract Address</label>
                          <input
                            type="text"
                            className="form-input"
                            value={whitelistProject}
                            onChange={(e) => setWhitelistProject(e.target.value)}
                            placeholder="0x..."
                            pattern="^0x[a-fA-F0-9]{40}$"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Whitelist Duration (hours)</label>
                          <input
                            type="number"
                            className="form-input"
                            value={whitelistDuration}
                            onChange={(e) => setWhitelistDuration(e.target.value)}
                            min="1"
                            max="168"
                            placeholder="24"
                          />
                        </div>
                      </>
                    )}

                    {whitelistType === 'addresses' && (
                      <div className="form-group">
                        <label className="form-label">Addresses (one per line)</label>
                        <textarea
                          className="form-textarea"
                          value={whitelistAddresses}
                          onChange={(e) => setWhitelistAddresses(e.target.value)}
                          placeholder="0x1234...&#10;0x5678..."
                          rows="6"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={minting || uploading}
                style={{ width: '100%', padding: '1rem', fontSize: '1.125rem', marginTop: '1rem' }}
              >
                {minting ? (
                  <>
                    <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', marginRight: '0.5rem' }}></span>
                    Creating Launch...
                  </>
                ) : (
                  <>
                    {launchType === 'instant' ? '🎯 Launch Now' : '📅 Schedule Launch'}
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Lançamentos Atuais */}
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p className="text-secondary">Loading launches...</p>
          </div>
        ) : (
          <>
            {currentLaunches.length > 0 && (
              <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                  Current
                </h2>
                <div className="nft-grid">
                  {currentLaunches.map((launch) => renderLaunchCard(launch))}
                </div>
              </div>
            )}

            {/* Lançamentos Passados */}
            {pastLaunches.length > 0 && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                  Past
                </h2>
                <div className="nft-grid">
                  {pastLaunches.map((launch) => renderLaunchCard(launch))}
                </div>
              </div>
            )}

            {currentLaunches.length === 0 && pastLaunches.length === 0 && !loading && (
              <div className="card text-center" style={{ padding: '3rem 2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>No launches available</h3>
                <p className="text-secondary mb-2">
                  Be the first to create a launch!
                </p>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Open the browser console (F12) to see launch search details.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateForm(true)}
                    style={{ marginTop: '1rem' }}
                  >
                    + Create Launch
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => loadLaunches()}
                    style={{ marginTop: '1rem' }}
                  >
                    🔄 Reload
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default Launchpad
