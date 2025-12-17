// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockNFT
 * @dev Contrato NFT de exemplo para testar o marketplace
 */
contract MockNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    
    constructor() ERC721("Arc NFT", "ANFT") Ownable(msg.sender) {}
    
    /**
     * @dev Minta um novo NFT
     * @param _to Endereço que receberá o NFT
     * @param _uri URI dos metadados
     */
    function mint(address _to, string memory _uri) external {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(_to, tokenId);
        _setTokenURI(tokenId, _uri);
    }
    
    /**
     * @dev Minta múltiplos NFTs
     */
    function batchMint(address _to, string[] memory _uris) external {
        for (uint256 i = 0; i < _uris.length; i++) {
            uint256 tokenId = _tokenIdCounter++;
            _safeMint(_to, tokenId);
            _setTokenURI(tokenId, _uris[i]);
        }
    }
    
    // Overrides necessários
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

