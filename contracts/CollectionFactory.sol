// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CollectionNFT.sol";

/**
 * @title CollectionFactory
 * @dev Factory contract para criar novos contratos de coleção NFT
 */
contract CollectionFactory {
    // Array de todas as coleções criadas
    address[] public collections;
    
    // Mapping de criador para suas coleções
    mapping(address => address[]) public creatorCollections;
    
    // Mapping de endereço do contrato para informações da coleção
    mapping(address => CollectionInfo) public collectionInfo;
    
    struct CollectionInfo {
        string name;
        uint256 maxSupply;
        address creator;
        uint256 createdAt;
    }
    
    event CollectionCreated(
        address indexed collectionAddress,
        address indexed creator,
        string name,
        uint256 maxSupply
    );
    
    /**
     * @dev Cria uma nova coleção NFT
     * @param _collectionName Nome da coleção
     * @param _maxSupply Quantidade máxima de NFTs na coleção
     * @return collectionAddress Endereço do contrato da coleção criado
     */
    function createCollection(
        string memory _collectionName,
        uint256 _maxSupply
    ) public returns (address collectionAddress) {
        require(_maxSupply > 0, "CollectionFactory: Max supply must be greater than 0");
        require(bytes(_collectionName).length > 0, "CollectionFactory: Collection name cannot be empty");
        
        // Cria novo contrato CollectionNFT
        CollectionNFT newCollection = new CollectionNFT(
            _collectionName,
            _maxSupply,
            msg.sender
        );
        
        collectionAddress = address(newCollection);
        
        // Armazena informações da coleção
        collections.push(collectionAddress);
        creatorCollections[msg.sender].push(collectionAddress);
        collectionInfo[collectionAddress] = CollectionInfo({
            name: _collectionName,
            maxSupply: _maxSupply,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        
        emit CollectionCreated(
            collectionAddress,
            msg.sender,
            _collectionName,
            _maxSupply
        );
        
        return collectionAddress;
    }
    
    /**
     * @dev Retorna o número total de coleções criadas
     */
    function getCollectionCount() public view returns (uint256) {
        return collections.length;
    }
    
    /**
     * @dev Retorna todas as coleções criadas
     */
    function getAllCollections() public view returns (address[] memory) {
        return collections;
    }
    
    /**
     * @dev Retorna as coleções de um criador específico
     */
    function getCreatorCollections(address creator) public view returns (address[] memory) {
        return creatorCollections[creator];
    }
    
    /**
     * @dev Verifica se um endereço é uma coleção válida
     */
    function isValidCollection(address collectionAddress) public view returns (bool) {
        return collectionInfo[collectionAddress].creator != address(0);
    }
}

