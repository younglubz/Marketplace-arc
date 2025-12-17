# 🌟 Arc Marketplace

Um marketplace completo de NFTs construído na **Arc Testnet** com smart contracts Solidity e interface React moderna.

## 📋 Sobre o Projeto

Este marketplace permite:
- ✨ **Criar NFTs** - Transforme suas criações digitais em NFTs únicos
- 💰 **Vender NFTs** - Liste seus NFTs com preços personalizados
- 🛒 **Comprar NFTs** - Adquira NFTs de outros usuários
- 🔒 **Transações Seguras** - Smart contracts auditados e seguros

## 🌐 Rede Arc Testnet

- **Chain ID**: 5042002 (0x4cef52)
- **Moeda Nativa**: USDC
- **RPC URL**: https://rpc.testnet.arc.network
- **Explorer**: https://testnet.arcscan.app
- **Chainlist**: https://chainlist.org/chain/5042002

## 🏗️ Arquitetura

### Smart Contracts

1. **Marketplace.sol** - Contrato principal do marketplace
   - Listagem de NFTs
   - Compra/venda com taxa de 2.5%
   - Cancelamento de listagens
   - Gestão de taxas

2. **MockNFT.sol** - Contrato NFT (ERC-721) para testes
   - Mint de NFTs
   - Suporte a URIs de metadados
   - Batch minting

### Frontend

- **React 18** com Vite
- **Ethers.js v6** para interação Web3
- **React Router** para navegação
- **React Hot Toast** para notificações
- Design moderno e responsivo

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 16+ e npm
- MetaMask ou outra carteira Web3
- USDC na Arc Testnet para transações

### 1. Instalar Dependências

```bash
# Instalar dependências do projeto
npm install

# Instalar dependências do frontend
cd frontend
npm install
cd ..
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione sua private key:

```
PRIVATE_KEY=sua_private_key_aqui
ARC_TESTNET_RPC=https://rpc.testnet.arc.network
```

⚠️ **ATENÇÃO**: Nunca commite o arquivo `.env` com sua private key real!

### 3. Compilar Contratos

```bash
npm run compile
```

### 4. Deploy dos Contratos

```bash
npm run deploy
```

Após o deploy, os endereços dos contratos serão salvos em `deployments.json`.

### 5. Atualizar Endereços no Frontend

Abra o arquivo `frontend/src/config/contracts.js` e atualize os endereços com os valores do `deployments.json`:

```javascript
export const CONTRACT_ADDRESSES = {
  marketplace: '0x...', // Endereço do Marketplace
  mockNFT: '0x...', // Endereço do MockNFT
}
```

### 6. Iniciar Frontend

```bash
npm run dev
```

O frontend estará disponível em: http://localhost:3000

## 📱 Como Usar

### 1. Configurar MetaMask

1. Abra o MetaMask
2. Clique em "Adicionar Rede"
3. Use as informações da Arc Testnet:
   - **Nome da Rede**: Arc Testnet
   - **URL RPC**: https://rpc.testnet.arc.network
   - **Chain ID**: 5042002
   - **Símbolo**: USDC
   - **Block Explorer**: https://testnet.arcscan.app

Ou simplesmente conecte sua carteira no site - ele adicionará automaticamente!

### 2. Obter USDC de Teste

Você precisa de USDC na Arc Testnet para:
- Pagar gas fees
- Comprar NFTs

Contate a equipe da Arc para obter tokens de teste.

### 3. Criar seu Primeiro NFT

1. Clique em "Criar NFT"
2. Preencha os dados:
   - Nome do NFT
   - Descrição
   - URL da imagem (opcional)
3. Confirme a transação no MetaMask
4. Aguarde a confirmação

### 4. Listar NFT para Venda

1. Vá em "Meus NFTs"
2. Clique em "Vender no Marketplace"
3. Defina o preço em USDC
4. Aprove o marketplace (primeira vez)
5. Confirme a listagem

### 5. Comprar NFTs

1. Vá em "Explorar"
2. Navegue pelos NFTs disponíveis
3. Clique em "Comprar"
4. Confirme a transação com o valor do NFT

## 🧪 Testes

Execute os testes dos smart contracts:

```bash
npm test
```

Os testes cobrem:
- Listagem de NFTs
- Compra de NFTs
- Cancelamento de listagens
- Gestão de taxas
- Validações de segurança

## 📂 Estrutura do Projeto

```
Marketplace-arc/
├── contracts/              # Smart contracts
│   ├── Marketplace.sol    # Contrato do marketplace
│   └── MockNFT.sol        # Contrato NFT de teste
├── scripts/               # Scripts de deploy
│   └── deploy.js
├── test/                  # Testes
│   └── Marketplace.test.js
├── frontend/              # Aplicação React
│   ├── src/
│   │   ├── pages/        # Páginas da aplicação
│   │   ├── context/      # Context API (Web3)
│   │   ├── config/       # Configurações
│   │   └── abis/         # ABIs dos contratos
│   └── public/
├── hardhat.config.js      # Configuração Hardhat
├── package.json
└── README.md
```

## 🔐 Segurança

### Smart Contracts

- ✅ Uso de OpenZeppelin para padrões seguros
- ✅ ReentrancyGuard para prevenir ataques de reentrância
- ✅ Validações de permissões e ownership
- ✅ Testes abrangentes

### Frontend

- ✅ Validação de rede antes de transações
- ✅ Tratamento de erros
- ✅ Feedback visual para usuário
- ✅ Verificação de aprovações

## 💡 Funcionalidades dos Contratos

### Marketplace

```solidity
// Listar NFT
function listItem(address _nftContract, uint256 _tokenId, uint256 _price)

// Comprar NFT
function buyItem(uint256 _listingId) payable

// Cancelar listagem
function cancelListing(uint256 _listingId)

// Obter listagens ativas
function getActiveListings(uint256 _offset, uint256 _limit)

// Atualizar taxa (apenas owner)
function updateMarketplaceFee(uint256 _newFee)
```

### MockNFT (ERC-721)

```solidity
// Criar NFT
function mint(address _to, string memory _uri)

// Criar múltiplos NFTs
function batchMint(address _to, string[] memory _uris)
```

## 🎨 Funcionalidades do Frontend

- **Home**: Página inicial com informações sobre o marketplace
- **Explorar**: Navegue e compre NFTs listados
- **Criar NFT**: Interface para mint de novos NFTs
- **Meus NFTs**: Visualize e gerencie seus NFTs

## 🌍 Links Úteis

- [Arc Testnet Explorer](https://testnet.arcscan.app)
- [Chainlist - Arc Testnet](https://chainlist.org/chain/5042002)
- [Documentação Hardhat](https://hardhat.org)
- [Documentação Ethers.js](https://docs.ethers.org)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

## 📝 Notas para Produção

Antes de fazer deploy em produção:

1. **Metadados IPFS**: Implemente upload de imagens e metadados para IPFS
2. **Indexação**: Use um indexador (The Graph) para consultas eficientes
3. **Testes de Segurança**: Faça audit dos contratos
4. **Gas Optimization**: Otimize contratos para reduzir custos
5. **Rate Limiting**: Implemente proteção contra spam
6. **Backup**: Configure backup de dados importantes

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer fork do projeto
2. Criar uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abrir um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🆘 Suporte

Tendo problemas? 

1. Verifique se está na rede Arc Testnet correta
2. Confirme que tem USDC suficiente para gas
3. Verifique os endereços dos contratos em `config/contracts.js`
4. Veja os logs do console do navegador
5. Consulte o explorer da Arc para detalhes das transações

## 🎉 Pronto!

Agora você tem um marketplace completo de NFTs rodando na Arc Testnet!

Happy trading! 🚀✨

