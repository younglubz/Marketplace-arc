# 🏗️ Arquitetura do Arc Marketplace

## 📊 Visão Geral

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │   Home   │  │ Explorar │  │  Criar  │  │Meus NFTs││
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘│
│                         │                               │
│                    ┌────▼────┐                          │
│                    │ Web3    │                          │
│                    │ Context │                          │
│                    └────┬────┘                          │
└─────────────────────────┼───────────────────────────────┘
                          │
                    Ethers.js v6
                          │
┌─────────────────────────▼───────────────────────────────┐
│              ARC TESTNET (Blockchain)                    │
│  ┌──────────────────────┐  ┌──────────────────────────┐│
│  │  Marketplace.sol     │  │    MockNFT.sol           ││
│  │                      │  │                          ││
│  │ - List NFT           │  │ - Mint NFT               ││
│  │ - Buy NFT            │  │ - Transfer               ││
│  │ - Cancel Listing     │  │ - Approve                ││
│  │ - Get Listings       │  │ - Token URI              ││
│  │ - Manage Fees        │  │ - Balance Of             ││
│  └──────────────────────┘  └──────────────────────────┘│
│                                                          │
│  Chain ID: 5042002  |  Currency: USDC                   │
└──────────────────────────────────────────────────────────┘
```

## 🔄 Fluxo de Dados

### 1. Criar NFT
```
Usuário → Formulário Create → mint() → MockNFT → Blockchain
                                          ↓
                                  Evento Transfer
                                          ↓
                             Atualiza Frontend (MyNFTs)
```

### 2. Listar NFT para Venda
```
Usuário → MyNFTs → setApprovalForAll() → MockNFT
                          ↓
                   Aprovação Concedida
                          ↓
                   listItem() → Marketplace → Blockchain
                          ↓
                   Evento ItemListed
                          ↓
              Atualiza Frontend (Explore + MyNFTs)
```

### 3. Comprar NFT
```
Usuário → Explore → buyItem() + USDC → Marketplace
                          ↓
                 Valida Transação
                          ↓
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
  Transfer NFT                      Transfer USDC
  (MockNFT)                         (Marketplace)
        │                                   │
        ├─→ Para Comprador           ┌─────┴────┐
        │                            ▼          ▼
        │                      Vendedor     Taxa (2.5%)
        ↓
  Evento ItemSold + Transfer
        ↓
  Atualiza Frontend (Explore + MyNFTs)
```

### 4. Cancelar Listagem
```
Usuário → MyNFTs → cancelListing() → Marketplace
                          ↓
                 Desativa Listagem
                          ↓
               Evento ListingCancelled
                          ↓
              Atualiza Frontend (MyNFTs)
```

## 🧩 Componentes do Sistema

### Smart Contracts

#### Marketplace.sol
```solidity
Estruturas:
- Listing (nftContract, tokenId, seller, price, active)

Estado:
- listings: mapping(uint256 => Listing)
- listingCounter: uint256
- marketplaceFee: uint256 (250 = 2.5%)

Funções Principais:
- listItem()        → Lista NFT para venda
- buyItem()         → Compra NFT listado
- cancelListing()   → Cancela listagem
- getActiveListings() → Retorna listagens ativas

Segurança:
- ReentrancyGuard (OpenZeppelin)
- Ownable (OpenZeppelin)
- Validações de permissões
```

#### MockNFT.sol
```solidity
Herança:
- ERC721 (OpenZeppelin)
- ERC721URIStorage
- Ownable

Funções:
- mint()           → Cria novo NFT
- batchMint()      → Cria múltiplos NFTs
- tokenURI()       → Retorna URI dos metadados
- approve()        → Aprova transferência
- setApprovalForAll() → Aprova operador
```

### Frontend

#### Estrutura de Pastas
```
frontend/
├── src/
│   ├── pages/           # Páginas da aplicação
│   │   ├── Home.jsx
│   │   ├── Explore.jsx
│   │   ├── Create.jsx
│   │   └── MyNFTs.jsx
│   ├── context/         # Context API
│   │   └── Web3Context.jsx
│   ├── config/          # Configurações
│   │   └── contracts.js
│   ├── abis/            # ABIs dos contratos
│   │   ├── Marketplace.json
│   │   └── MockNFT.json
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

#### Web3Context
```javascript
Estado Global:
- provider         → Provedor Ethers.js
- signer          → Assinador de transações
- account         → Endereço conectado
- marketplaceContract → Instância do contrato
- nftContract     → Instância do contrato NFT
- isCorrectNetwork → Verificação de rede

Funções:
- connectWallet()      → Conecta MetaMask
- disconnect()         → Desconecta carteira
- switchToArcNetwork() → Troca para Arc Testnet
- checkNetwork()       → Verifica rede atual
```

## 🔐 Segurança

### Smart Contracts

1. **Reentrancy Protection**
   - Uso de `ReentrancyGuard` do OpenZeppelin
   - Padrão Checks-Effects-Interactions

2. **Access Control**
   - `Ownable` para funções administrativas
   - Validação de ownership nos NFTs

3. **Validações**
   - Preço > 0
   - NFT existe e pertence ao vendedor
   - Aprovação do marketplace
   - Saldo suficiente do comprador

### Frontend

1. **Validação de Rede**
   - Verifica Chain ID antes de transações
   - Oferece troca automática de rede

2. **Tratamento de Erros**
   - Try-catch em todas as transações
   - Feedback visual para usuário

3. **Verificações**
   - Estado de aprovação
   - Saldo de conta
   - Ownership de NFTs

## 📈 Fluxo de Taxas

```
Venda de NFT (100 USDC)
        │
        ├─→ Taxa Marketplace (2.5%)
        │   = 2.5 USDC
        │   └─→ Contrato Marketplace
        │       └─→ Owner pode sacar (withdrawFees)
        │
        └─→ Vendedor (97.5%)
            = 97.5 USDC
            └─→ Transferido diretamente
```

## 🔄 Estados de uma Listagem

```
NFT Criado
    │
    ▼
[Não Listado] ──listItem()──► [Listado/Ativo]
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
             buyItem()        cancelListing()    NFT Transferido
                    │                │              Fora
                    ▼                ▼                ▼
                [Vendido]        [Cancelado]    [Inválido]
                (active=false)   (active=false)  (active=false)
```

## 🎯 Casos de Uso

### Caso 1: Artista Cria e Vende NFT
1. Artista conecta carteira
2. Vai em "Criar NFT"
3. Preenche metadados (nome, descrição, imagem)
4. Minta NFT (paga gas)
5. Vai em "Meus NFTs"
6. Define preço e lista
7. Aprova marketplace (primeira vez)
8. NFT aparece em "Explorar"
9. Comprador compra
10. USDC vai para artista (menos 2.5%)

### Caso 2: Colecionador Compra NFT
1. Colecionador conecta carteira
2. Vai em "Explorar"
3. Navega pelos NFTs disponíveis
4. Seleciona NFT desejado
5. Clica "Comprar"
6. Confirma transação (envia USDC)
7. NFT é transferido
8. NFT aparece em "Meus NFTs"

### Caso 3: Vendedor Cancela Listagem
1. Vendedor vai em "Meus NFTs"
2. Vê NFT listado
3. Clica "Cancelar Listagem"
4. Confirma transação
5. NFT some de "Explorar"
6. NFT continua em "Meus NFTs" (não listado)

## 📊 Dados e Eventos

### Eventos do Marketplace
```solidity
ItemListed(listingId, seller, nftContract, tokenId, price)
ItemSold(listingId, buyer, seller, price)
ListingCancelled(listingId)
MarketplaceFeeUpdated(newFee)
```

### Eventos do NFT
```solidity
Transfer(from, to, tokenId)
Approval(owner, approved, tokenId)
ApprovalForAll(owner, operator, approved)
```

## 🚀 Otimizações Futuras

1. **IPFS Integration**
   - Upload de imagens para IPFS
   - Metadados estruturados em JSON

2. **Indexação**
   - The Graph para queries eficientes
   - Cache de listagens

3. **Paginação**
   - Lazy loading de NFTs
   - Infinite scroll

4. **Filtros e Busca**
   - Filtrar por preço
   - Buscar por nome
   - Ordenar por data

5. **Leilões**
   - Sistema de lances
   - Leilões com tempo limite

6. **Coleções**
   - Múltiplas coleções NFT
   - Páginas de coleção

7. **Perfis**
   - Perfil de usuário
   - Histórico de transações
   - Estatísticas

## 📝 Notas Técnicas

### Gas Optimization
- Structs empacotados
- Uso de eventos para histórico
- Funções view para leitura

### Padrões Utilizados
- Factory Pattern (contrato cria listings)
- Proxy Pattern (aprovações)
- Event-driven (comunicação com frontend)

### Tecnologias
- Solidity ^0.8.20
- Hardhat 2.19.0
- OpenZeppelin 5.0.1
- Ethers.js 6.9.0
- React 18.2.0
- Vite 5.0.8

