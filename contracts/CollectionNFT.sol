// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CollectionNFT
 * @dev Contrato NFT com suporte a royalties, airdrop, mint público e configurações do criador
 */
contract CollectionNFT is ERC721URIStorage, ERC2981, Ownable, ReentrancyGuard {
    uint256 private _tokenIdCounter;
    
    // Informações da coleção
    string public collectionName;
    string public collectionDescription;
    string public collectionImage;
    uint256 public maxSupply;
    address public creator;
    uint256 public createdAt;
    
    // Configurações de Mint
    uint256 public mintPrice;
    uint256 public maxMintPerWallet;
    bool public mintingEnabled;
    bool public publicMintEnabled;
    
    // Whitelist
    mapping(address => bool) public whitelist;
    bool public whitelistEnabled;
    
    // Tracking de mints por wallet
    mapping(address => uint256) public mintedPerWallet;
    
    // Earnings acumulados
    uint256 public totalEarnings;
    uint256 public withdrawnEarnings;
    
    // Token URIs para minting sequencial
    string[] private tokenURIList;
    uint256 private nextURIIndex;
    
    // Eventos
    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event RoyaltyUpdated(address receiver, uint96 feeNumerator);
    event Airdrop(address indexed to, uint256 indexed tokenId);
    event MintingStatusChanged(bool enabled);
    event WhitelistUpdated(address indexed account, bool status);
    event EarningsWithdrawn(address indexed to, uint256 amount);
    event CollectionMetadataUpdated(string description, string image);
    event PublicMintStatusChanged(bool enabled);
    event MaxMintPerWalletUpdated(uint256 oldLimit, uint256 newLimit);
    
    constructor(
        string memory _collectionName,
        uint256 _maxSupply,
        address _creator
    ) ERC721(_collectionName, "CNFT") Ownable(_creator) {
        collectionName = _collectionName;
        maxSupply = _maxSupply;
        creator = _creator;
        createdAt = block.timestamp;
        mintingEnabled = true;
        publicMintEnabled = true;
        mintPrice = 0;
        maxMintPerWallet = _maxSupply; // Sem limite por padrão
        
        // Define royalty padrão de 5% para o criador
        _setDefaultRoyalty(_creator, 500);
    }
    
    // ============ FUNÇÕES DE MINT ============
    
    /**
     * @dev Mint um novo NFT da coleção (apenas owner)
     */
    function mint(address to, string memory _tokenURI) public onlyOwner returns (uint256) {
        require(_tokenIdCounter < maxSupply, "Max supply reached");
        require(bytes(_tokenURI).length > 0, "Token URI cannot be empty");
        
        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;
        
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        
        emit NFTMinted(to, newTokenId, _tokenURI);
        
        return newTokenId;
    }
    
    /**
     * @dev Mint múltiplos NFTs de uma vez (apenas owner)
     */
    function mintBatch(address to, string[] memory tokenURIs) public onlyOwner returns (uint256[] memory) {
        require(_tokenIdCounter + tokenURIs.length <= maxSupply, "Exceeds max supply");
        
        uint256[] memory tokenIds = new uint256[](tokenURIs.length);
        
        for (uint256 i = 0; i < tokenURIs.length; i++) {
            _tokenIdCounter++;
            uint256 newTokenId = _tokenIdCounter;
            
            _safeMint(to, newTokenId);
            _setTokenURI(newTokenId, tokenURIs[i]);
            
            tokenIds[i] = newTokenId;
            emit NFTMinted(to, newTokenId, tokenURIs[i]);
        }
        
        return tokenIds;
    }
    
    /**
     * @dev Mint público - usuários podem comprar NFTs
     */
    function publicMint(uint256 quantity) external payable nonReentrant {
        require(mintingEnabled, "Minting is disabled");
        require(publicMintEnabled, "Public mint is disabled");
        require(_tokenIdCounter + quantity <= maxSupply, "Exceeds max supply");
        require(msg.value >= mintPrice * quantity, "Insufficient payment");
        require(mintedPerWallet[msg.sender] + quantity <= maxMintPerWallet, "Exceeds wallet limit");
        
        if (whitelistEnabled) {
            require(whitelist[msg.sender], "Not whitelisted");
        }
        
        require(nextURIIndex + quantity <= tokenURIList.length, "Not enough URIs available");
        
        for (uint256 i = 0; i < quantity; i++) {
            _tokenIdCounter++;
            uint256 newTokenId = _tokenIdCounter;
            
            string memory uri = tokenURIList[nextURIIndex];
            nextURIIndex++;
            
            _safeMint(msg.sender, newTokenId);
            _setTokenURI(newTokenId, uri);
            
            mintedPerWallet[msg.sender]++;
            
            emit NFTMinted(msg.sender, newTokenId, uri);
        }
        
        totalEarnings += msg.value;
    }
    
    /**
     * @dev Adiciona URIs para mint público sequencial
     */
    function addTokenURIs(string[] memory uris) external onlyOwner {
        for (uint256 i = 0; i < uris.length; i++) {
            tokenURIList.push(uris[i]);
        }
    }
    
    /**
     * @dev Retorna URIs disponíveis para mint
     */
    function availableURIsCount() external view returns (uint256) {
        return tokenURIList.length - nextURIIndex;
    }
    
    // ============ FUNÇÕES DE AIRDROP ============
    
    /**
     * @dev Airdrop para um endereço específico
     */
    function airdrop(address to, string memory _tokenURI) external onlyOwner returns (uint256) {
        require(_tokenIdCounter < maxSupply, "Max supply reached");
        
        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;
        
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        
        emit Airdrop(to, newTokenId);
        
        return newTokenId;
    }
    
    /**
     * @dev Airdrop em batch para múltiplos endereços
     */
    function airdropBatch(address[] calldata recipients, string[] calldata tokenURIs) external onlyOwner {
        require(recipients.length == tokenURIs.length, "Arrays length mismatch");
        require(_tokenIdCounter + recipients.length <= maxSupply, "Exceeds max supply");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _tokenIdCounter++;
            uint256 newTokenId = _tokenIdCounter;
            
            _safeMint(recipients[i], newTokenId);
            _setTokenURI(newTokenId, tokenURIs[i]);
            
            emit Airdrop(recipients[i], newTokenId);
        }
    }
    
    /**
     * @dev Airdrop em batch com o mesmo URI para todos
     */
    function airdropSameURI(address[] calldata recipients, string memory _tokenURI) external onlyOwner {
        require(_tokenIdCounter + recipients.length <= maxSupply, "Exceeds max supply");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _tokenIdCounter++;
            uint256 newTokenId = _tokenIdCounter;
            
            _safeMint(recipients[i], newTokenId);
            _setTokenURI(newTokenId, _tokenURI);
            
            emit Airdrop(recipients[i], newTokenId);
        }
    }
    
    // ============ CONFIGURAÇÕES DO CRIADOR ============
    
    /**
     * @dev Atualiza o preço de mint
     */
    function setMintPrice(uint256 newPrice) external onlyOwner {
        uint256 oldPrice = mintPrice;
        mintPrice = newPrice;
        emit MintPriceUpdated(oldPrice, newPrice);
    }
    
    /**
     * @dev Define limite de mint por wallet
     */
    function setMaxMintPerWallet(uint256 limit) external onlyOwner {
        uint256 oldLimit = maxMintPerWallet;
        maxMintPerWallet = limit;
        emit MaxMintPerWalletUpdated(oldLimit, limit);
    }
    
    /**
     * @dev Ativa/desativa minting
     */
    function setMintingEnabled(bool enabled) external onlyOwner {
        mintingEnabled = enabled;
        emit MintingStatusChanged(enabled);
    }
    
    /**
     * @dev Ativa/desativa mint público
     */
    function setPublicMintEnabled(bool enabled) external onlyOwner {
        publicMintEnabled = enabled;
        emit PublicMintStatusChanged(enabled);
    }
    
    /**
     * @dev Atualiza royalties (em basis points, 100 = 1%)
     */
    function setRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        require(feeNumerator <= 1000, "Royalty too high"); // Max 10%
        _setDefaultRoyalty(receiver, feeNumerator);
        emit RoyaltyUpdated(receiver, feeNumerator);
    }
    
    /**
     * @dev Atualiza metadata da coleção
     */
    function setCollectionMetadata(string memory description, string memory image) external onlyOwner {
        collectionDescription = description;
        collectionImage = image;
        emit CollectionMetadataUpdated(description, image);
    }
    
    // ============ WHITELIST ============
    
    /**
     * @dev Ativa/desativa whitelist
     */
    function setWhitelistEnabled(bool enabled) external onlyOwner {
        whitelistEnabled = enabled;
    }
    
    /**
     * @dev Adiciona endereço à whitelist
     */
    function addToWhitelist(address account) external onlyOwner {
        whitelist[account] = true;
        emit WhitelistUpdated(account, true);
    }
    
    /**
     * @dev Adiciona múltiplos endereços à whitelist
     */
    function addToWhitelistBatch(address[] calldata accounts) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            whitelist[accounts[i]] = true;
            emit WhitelistUpdated(accounts[i], true);
        }
    }
    
    /**
     * @dev Remove endereço da whitelist
     */
    function removeFromWhitelist(address account) external onlyOwner {
        whitelist[account] = false;
        emit WhitelistUpdated(account, false);
    }
    
    // ============ EARNINGS ============
    
    /**
     * @dev Retira earnings acumulados
     */
    function withdrawEarnings() external onlyOwner nonReentrant {
        uint256 available = totalEarnings - withdrawnEarnings;
        require(available > 0, "No earnings to withdraw");
        
        withdrawnEarnings += available;
        
        (bool success, ) = payable(creator).call{value: available}("");
        require(success, "Transfer failed");
        
        emit EarningsWithdrawn(creator, available);
    }
    
    /**
     * @dev Retorna earnings disponíveis para saque
     */
    function availableEarnings() external view returns (uint256) {
        return totalEarnings - withdrawnEarnings;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Retorna o total de NFTs mintados
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev Retorna se um usuário pode mintar
     */
    function canMint(address user, uint256 quantity) external view returns (bool, string memory) {
        if (!mintingEnabled) return (false, "Minting disabled");
        if (!publicMintEnabled) return (false, "Public mint disabled");
        if (_tokenIdCounter + quantity > maxSupply) return (false, "Exceeds supply");
        if (mintedPerWallet[user] + quantity > maxMintPerWallet) return (false, "Wallet limit reached");
        if (whitelistEnabled && !whitelist[user]) return (false, "Not whitelisted");
        return (true, "");
    }
    
    /**
     * @dev Retorna informações completas da coleção
     */
    function getCollectionInfo() external view returns (
        string memory _name,
        string memory _description,
        string memory _image,
        uint256 _maxSupply,
        uint256 _totalSupply,
        uint256 _mintPrice,
        bool _mintingEnabled,
        bool _publicMintEnabled,
        bool _whitelistEnabled,
        uint256 _maxMintPerWallet,
        address _creator,
        uint256 _createdAt
    ) {
        return (
            collectionName,
            collectionDescription,
            collectionImage,
            maxSupply,
            _tokenIdCounter,
            mintPrice,
            mintingEnabled,
            publicMintEnabled,
            whitelistEnabled,
            maxMintPerWallet,
            creator,
            createdAt
        );
    }
    
    /**
     * @dev Override para incluir collectionName no nome
     */
    function name() public view override returns (string memory) {
        return collectionName;
    }
    
    /**
     * @dev Override necessário para ERC721URIStorage
     */
    function tokenURI(uint256 tokenId) public view override(ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev Override necessário para múltiplas heranças
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
