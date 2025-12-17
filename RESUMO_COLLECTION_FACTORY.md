# Sistema de Coleções com Contratos Separados - Resumo da Implementação

## ✅ O que foi implementado:

### 1. Contratos Solidity

**CollectionNFT.sol**
- Contrato NFT específico para cada coleção
- Suporta `maxSupply` (quantidade máxima de NFTs)
- Funções: `mint()`, `mintBatch()`, `totalSupply()`, `exists()`
- Cada coleção tem seu próprio contrato único

**CollectionFactory.sol**
- Factory contract para criar novos contratos CollectionNFT
- Função principal: `createCollection(name, maxSupply)`
- Rastreia todas as coleções criadas
- Mapeia coleções por criador

### 2. Scripts de Deploy

**scripts/deploy.js**
- Atualizado para fazer deploy do CollectionFactory junto com Marketplace e MockNFT

### 3. Frontend

**ABIs criados:**
- `frontend/src/abis/CollectionFactory.json` ✅
- `frontend/src/abis/CollectionNFT.json` ✅

**Web3Context atualizado:**
- Adicionado `collectionFactoryContract` ao contexto
- Inicialização do contrato quando disponível

**Launchpad.jsx atualizado:**
- Para coleções (supply > 1): usa CollectionFactory para criar um novo contrato CollectionNFT
- Para NFTs únicos (supply === 1): usa MockNFT como antes
- Suporta criação de coleções com múltiplas imagens (usa `mintBatch`)
- Suporta criação de coleções com imagem única (usa `mint`)

## 🔄 Como funciona:

### NFT Único (supply = 1)
1. Usuário cria NFT com supply = 1
2. Sistema usa `MockNFT` contract existente
3. NFT é mintado no MockNFT

### Coleção (supply > 1)
1. Usuário cria coleção com supply > 1
2. Sistema chama `collectionFactoryContract.createCollection(name, supply)`
3. Factory cria um novo contrato `CollectionNFT` específico para essa coleção
4. Sistema obtém o endereço do contrato criado através do evento
5. Sistema cria instância do contrato CollectionNFT
6. Sistema mint NFTs no contrato da coleção:
   - Se múltiplas imagens: usa `mintBatch(account, tokenURIs[])`
   - Se imagem única: usa `mint(account, tokenURI)`

## 📋 Próximos passos:

1. **Compilar contratos:**
   ```bash
   npx hardhat compile
   ```

2. **Fazer deploy:**
   ```bash
   npx hardhat run scripts/deploy.js --network arcTestnet
   ```

3. **Atualizar configuração:**
   - Copiar o endereço do CollectionFactory do deploy
   - Atualizar `frontend/src/config/contracts.js` com o endereço

4. **Testar:**
   - Criar um NFT único (deve usar MockNFT)
   - Criar uma coleção com supply > 1 (deve criar novo contrato CollectionNFT)

## ⚠️ Nota importante:

O CollectionFactory precisa estar deployado e seu endereço configurado em `frontend/src/config/contracts.js` antes de criar coleções. Se não estiver disponível, o sistema mostrará um erro informando que o factory não está disponível.

