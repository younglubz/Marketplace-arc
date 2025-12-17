# 🚀 Quick Deploy Guide - Arc Marketplace

## ❌ Erro: "missing revert data"

Este erro significa que **os contratos não foram deployados** ainda.

---

## ✅ SOLUÇÃO RÁPIDA (5 Passos):

### 1️⃣ Configure a Private Key

Crie o arquivo `.env` na raiz do projeto:

```bash
# Windows PowerShell:
echo PRIVATE_KEY=sua_private_key_sem_0x > .env

# Linux/Mac:
echo "PRIVATE_KEY=sua_private_key_sem_0x" > .env
```

⚠️ **IMPORTANTE:**
- Use uma carteira de **TESTE** (não sua principal!)
- Remova o prefixo `0x` da private key
- Nunca commite o arquivo `.env`

---

### 2️⃣ Obtenha USDC na Arc Testnet

Você precisa de ~0.05 USDC para pagar o gas do deploy.

**Como obter:**
- Discord oficial da Arc
- Telegram da comunidade Arc
- Faucet (se disponível)
- Peça para alguém enviar

**Verificar saldo:**
```bash
npx hardhat run scripts/check-balance.js --network arcTestnet
```

---

### 3️⃣ Compile os Contratos

```bash
npm run compile
```

✅ Deve mostrar: `Compiled X Solidity files successfully`

---

### 4️⃣ Faça o Deploy

```bash
npm run deploy
```

✅ Deve mostrar:
```
🚀 Iniciando deploy na Arc Testnet...
✅ Marketplace deployed to: 0xABC123...
✅ MockNFT deployed to: 0xDEF456...
📝 Endereços salvos em deployments.json
```

---

### 5️⃣ Atualize o Frontend

Abra `frontend/src/config/contracts.js` e cole os endereços:

```javascript
export const CONTRACT_ADDRESSES = {
  marketplace: '0xABC123...', // Do deployments.json
  mockNFT: '0xDEF456...', // Do deployments.json
}
```

Salve e **recarregue** o navegador (F5).

---

## ✅ PRONTO!

Agora você pode criar NFTs! 🎉

---

## 🐛 Problemas Comuns:

### "Insufficient funds"
❌ Não tem USDC suficiente
✅ Obtenha mais USDC de teste

### "Invalid private key"
❌ Private key incorreta no `.env`
✅ Verifique se removeu o `0x`

### "Network error"
❌ RPC da Arc offline
✅ Tente novamente mais tarde

### Ainda não funciona?
📖 Consulte: `DEPLOY_GUIDE.md`
💬 Peça ajuda no Discord da Arc

---

## 📊 Checklist:

```
[ ] Tem USDC na Arc Testnet
[ ] Criou arquivo .env
[ ] npm run compile (sucesso)
[ ] npm run deploy (sucesso)  
[ ] Atualizou contracts.js
[ ] Recarregou navegador
```

---

**🎉 Boa sorte com o deploy!**

