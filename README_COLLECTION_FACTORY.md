# Sistema de Coleções com Contratos Separados

Este projeto agora suporta criar um contrato NFT separado para cada coleção criada.

## Estrutura

### Contratos

1. **CollectionNFT.sol** - Contrato NFT específico para uma coleção
   - Cada coleção tem seu próprio contrato
   - Suporta maxSupply (quantidade máxima de NFTs na coleção)
   - Funções: `mint()`, `mintBatch()`, `totalSupply()`

2. **CollectionFactory.sol** - Factory contract para criar novos contratos de coleção
   - Função principal: `createCollection(name, maxSupply)`
   - Rastreia todas as coleções criadas
   - Mapeia coleções por criador

3. **MockNFT.sol** - Mantido para NFTs únicos (não coleções)

### Deploy

Após fazer o deploy, execute:

```bash
npx hardhat run scripts/deploy.js --network arcTestnet
```

O deploy irá criar:
- Marketplace
- MockNFT (para NFTs únicos)
- CollectionFactory (para criar coleções)

### Frontend

O frontend precisa ser atualizado para:

1. **Usar CollectionFactory** quando `supply > 1` (coleção)
2. **Usar MockNFT** quando `supply === 1` (NFT único)

### Próximos Passos

1. Compilar os contratos: `npx hardhat compile`
2. Fazer deploy: `npx hardhat run scripts/deploy.js --network arcTestnet`
3. Copiar o ABI do CollectionFactory de `artifacts/contracts/CollectionFactory.sol/CollectionFactory.json`
4. Colocar o ABI em `frontend/src/abis/CollectionFactory.json`
5. Atualizar `frontend/src/config/contracts.js` com o endereço do CollectionFactory
6. Atualizar `frontend/src/context/Web3Context.jsx` para incluir o CollectionFactory
7. Atualizar `frontend/src/pages/Launchpad.jsx` para usar a factory ao criar coleções

