// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Marketplace
 * @dev Marketplace descentralizado para NFTs na rede Arc com suporte a royalties ERC2981
 */
contract Marketplace is ReentrancyGuard, Ownable {
    
    // Estrutura para um item listado
    struct Listing {
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
    }
    
    // Taxa do marketplace (em basis points: 250 = 2.5%)
    uint256 public marketplaceFee = 250;
    uint256 private constant FEE_DENOMINATOR = 10000;
    
    // Mapeamento de listingId para Listing
    mapping(uint256 => Listing) public listings;
    uint256 public listingCounter;
    
    // Rastreamento de listagens por vendedor
    mapping(address => uint256[]) public sellerListings;
    
    // Eventos
    event ItemListed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );
    
    event ItemSold(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 price
    );
    
    event RoyaltyPaid(
        uint256 indexed listingId,
        address indexed receiver,
        uint256 amount
    );
    
    event ListingCancelled(uint256 indexed listingId);
    event MarketplaceFeeUpdated(uint256 newFee);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Lista um NFT para venda
     * @param _nftContract Endereço do contrato NFT
     * @param _tokenId ID do token
     * @param _price Preço em USDC (wei)
     */
    function listItem(
        address _nftContract,
        uint256 _tokenId,
        uint256 _price
    ) external nonReentrant {
        require(_price > 0, "Preco deve ser maior que zero");
        require(_nftContract != address(0), "Endereco NFT invalido");
        
        IERC721 nft = IERC721(_nftContract);
        require(nft.ownerOf(_tokenId) == msg.sender, "Voce nao e o dono deste NFT");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) || 
            nft.getApproved(_tokenId) == address(this),
            "Marketplace nao aprovado para transferir NFT"
        );
        
        uint256 listingId = listingCounter++;
        
        listings[listingId] = Listing({
            nftContract: _nftContract,
            tokenId: _tokenId,
            seller: msg.sender,
            price: _price,
            active: true
        });
        
        sellerListings[msg.sender].push(listingId);
        
        emit ItemListed(listingId, msg.sender, _nftContract, _tokenId, _price);
    }
    
    /**
     * @dev Compra um NFT listado com suporte a royalties ERC2981
     * @param _listingId ID da listagem
     */
    function buyItem(uint256 _listingId) external payable nonReentrant {
        Listing storage listing = listings[_listingId];
        
        require(listing.active, "Listagem nao esta ativa");
        require(msg.value >= listing.price, "Valor insuficiente");
        require(msg.sender != listing.seller, "Vendedor nao pode comprar seu proprio item");
        
        listing.active = false;
        
        // Calcula taxa do marketplace
        uint256 fee = (listing.price * marketplaceFee) / FEE_DENOMINATOR;
        uint256 remainingAmount = listing.price - fee;
        
        // Verifica e paga royalties ERC2981 se suportado
        uint256 royaltyAmount = 0;
        address royaltyReceiver = address(0);
        
        try IERC2981(listing.nftContract).royaltyInfo(listing.tokenId, listing.price) returns (address receiver, uint256 amount) {
            if (receiver != address(0) && amount > 0 && amount <= remainingAmount) {
                royaltyReceiver = receiver;
                royaltyAmount = amount;
                remainingAmount -= royaltyAmount;
            }
        } catch {
            // NFT não suporta ERC2981, continua sem royalty
        }
        
        // Transfere NFT para o comprador
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );
        
        // Paga royalty ao criador (se houver)
        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            (bool successRoyalty, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
            require(successRoyalty, "Transferencia de royalty falhou");
            emit RoyaltyPaid(_listingId, royaltyReceiver, royaltyAmount);
        }
        
        // Transfere pagamento para o vendedor
        (bool successSeller, ) = payable(listing.seller).call{value: remainingAmount}("");
        require(successSeller, "Transferencia para vendedor falhou");
        
        // Devolve excesso se houver
        if (msg.value > listing.price) {
            (bool successRefund, ) = payable(msg.sender).call{value: msg.value - listing.price}("");
            require(successRefund, "Reembolso falhou");
        }
        
        emit ItemSold(_listingId, msg.sender, listing.seller, listing.price);
    }
    
    /**
     * @dev Cancela uma listagem
     * @param _listingId ID da listagem
     */
    function cancelListing(uint256 _listingId) external nonReentrant {
        Listing storage listing = listings[_listingId];
        
        require(listing.seller == msg.sender || owner() == msg.sender, "Sem permissao");
        require(listing.active, "Listagem ja inativa");
        
        listing.active = false;
        
        emit ListingCancelled(_listingId);
    }
    
    /**
     * @dev Atualiza a taxa do marketplace (apenas owner)
     * @param _newFee Nova taxa em basis points
     */
    function updateMarketplaceFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 1000, "Taxa maxima: 10%");
        marketplaceFee = _newFee;
        emit MarketplaceFeeUpdated(_newFee);
    }
    
    /**
     * @dev Saca as taxas acumuladas (apenas owner)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Sem saldo para sacar");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Saque falhou");
    }
    
    /**
     * @dev Retorna informações de uma listagem
     */
    function getListing(uint256 _listingId) external view returns (Listing memory) {
        return listings[_listingId];
    }
    
    /**
     * @dev Retorna todas as listagens de um vendedor
     */
    function getSellerListings(address _seller) external view returns (uint256[] memory) {
        return sellerListings[_seller];
    }
    
    /**
     * @dev Retorna listagens ativas
     */
    function getActiveListings(uint256 _offset, uint256 _limit) 
        external 
        view 
        returns (Listing[] memory) 
    {
        uint256 activeCount = 0;
        
        // Conta listagens ativas
        for (uint256 i = 0; i < listingCounter; i++) {
            if (listings[i].active) {
                activeCount++;
            }
        }
        
        uint256 resultSize = _limit;
        if (_offset + _limit > activeCount) {
            resultSize = activeCount > _offset ? activeCount - _offset : 0;
        }
        
        Listing[] memory activeListings = new Listing[](resultSize);
        uint256 currentIndex = 0;
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < listingCounter && resultIndex < resultSize; i++) {
            if (listings[i].active) {
                if (currentIndex >= _offset) {
                    activeListings[resultIndex] = listings[i];
                    resultIndex++;
                }
                currentIndex++;
            }
        }
        
        return activeListings;
    }
}
