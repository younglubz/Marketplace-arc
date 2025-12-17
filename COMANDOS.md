# ⚡ Comandos Úteis - Arc Marketplace

Referência rápida de todos os comandos disponíveis no projeto.

---

## 📦 Instalação

### Instalar Dependências Backend
```bash
npm install
```

### Instalar Dependências Frontend
```bash
cd frontend
npm install
cd ..
```

### Instalar Tudo de Uma Vez
```bash
npm install && cd frontend && npm install && cd ..
```

---

## 🔨 Desenvolvimento

### Compilar Smart Contracts
```bash
npm run compile
```

### Rodar Testes
```bash
npm test
```

### Rodar Teste Específico
```bash
npx hardhat test --grep "nome do teste"
```

### Limpar Cache e Recompilar
```bash
rm -rf artifacts cache
npm run compile
```

### Iniciar Frontend (Dev Mode)
```bash
npm run dev
# ou
cd frontend
npm run dev
```

### Build Frontend (Produção)
```bash
cd frontend
npm run build
```

---

## 🚀 Deploy

### Deploy na Arc Testnet
```bash
npm run deploy
```

### Deploy com Logs Verbosos
```bash
npx hardhat run scripts/deploy.js --network arcTestnet --verbose
```

### Deploy Apenas Marketplace
```bash
npx hardhat run scripts/deploy-marketplace-only.js --network arcTestnet
```

---

## 🧪 Scripts Utilitários

### Verificar Saldo da Carteira
```bash
npx hardhat run scripts/check-balance.js --network arcTestnet
```

### Mintar NFTs de Exemplo
```bash
npx hardhat run scripts/mint-example.js --network arcTestnet
```

### Verificar Contratos no Explorer
```bash
npx hardhat run scripts/verify-contracts.js --network arcTestnet
```

---

## 🔍 Hardhat Console

### Abrir Console (Rede Local)
```bash
npx hardhat console
```

### Abrir Console (Arc Testnet)
```bash
npx hardhat console --network arcTestnet
```

### Exemplos de Uso no Console
```javascript
// Conectar ao contrato Marketplace
const Marketplace = await ethers.getContractFactory("Marketplace");
const marketplace = await Marketplace.attach("ENDERECO_DO_CONTRATO");

// Ler taxa do marketplace
const fee = await marketplace.marketplaceFee();
console.log("Taxa:", fee.toString());

// Obter listagem
const listing = await marketplace.getListing(0);
console.log(listing);

// Obter listagens ativas
const active = await marketplace.getActiveListings(0, 10);
console.log(active);
```

---

## 🧹 Limpeza

### Limpar Artifacts e Cache
```bash
rm -rf artifacts cache
```

### Limpar Node Modules (Backend)
```bash
rm -rf node_modules package-lock.json
npm install
```

### Limpar Node Modules (Frontend)
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
cd ..
```

### Limpar Tudo e Reinstalar
```bash
rm -rf artifacts cache node_modules
rm -rf frontend/node_modules frontend/dist
npm install
cd frontend && npm install && cd ..
npm run compile
```

---

## 📊 Informações

### Ver Versão do Hardhat
```bash
npx hardhat --version
```

### Ver Versão do Node.js
```bash
node --version
```

### Ver Versão do npm
```bash
npm --version
```

### Listar Contas (Local)
```bash
npx hardhat accounts
```

### Ver Networks Configuradas
```bash
npx hardhat
```

---

## 🌐 Interação com a Blockchain

### Ver Último Bloco
```bash
curl https://rpc.testnet.arc.network \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Ver Saldo de Endereço
```bash
curl https://rpc.testnet.arc.network \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["ENDERECO","latest"],"id":1}'
```

### Ver Chain ID
```bash
curl https://rpc.testnet.arc.network \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

---

## 🔐 Segurança

### Criar Arquivo .env
```bash
cp .env.example .env
```

### Editar .env (Linux/Mac)
```bash
nano .env
# ou
vim .env
```

### Editar .env (Windows)
```powershell
notepad .env
```

### Verificar .env Não Está no Git
```bash
git status
# .env NÃO deve aparecer na lista
```

---

## 🐛 Debugging

### Rodar Testes com Gas Reporter
```bash
REPORT_GAS=true npm test
```

### Rodar Testes com Coverage
```bash
npx hardhat coverage
```

### Ver Logs Detalhados (Frontend)
```bash
cd frontend
npm run dev -- --debug
```

### Verificar Linter (JavaScript)
```bash
npx eslint .
```

### Corrigir Linter Automaticamente
```bash
npx eslint . --fix
```

---

## 📝 Git

### Inicializar Repositório
```bash
git init
```

### Adicionar Arquivos
```bash
git add .
```

### Commit
```bash
git commit -m "feat: implementa marketplace completo"
```

### Ver Status
```bash
git status
```

### Ver Histórico
```bash
git log --oneline
```

### Criar Branch
```bash
git checkout -b feature/nova-feature
```

---

## 🔄 Atualização

### Atualizar Dependências
```bash
npm update
cd frontend && npm update && cd ..
```

### Verificar Dependências Desatualizadas
```bash
npm outdated
```

### Atualizar Hardhat
```bash
npm install --save-dev hardhat@latest
```

### Atualizar OpenZeppelin
```bash
npm install @openzeppelin/contracts@latest
```

---

## 📱 Frontend Específico

### Iniciar Dev Server
```bash
cd frontend
npm run dev
```

### Build para Produção
```bash
cd frontend
npm run build
```

### Preview do Build
```bash
cd frontend
npm run preview
```

### Limpar Cache do Vite
```bash
cd frontend
rm -rf node_modules/.vite
```

---

## 🧪 Testes Específicos

### Testar Apenas Marketplace
```bash
npx hardhat test test/Marketplace.test.js
```

### Testar com Logs no Console
```bash
npx hardhat test --logs
```

### Testar em Rede Específica
```bash
npx hardhat test --network arcTestnet
```

---

## 📦 NPM Scripts Customizados

### Ver Todos os Scripts Disponíveis
```bash
npm run
```

### Scripts Definidos no package.json
```bash
npm run compile      # Compila contratos
npm run test         # Roda testes
npm run deploy       # Deploy na Arc Testnet
npm run dev          # Inicia frontend
```

---

## 🔧 Hardhat Tasks

### Ver Todas as Tasks
```bash
npx hardhat
```

### Criar Task Customizada
Adicione no `hardhat.config.js`:
```javascript
task("balance", "Prints account balance")
  .addParam("account", "The account address")
  .setAction(async (taskArgs) => {
    const balance = await ethers.provider.getBalance(taskArgs.account);
    console.log(ethers.formatEther(balance), "USDC");
  });
```

Usar:
```bash
npx hardhat balance --account 0x...
```

---

## 🌐 URLs Úteis

### Abrir Explorer no Navegador (Linux/Mac)
```bash
open https://testnet.arcscan.app
```

### Abrir Explorer no Navegador (Windows)
```powershell
start https://testnet.arcscan.app
```

### Ver Contrato no Explorer
```bash
# Linux/Mac
open "https://testnet.arcscan.app/address/ENDERECO_CONTRATO"

# Windows
start "https://testnet.arcscan.app/address/ENDERECO_CONTRATO"
```

---

## 📊 Comandos Compostos Úteis

### Setup Completo do Zero
```bash
npm install && \
cd frontend && npm install && cd .. && \
npm run compile && \
npm test
```

### Limpar, Reinstalar e Compilar
```bash
rm -rf artifacts cache node_modules && \
npm install && \
npm run compile
```

### Deploy e Verificar
```bash
npm run deploy && \
npx hardhat run scripts/verify-contracts.js --network arcTestnet
```

### Build Completo
```bash
npm run compile && \
npm test && \
cd frontend && npm run build && cd ..
```

---

## 🎯 One-Liners Úteis

### Contar Linhas de Código Solidity
```bash
find contracts -name "*.sol" | xargs wc -l
```

### Contar Linhas de Código JavaScript
```bash
find frontend/src -name "*.jsx" -o -name "*.js" | xargs wc -l
```

### Buscar TODO no Código
```bash
grep -r "TODO" contracts/ frontend/src/
```

### Ver Tamanho dos Contratos Compilados
```bash
ls -lh artifacts/contracts/**/*.json
```

---

## 💡 Atalhos e Aliases Recomendados

Adicione ao seu `.bashrc` ou `.zshrc`:

```bash
# Aliases Arc Marketplace
alias arc-compile="npm run compile"
alias arc-test="npm test"
alias arc-deploy="npm run deploy"
alias arc-dev="npm run dev"
alias arc-clean="rm -rf artifacts cache node_modules"
alias arc-balance="npx hardhat run scripts/check-balance.js --network arcTestnet"
```

Depois:
```bash
source ~/.bashrc  # ou ~/.zshrc
arc-compile
arc-deploy
```

---

## 🔥 Comandos de Emergência

### Reset Completo do MetaMask
1. Settings → Advanced → Reset Account

### Forçar Reinstalação
```bash
rm -rf node_modules package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
npm cache clean --force
npm install
cd frontend && npm install && cd ..
```

### Reverter para Estado Limpo (Git)
```bash
git reset --hard HEAD
git clean -fd
```

---

## 📚 Comandos de Documentação

### Gerar Documentação dos Contratos
```bash
npx hardhat docgen
```

### Ver Documentação
```bash
# Linux/Mac
open docs/index.html

# Windows  
start docs/index.html
```

---

## ✅ Checklist de Comandos

Antes de cada deploy:
```bash
npm run compile           # ✅
npm test                  # ✅
git status                # ✅
git commit -am "..."      # ✅
npm run deploy            # ✅
```

---

## 🎓 Comandos para Aprender

### Node.js REPL
```bash
node
> const ethers = require('ethers');
> ethers.version
```

### Hardhat Console (Explorar)
```bash
npx hardhat console --network arcTestnet
> const [signer] = await ethers.getSigners();
> console.log(await signer.getAddress());
```

---

## 🚨 Comandos de Diagnóstico

### Verificar Instalação
```bash
node --version && \
npm --version && \
npx hardhat --version && \
echo "✅ Tudo instalado!"
```

### Testar Conexão com Arc RPC
```bash
curl -f https://rpc.testnet.arc.network && \
echo "✅ RPC online!" || \
echo "❌ RPC offline!"
```

### Verificar Estrutura do Projeto
```bash
ls -la contracts/ && \
ls -la scripts/ && \
ls -la test/ && \
ls -la frontend/src/ && \
echo "✅ Estrutura OK!"
```

---

## 📖 Ajuda

### Ajuda do Hardhat
```bash
npx hardhat help
```

### Ajuda de Comando Específico
```bash
npx hardhat help compile
npx hardhat help test
```

### Ajuda do npm
```bash
npm help
npm help install
```

---

## 🎉 Comando Final

### Tudo de Uma Vez (Production Ready)
```bash
# Limpar
rm -rf artifacts cache && \

# Compilar
npm run compile && \

# Testar
npm test && \

# Deploy
npm run deploy && \

# Build Frontend
cd frontend && npm run build && cd .. && \

echo "🎉 Tudo pronto para produção!"
```

---

**💡 Dica:** Salve este arquivo nos favoritos para consulta rápida!

**📌 Bookmark:** file:///caminho/para/COMANDOS.md

---

*Arc Marketplace - Referência Rápida de Comandos*
*Chain ID: 5042002 | https://testnet.arcscan.app*

