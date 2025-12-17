# 🚀 Tecnologias e Recursos - Arc Marketplace

Documentação completa de todas as tecnologias, bibliotecas e recursos utilizados no projeto.

---

## 🏗️ Stack Tecnológico

### Backend / Blockchain

#### Solidity ^0.8.20
- **O que é:** Linguagem de programação para smart contracts
- **Por que usar:** Padrão da indústria para Ethereum e redes compatíveis
- **Onde usar:** `contracts/Marketplace.sol`, `contracts/MockNFT.sol`
- **Documentação:** https://docs.soliditylang.org

#### Hardhat 2.19.0
- **O que é:** Framework de desenvolvimento Ethereum
- **Por que usar:** Melhor DX, testes robustos, debugging poderoso
- **Recursos utilizados:**
  - Compilação de contratos
  - Rede de testes local
  - Scripts de deploy
  - Framework de testes
- **Documentação:** https://hardhat.org

#### OpenZeppelin Contracts 5.0.1
- **O que é:** Biblioteca de contratos seguros e auditados
- **Contratos utilizados:**
  - `ERC721` - Padrão NFT
  - `ERC721URIStorage` - Storage de URIs
  - `ReentrancyGuard` - Proteção contra reentrância
  - `Ownable` - Controle de acesso
- **Por que usar:** Segurança comprovada, padrões da indústria
- **Documentação:** https://docs.openzeppelin.com

#### Ethers.js 6.9.0
- **O que é:** Biblioteca JavaScript para interagir com Ethereum
- **Recursos utilizados:**
  - Conexão com blockchain
  - Assinatura de transações
  - Leitura de contratos
  - Parsing de eventos
- **Por que usar:** Moderna, leve, TypeScript-first
- **Documentação:** https://docs.ethers.org

---

### Frontend

#### React 18.2.0
- **O que é:** Biblioteca JavaScript para interfaces
- **Recursos utilizados:**
  - Hooks (useState, useEffect, useContext)
  - Context API
  - Componentes funcionais
- **Por que usar:** Popular, eficiente, ótimo ecossistema
- **Documentação:** https://react.dev

#### Vite 5.0.8
- **O que é:** Build tool moderna e rápida
- **Recursos utilizados:**
  - Dev server com HMR
  - Build otimizado
  - Plugin para React
- **Por que usar:** Extremamente rápido, configuração simples
- **Documentação:** https://vitejs.dev

#### React Router 6.20.0
- **O que é:** Roteamento para React
- **Recursos utilizados:**
  - BrowserRouter
  - Routes e Route
  - Link para navegação
- **Por que usar:** Padrão da indústria, SPA routing
- **Documentação:** https://reactrouter.com

#### React Hot Toast 2.4.1
- **O que é:** Notificações toast para React
- **Recursos utilizados:**
  - Toast de sucesso
  - Toast de erro
  - Toast de loading
- **Por que usar:** Simples, bonito, customizável
- **Documentação:** https://react-hot-toast.com

---

## 🌐 Blockchain e Rede

### Arc Testnet
- **Chain ID:** 5042002 (0x4cef52)
- **RPC URL:** https://rpc.testnet.arc.network
- **Explorer:** https://testnet.arcscan.app
- **Moeda:** USDC
- **Tipo:** EVM-compatible testnet
- **Características:**
  - Transações rápidas
  - Gas baixo
  - Stablecoin nativa
- **Chainlist:** https://chainlist.org/chain/5042002

---

## 📚 Padrões e Especificações

### ERC-721
- **O que é:** Padrão para tokens não-fungíveis (NFTs)
- **Implementação:** OpenZeppelin ERC721
- **Funções principais:**
  - `balanceOf()`
  - `ownerOf()`
  - `transferFrom()`
  - `approve()`
  - `setApprovalForAll()`
- **Especificação:** https://eips.ethereum.org/EIPS/eip-721

### ERC-721 URI Storage
- **O que é:** Extensão para armazenar URIs de metadados
- **Uso:** Links para imagens e metadados JSON
- **Padrão de metadados:**
```json
{
  "name": "Nome do NFT",
  "description": "Descrição",
  "image": "URL da imagem"
}
```

---

## 🔧 Ferramentas de Desenvolvimento

### Node.js 16+
- **O que é:** Runtime JavaScript
- **Por que usar:** Requerido por Hardhat e ferramentas modernas
- **Instalação:** https://nodejs.org

### npm / yarn
- **O que é:** Gerenciador de pacotes
- **Uso:** Instalar dependências, executar scripts
- **Comandos principais:**
  - `npm install`
  - `npm run <script>`
  - `npm test`

### Git
- **O que é:** Controle de versão
- **Uso:** Versionamento de código
- **Comandos principais:**
  - `git add`
  - `git commit`
  - `git push`

---

## 🎨 Design e UI

### CSS Moderno
- **Recursos utilizados:**
  - CSS Grid
  - Flexbox
  - CSS Variables (Custom Properties)
  - Animations e Transitions
  - Media Queries

### Design System
- **Paleta de Cores:**
  - Primary: #6366f1 (Indigo)
  - Secondary: #8b5cf6 (Purple)
  - Background: #0f172a (Dark Slate)
  - Success: #10b981 (Green)
  - Error: #ef4444 (Red)

- **Tipografia:**
  - Fonte: Inter
  - Tamanhos: 0.875rem a 3rem
  - Weights: 400, 500, 600, 700

- **Espaçamento:**
  - Sistema base: 0.25rem (4px)
  - Escala: 0.5rem, 1rem, 1.5rem, 2rem, 4rem

---

## 🔐 Segurança

### Práticas Implementadas

#### Smart Contracts
- ✅ **ReentrancyGuard** - OpenZeppelin
  - Previne ataques de reentrância
  - Usado em: `listItem()`, `buyItem()`, `cancelListing()`

- ✅ **Ownable** - OpenZeppelin
  - Controle de acesso baseado em ownership
  - Usado para funções administrativas

- ✅ **Checks-Effects-Interactions**
  - Padrão de segurança em Solidity
  - Validações → Mudanças de estado → Interações externas

- ✅ **Input Validation**
  - Verificação de preços
  - Verificação de ownership
  - Verificação de aprovações

#### Frontend
- ✅ **Network Validation**
  - Verifica Chain ID antes de transações
  - Oferece troca automática de rede

- ✅ **Error Handling**
  - Try-catch em todas as operações
  - Feedback claro ao usuário

- ✅ **Env Variables**
  - `.env` para dados sensíveis
  - `.env` no `.gitignore`

---

## 🧪 Testes

### Mocha
- **O que é:** Framework de testes JavaScript
- **Uso:** Estrutura dos testes (describe, it)
- **Integrado com:** Hardhat

### Chai
- **O que é:** Biblioteca de assertions
- **Uso:** Verificações (expect, assert)
- **Sintaxe:** `expect(value).to.equal(expected)`

### Hardhat Network
- **O que é:** Rede Ethereum local para testes
- **Recursos:**
  - Reset automático entre testes
  - Console.log em Solidity
  - Stack traces detalhados

---

## 📦 Dependências do Projeto

### Backend (package.json)
```json
{
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^4.0.0",
    "hardhat": "^2.19.0"
  },
  "dependencies": {
    "@openzeppelin/contracts": "^5.0.1"
  }
}
```

### Frontend (frontend/package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "ethers": "^6.9.0",
    "react-router-dom": "^6.20.0",
    "react-hot-toast": "^2.4.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}
```

---

## 🔌 Web3 / MetaMask

### MetaMask
- **O que é:** Carteira Web3 no navegador
- **Uso:** 
  - Gerenciar contas
  - Assinar transações
  - Trocar redes
- **API:** `window.ethereum`
- **Download:** https://metamask.io

### Window.ethereum API
- **Métodos utilizados:**
  - `eth_requestAccounts` - Conectar carteira
  - `wallet_switchEthereumChain` - Trocar rede
  - `wallet_addEthereumChain` - Adicionar rede
- **Eventos:**
  - `accountsChanged` - Mudança de conta
  - `chainChanged` - Mudança de rede

---

## 📡 Protocolos e APIs

### JSON-RPC
- **O que é:** Protocolo de comunicação com blockchain
- **Métodos usados:**
  - `eth_blockNumber` - Número do bloco
  - `eth_getBalance` - Saldo de conta
  - `eth_chainId` - ID da chain
  - `eth_call` - Chamar função (read-only)
  - `eth_sendTransaction` - Enviar transação

### Event Logs
- **O que é:** Sistema de logs da EVM
- **Eventos utilizados:**
  - `ItemListed` - NFT listado
  - `ItemSold` - NFT vendido
  - `ListingCancelled` - Listagem cancelada
  - `Transfer` - Transferência de NFT

---

## 🏗️ Arquitetura e Padrões

### Padrões de Design

#### Factory Pattern
- **Onde:** Marketplace cria listagens
- **Benefício:** Centralização da lógica

#### Event-Driven
- **Onde:** Comunicação contrato → frontend
- **Benefício:** Histórico imutável, indexação fácil

#### Context API Pattern
- **Onde:** Web3Context.jsx
- **Benefício:** Estado global sem prop drilling

#### Component Pattern
- **Onde:** React components
- **Benefício:** Reutilização, manutenibilidade

---

## 📊 Padrões de Código

### Solidity
- **Convenção:** PascalCase para contratos
- **Funções:** camelCase
- **Variáveis:** camelCase
- **Constantes:** UPPER_SNAKE_CASE
- **Events:** PascalCase

### JavaScript/React
- **Componentes:** PascalCase
- **Funções:** camelCase
- **Constantes:** UPPER_SNAKE_CASE
- **Arquivos:** PascalCase para componentes

---

## 🌍 Recursos Externos

### IPFS (Recomendado para Produção)
- **O que é:** Sistema de arquivos distribuído
- **Uso:** Hospedar imagens e metadados
- **Gateways:**
  - `https://ipfs.io/ipfs/`
  - `https://gateway.pinata.cloud/ipfs/`
- **Serviços:** Pinata, NFT.Storage, Web3.Storage

### Block Explorers
- **Arc Explorer:** https://testnet.arcscan.app
- **Recursos:**
  - Ver transações
  - Ver contratos
  - Ver eventos
  - Verificar código

---

## 💻 IDEs e Extensões Recomendadas

### Visual Studio Code
- **Extensões:**
  - Solidity (Juan Blanco)
  - ESLint
  - Prettier
  - GitLens
  - Hardhat Solidity

### Outras IDEs
- **Remix:** IDE online para Solidity
- **WebStorm:** IDE JetBrains para JavaScript

---

## 📚 Recursos de Aprendizado

### Documentação Oficial
- [Solidity Docs](https://docs.soliditylang.org)
- [Hardhat Docs](https://hardhat.org)
- [OpenZeppelin Docs](https://docs.openzeppelin.com)
- [Ethers.js Docs](https://docs.ethers.org)
- [React Docs](https://react.dev)

### Tutoriais
- [CryptoZombies](https://cryptozombies.io)
- [Ethereum.org Learn](https://ethereum.org/en/developers/)
- [Hardhat Tutorial](https://hardhat.org/tutorial)

### Comunidades
- Discord da Arc
- Ethereum Stack Exchange
- Reddit r/ethdev
- GitHub Discussions

---

## 🔄 Versionamento

### Semantic Versioning
- **Formato:** MAJOR.MINOR.PATCH
- **Atual:** 1.0.0
- **Exemplo:**
  - 1.0.0 → 1.0.1 (bug fix)
  - 1.0.0 → 1.1.0 (new feature)
  - 1.0.0 → 2.0.0 (breaking change)

---

## 🎯 Tecnologias Futuras (Roadmap)

### Em Consideração
- [ ] **The Graph** - Indexação de eventos
- [ ] **TypeScript** - Type safety no frontend
- [ ] **IPFS SDK** - Upload direto de imagens
- [ ] **Wagmi** - Hooks React para Web3
- [ ] **RainbowKit** - UI de conexão de carteira
- [ ] **Hardhat Deploy** - Deploy mais robusto
- [ ] **Slither** - Análise de segurança
- [ ] **Tenderly** - Monitoring e debugging

---

## 📊 Estatísticas Técnicas

| Categoria | Tecnologias | Total |
|-----------|-------------|-------|
| **Languages** | Solidity, JavaScript, CSS, HTML | 4 |
| **Frameworks** | Hardhat, React, Vite | 3 |
| **Libraries** | OpenZeppelin, Ethers.js, React Router | 10+ |
| **Tools** | Node.js, npm, Git, MetaMask | 5+ |
| **Padrões** | ERC-721, JSON-RPC, REST | 3+ |
| **Total** | | **25+** |

---

## 🏆 Por que Esta Stack?

### ✅ Vantagens

1. **Segurança**
   - OpenZeppelin auditado
   - Padrões comprovados
   - Hardhat testing robusto

2. **Performance**
   - Vite é extremamente rápido
   - React é otimizado
   - Arc Testnet tem baixa latência

3. **Developer Experience**
   - Hardhat tem excelente DX
   - Hot reload no frontend
   - Debugging poderoso

4. **Comunidade**
   - Todas as tecnologias têm grandes comunidades
   - Muitos recursos de aprendizado
   - Suporte ativo

5. **Manutenibilidade**
   - Código limpo e organizado
   - Padrões consistentes
   - Documentação completa

---

## 🔗 Links Úteis

### Documentação
- [Solidity](https://docs.soliditylang.org)
- [Hardhat](https://hardhat.org)
- [OpenZeppelin](https://docs.openzeppelin.com)
- [Ethers.js](https://docs.ethers.org)
- [React](https://react.dev)
- [Vite](https://vitejs.dev)

### Tools
- [Arc Explorer](https://testnet.arcscan.app)
- [MetaMask](https://metamask.io)
- [Remix IDE](https://remix.ethereum.org)
- [Chainlist](https://chainlist.org)

### Learning
- [CryptoZombies](https://cryptozombies.io)
- [Ethereum.org](https://ethereum.org/en/developers/)
- [OpenZeppelin Learn](https://docs.openzeppelin.com/learn/)

---

**🎓 Esta stack foi escolhida para oferecer o melhor equilíbrio entre segurança, performance e experiência de desenvolvimento!**

---

*Arc Marketplace - Stack Tecnológica v1.0*
*Atualizado: Dezembro 2025*

