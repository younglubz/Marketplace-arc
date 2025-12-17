# 🔧 Troubleshooting - Arc Marketplace

Guia completo de solução de problemas comuns.

## 🚨 Problemas Comuns e Soluções

### 1. Erro: "Insufficient funds for gas"

**Sintomas:**
```
Error: insufficient funds for intrinsic transaction cost
```

**Causa:** Não há USDC suficiente na carteira para pagar o gas.

**Solução:**
1. Verifique seu saldo:
   ```bash
   npx hardhat run scripts/check-balance.js --network arcTestnet
   ```
2. Ou acesse: https://testnet.arcscan.app/address/SEU_ENDERECO
3. Obtenha USDC de teste da equipe Arc
4. Mínimo recomendado: 0.05 USDC

---

### 2. Erro: "Invalid private key"

**Sintomas:**
```
Error: invalid private key
```

**Causa:** Private key incorreta no arquivo `.env`.

**Solução:**
1. Abra `.env`
2. Verifique a private key:
   - ✅ Correto: `PRIVATE_KEY=abc123...` (sem 0x)
   - ❌ Errado: `PRIVATE_KEY=0xabc123...` (com 0x)
   - ❌ Errado: `PRIVATE_KEY = abc123...` (espaços)
3. Remova o prefixo `0x` se houver
4. Remova espaços extras
5. Verifique se não há quebras de linha

---

### 3. Erro: "Network error" ou "Could not connect"

**Sintomas:**
```
Error: could not detect network
ProviderError: Network request failed
```

**Causa:** Não consegue conectar à RPC da Arc Testnet.

**Solução:**
1. Teste a RPC:
   ```bash
   curl https://rpc.testnet.arc.network \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```
2. Se não responder, a RPC pode estar offline
3. Verifique sua conexão de internet
4. Tente um RPC alternativo (se disponível)
5. Aguarde e tente novamente mais tarde

---

### 4. Erro: "Nonce too high"

**Sintomas:**
```
Error: nonce has already been used
replacement transaction underpriced
```

**Causa:** Conflito de nonce ou transação pendente.

**Solução:**
1. Aguarde transações pendentes confirmarem
2. No MetaMask:
   - Settings → Advanced → Reset Account
3. Ou aguarde ~5 minutos
4. Tente novamente

---

### 5. Erro: "Transaction reverted without a reason"

**Sintomas:**
```
Error: Transaction reverted without a reason string
```

**Causas Possíveis & Soluções:**

#### a) Rede errada
- Verifique se está na Arc Testnet (Chain ID: 5042002)
- Troque no MetaMask

#### b) Sem aprovação
- Primeira venda: aprove o marketplace primeiro
- Use `setApprovalForAll()` no contrato NFT

#### c) Preço inválido
- Preço deve ser > 0
- Use valores em wei (use ethers.parseEther())

#### d) NFT já vendido
- Verifique status da listagem
- Atualize a página

#### e) Não é o dono
- Só o dono pode listar
- Verifique ownership no explorer

---

### 6. MetaMask não abre/conecta

**Sintomas:**
- Botão "Conectar Carteira" não faz nada
- MetaMask não abre

**Solução:**
1. Verifique se MetaMask está instalado
2. Desbloqueie o MetaMask
3. Tente em aba anônima
4. Limpe cache do navegador:
   ```
   Chrome: Ctrl+Shift+Del
   Firefox: Ctrl+Shift+Del
   Edge: Ctrl+Shift+Del
   ```
5. Desabilite outras extensões de wallet
6. Recarregue a página (F5)

---

### 7. NFTs não aparecem em "Meus NFTs"

**Sintomas:**
- Página vazia
- Loading infinito
- NFT criado não aparece

**Solução:**
1. Aguarde 10-30 segundos
2. Recarregue a página (F5)
3. Verifique transação no explorer
4. Confirme que está na conta correta
5. Verifique console do navegador (F12)
6. Limpe cache e recarregue

---

### 8. Erro ao compilar contratos

**Sintomas:**
```
Error HH606: Solidity compilation failed
```

**Solução:**
1. Limpe cache:
   ```bash
   rm -rf artifacts cache
   npm run compile
   ```
2. Verifique versão do Solidity no `hardhat.config.js`
3. Reinstale dependências:
   ```bash
   rm -rf node_modules
   npm install
   ```

---

### 9. Erro ao fazer deploy

**Sintomas:**
```
Error: could not deploy contract
```

**Solução:**
1. Verifique saldo: `npm run scripts/check-balance.js`
2. Confirme `.env` configurado corretamente
3. Teste rede:
   ```bash
   npx hardhat run scripts/check-balance.js --network arcTestnet
   ```
4. Verifique logs para mais detalhes
5. Tente aumentar gasPrice no `hardhat.config.js`

---

### 10. Frontend não inicia

**Sintomas:**
```
Error: Cannot find module
Module parse failed
```

**Solução:**
1. Reinstale dependências:
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```
2. Verifique Node.js versão (mínimo 16):
   ```bash
   node --version
   ```
3. Limpe cache:
   ```bash
   npm cache clean --force
   ```

---

### 11. Imagens não carregam

**Sintomas:**
- Placeholder aparece em vez de imagem
- Erro 404 nas imagens

**Solução:**
1. Verifique URL da imagem é acessível
2. Teste a URL no navegador
3. Verifique CORS (Cross-Origin)
4. Use URLs HTTPS (não HTTP)
5. Para IPFS:
   - Use gateway: `https://ipfs.io/ipfs/HASH`
   - Não apenas: `ipfs://HASH`

---

### 12. Erro: "User denied transaction"

**Sintomas:**
```
Error: User denied transaction signature
```

**Causa:** Usuário clicou "Rejeitar" no MetaMask.

**Solução:**
- Normal! Usuário pode rejeitar
- Tente novamente se foi acidental
- Verifique se o gas price está aceitável

---

### 13. Testes falhando

**Sintomas:**
```
1 failing
AssertionError: expected false to be true
```

**Solução:**
1. Verifique se compilou:
   ```bash
   npm run compile
   ```
2. Execute testes individuais:
   ```bash
   npx hardhat test --grep "nome do teste"
   ```
3. Verifique logs de erro
4. Confirme contratos não mudaram
5. Reinstale OpenZeppelin:
   ```bash
   npm install @openzeppelin/contracts
   ```

---

### 14. Wrong network warning

**Sintomas:**
- Badge "Rede Incorreta" aparece
- Transações não funcionam

**Solução:**
1. Clique para trocar automaticamente
2. Ou manualmente no MetaMask:
   - Clique no seletor de rede
   - Selecione "Arc Testnet"
3. Se não aparecer, adicione manualmente:
   ```
   Nome: Arc Testnet
   RPC: https://rpc.testnet.arc.network
   Chain ID: 5042002
   Símbolo: USDC
   Explorer: https://testnet.arcscan.app
   ```

---

### 15. Erro ao verificar contratos

**Sintomas:**
```
Error in plugin @nomiclabs/hardhat-etherscan
```

**Solução:**
1. Arc Explorer pode não ter API de verificação
2. Verifique manualmente:
   - Acesse: https://testnet.arcscan.app/address/ENDERECO
   - Vá na aba "Contract"
   - Clique "Verify & Publish"
   - Cole o código do contrato
   - Configure compilador (Solidity 0.8.20, optimizer 200)
   - Submit

---

## 🔍 Debugging Avançado

### Ver Logs do Navegador

1. Abra DevTools (F12)
2. Vá na aba "Console"
3. Procure por erros em vermelho
4. Anote mensagem completa

### Ver Detalhes da Transação

1. Copie hash da transação
2. Acesse: https://testnet.arcscan.app/tx/HASH
3. Veja:
   - Status (Success/Failed)
   - Gas usado
   - Erro (se houver)
   - Eventos emitidos

### Debugar Smart Contracts

```bash
# Console do Hardhat
npx hardhat console --network arcTestnet

# Testar função específica
const Marketplace = await ethers.getContractFactory("Marketplace");
const marketplace = await Marketplace.attach("ENDERECO");
const result = await marketplace.getListing(0);
console.log(result);
```

### Verificar Estado do Contrato

```javascript
// No frontend console (F12)
const provider = new ethers.BrowserProvider(window.ethereum);
const contract = new ethers.Contract(
  "ENDERECO_CONTRATO",
  ABI,
  provider
);
const fee = await contract.marketplaceFee();
console.log("Taxa:", fee.toString());
```

---

## 📊 Checklist de Debugging

Quando algo não funcionar, verifique nesta ordem:

- [ ] 1. Está na rede correta? (Chain ID: 5042002)
- [ ] 2. Tem USDC suficiente?
- [ ] 3. Carteira está conectada?
- [ ] 4. Contratos foram deployed?
- [ ] 5. Endereços estão corretos no frontend?
- [ ] 6. Transação confirmou no explorer?
- [ ] 7. Aprovações foram feitas?
- [ ] 8. Console do navegador mostra erros?
- [ ] 9. RPC está respondendo?
- [ ] 10. Cache foi limpo?

---

## 🆘 Ainda com Problemas?

### 1. Reinício Completo

```bash
# Backend
rm -rf artifacts cache node_modules
npm install
npm run compile

# Frontend
cd frontend
rm -rf node_modules dist
npm install
cd ..

# MetaMask
# Settings → Advanced → Reset Account
```

### 2. Ambiente Limpo

```bash
# Criar nova pasta
mkdir arc-marketplace-clean
cd arc-marketplace-clean

# Clone novamente
git clone <repo>
cd <projeto>

# Setup do zero
npm install
# ... resto do setup
```

### 3. Verificar Versões

```bash
node --version      # Deve ser 16+
npm --version       # Deve ser 8+
npx hardhat --version
```

### 4. Logs Detalhados

```bash
# Hardhat com logs verbosos
npx hardhat run scripts/deploy.js --network arcTestnet --verbose

# Frontend com source maps
cd frontend
npm run dev -- --debug
```

---

## 💡 Dicas de Prevenção

### Antes de Começar
- ✅ Use carteira de teste
- ✅ Anote private key em local seguro
- ✅ Faça backup do `.env`
- ✅ Teste localmente primeiro

### Durante Desenvolvimento
- ✅ Commite código frequentemente
- ✅ Teste após cada mudança
- ✅ Mantenha documentação atualizada
- ✅ Use controle de versão

### Antes de Deploy
- ✅ Execute todos os testes
- ✅ Verifique saldo suficiente
- ✅ Revise configuração de rede
- ✅ Faça backup de tudo

---

## 📞 Recursos de Ajuda

### Documentação
- [README.md](README.md) - Documentação principal
- [FAQ.md](FAQ.md) - Perguntas frequentes
- [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) - Guia de deploy

### Comunidade
- Arc Discord/Telegram - Suporte oficial
- GitHub Issues - Bugs e features
- Stack Overflow - tag: web3, ethereum

### Ferramentas Úteis
- https://testnet.arcscan.app - Explorer
- https://chainlist.org/chain/5042002 - Info da rede
- https://docs.ethers.org - Ethers.js docs
- https://hardhat.org/docs - Hardhat docs

---

## 🎯 Problema Não Listado?

1. **Verifique logs**: Console + Terminal
2. **Google o erro**: Erro exato entre aspas
3. **Abra Issue**: Se for bug do projeto
4. **Peça ajuda**: Discord/Telegram da Arc

---

**Boa sorte com o debugging! 🐛🔨**

*Se encontrou solução para um problema não listado, considere contribuir atualizando este guia!*

