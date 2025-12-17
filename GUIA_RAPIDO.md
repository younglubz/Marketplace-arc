# 🚀 Guia Rápido - Arc Marketplace

## ⚡ Setup em 5 Minutos

### 1. Instalar
```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Configurar
```bash
# Crie .env com sua private key
echo "PRIVATE_KEY=sua_chave_aqui" > .env
```

### 3. Deploy
```bash
npm run compile
npm run deploy
```

### 4. Atualizar Frontend
Abra `frontend/src/config/contracts.js` e cole os endereços do `deployments.json`

### 5. Rodar
```bash
npm run dev
```

Acesse: http://localhost:3000

## 🎯 Checklist Rápido

- [ ] Node.js 16+ instalado
- [ ] MetaMask instalado
- [ ] Arquivo .env criado com PRIVATE_KEY
- [ ] Contratos compilados (`npm run compile`)
- [ ] Contratos deployed (`npm run deploy`)
- [ ] Endereços atualizados no `frontend/src/config/contracts.js`
- [ ] Frontend rodando (`npm run dev`)
- [ ] MetaMask conectado à Arc Testnet
- [ ] USDC de teste na carteira

## 🔧 Comandos Úteis

```bash
# Compilar contratos
npm run compile

# Deploy na Arc Testnet
npm run deploy

# Rodar testes
npm test

# Iniciar frontend
npm run dev
```

## 🌐 Arc Testnet - Adicionar no MetaMask

- **Network Name**: Arc Testnet
- **RPC URL**: https://rpc.testnet.arc.network
- **Chain ID**: 5042002
- **Currency**: USDC
- **Explorer**: https://testnet.arcscan.app

## ⚠️ Problemas Comuns

**Erro: "Insufficient funds"**
→ Você precisa de USDC na Arc Testnet para gas

**Erro: "Wrong network"**
→ Troque para Arc Testnet no MetaMask

**Erro: "Contract not deployed"**
→ Verifique os endereços em `frontend/src/config/contracts.js`

**NFTs não aparecem**
→ Aguarde alguns segundos e recarregue a página

## 🎨 Fluxo de Uso

1. **Criar NFT** → Vá em "Criar NFT"
2. **Listar** → Vá em "Meus NFTs" → "Vender no Marketplace"
3. **Comprar** → Vá em "Explorar" → Escolha um NFT → "Comprar"

## 📞 Mais Informações

Consulte o [README.md](README.md) para documentação completa.

