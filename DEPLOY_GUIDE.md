# 📝 Guia de Deploy - Arc Marketplace

Este guia detalha o processo de deploy dos smart contracts na Arc Testnet.

## 🔑 Pré-requisitos

1. **Carteira com USDC**: Você precisa de USDC na Arc Testnet para pagar o gas
2. **Private Key**: Tenha sua private key em mãos (NUNCA compartilhe!)
3. **Node.js**: Versão 16 ou superior

## 📋 Passo a Passo

### 1. Preparar Ambiente

```bash
# Instalar dependências
npm install

# Criar arquivo .env
cp .env.example .env
```

### 2. Configurar Private Key

Edite o arquivo `.env`:

```
PRIVATE_KEY=sua_private_key_aqui_sem_0x
ARC_TESTNET_RPC=https://rpc.testnet.arc.network
```

**⚠️ IMPORTANTE**: 
- Remova o prefixo `0x` da private key
- Nunca commite o arquivo `.env`
- Use uma carteira de teste, não sua carteira principal

### 3. Adicionar Arc Testnet no MetaMask

Antes de fazer deploy, configure sua carteira:

1. Abra MetaMask
2. Clique no seletor de redes
3. Clique em "Adicionar rede"
4. Preencha os dados:

```
Nome da Rede: Arc Testnet
Nova URL de RPC: https://rpc.testnet.arc.network
ID da Chain: 5042002
Símbolo da Moeda: USDC
URL do Explorador de Blocos: https://testnet.arcscan.app
```

5. Clique em "Salvar"

### 4. Obter USDC de Teste

Você precisa de USDC para pagar as taxas de deploy. Opções:

- Contate a equipe da Arc no Discord/Telegram
- Use um faucet se disponível
- Peça para alguém da comunidade

Verifique seu saldo em: https://testnet.arcscan.app

### 5. Compilar Contratos

```bash
npm run compile
```

Isso irá:
- Compilar `Marketplace.sol`
- Compilar `MockNFT.sol`
- Gerar ABIs na pasta `artifacts/`
- Verificar se há erros de sintaxe

### 6. Deploy

```bash
npm run deploy
```

O script irá:
1. Conectar à Arc Testnet
2. Fazer deploy do Marketplace
3. Fazer deploy do MockNFT
4. Salvar endereços em `deployments.json`
5. Exibir links para o explorer

**Output esperado:**
```
🚀 Iniciando deploy na Arc Testnet...
Chain ID: 5042002

📦 Fazendo deploy do Marketplace...
✅ Marketplace deployed to: 0x...

📦 Fazendo deploy do MockNFT...
✅ MockNFT deployed to: 0x...

📝 Endereços salvos em deployments.json

🔍 Verifique os contratos em:
   Marketplace: https://testnet.arcscan.app/address/0x...
   MockNFT: https://testnet.arcscan.app/address/0x...

✨ Deploy concluído com sucesso!
```

### 7. Verificar Deploy

Após o deploy, verifique:

1. **Arquivo deployments.json** foi criado
2. **Contratos no Explorer**: Acesse os links exibidos
3. **Saldo da carteira**: Confirme que USDC foi debitado

### 8. Atualizar Frontend

Abra `frontend/src/config/contracts.js` e atualize:

```javascript
export const CONTRACT_ADDRESSES = {
  marketplace: '0xSEU_ENDERECO_MARKETPLACE_AQUI',
  mockNFT: '0xSEU_ENDERECO_MOCKNFT_AQUI',
}
```

Use os endereços do arquivo `deployments.json`.

### 9. Testar Contratos

```bash
# Rodar testes locais
npm test

# Testar no frontend
cd frontend
npm run dev
```

Acesse http://localhost:3000 e:
1. Conecte sua carteira
2. Crie um NFT
3. Liste um NFT
4. Teste a compra (com outra conta)

## 🔍 Verificando Contratos no Explorer

### Ver Código do Contrato

1. Acesse https://testnet.arcscan.app
2. Cole o endereço do contrato
3. Navegue até a aba "Contract"

### Interagir com Contratos

No explorer, você pode:
- Ver transações
- Ler estado do contrato
- Chamar funções (se verificado)
- Ver eventos emitidos

## 🐛 Troubleshooting

### Erro: "Insufficient funds for gas"

**Problema**: Não há USDC suficiente na carteira

**Solução**:
```bash
# Verifique seu saldo
# Acesse: https://testnet.arcscan.app
# Cole seu endereço de carteira
```

### Erro: "Invalid private key"

**Problema**: Private key incorreta no .env

**Solução**:
- Verifique se a private key está correta
- Remova o prefixo `0x` se houver
- Certifique-se de não ter espaços extras

### Erro: "Network error"

**Problema**: Não consegue conectar à Arc Testnet

**Solução**:
```bash
# Teste a conexão RPC
curl https://rpc.testnet.arc.network \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Erro: "Nonce too high"

**Problema**: Transação pendente ou conflito de nonce

**Solução**:
- Aguarde transações anteriores confirmarem
- Limpe histórico de transações no MetaMask
- Reset da conta no MetaMask (Configurações → Avançado → Reset Account)

## 📊 Custos Estimados

Os custos de deploy na Arc Testnet são baixos:

| Contrato | Gas Estimado | Custo Aproximado |
|----------|--------------|------------------|
| Marketplace | ~2M gas | ~0.01 USDC |
| MockNFT | ~1.5M gas | ~0.008 USDC |
| **Total** | ~3.5M gas | **~0.018 USDC** |

*Custos podem variar dependendo do congestionamento da rede*

## 🔐 Segurança

### ✅ Boas Práticas

- Use carteira de teste para deploy
- Mantenha .env no .gitignore
- Nunca compartilhe private keys
- Faça backup do arquivo deployments.json
- Verifique endereços antes de usar

### ⚠️ Não Faça

- ❌ Commitar arquivo .env
- ❌ Usar carteira principal
- ❌ Compartilhar private key
- ❌ Deploy sem testar localmente
- ❌ Usar private key com fundos reais

## 📝 Checklist de Deploy

- [ ] Node.js instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo .env configurado
- [ ] Private key adicionada ao .env
- [ ] USDC disponível na carteira
- [ ] MetaMask configurado com Arc Testnet
- [ ] Contratos compilados sem erros
- [ ] Deploy executado com sucesso
- [ ] Arquivo deployments.json criado
- [ ] Contratos visíveis no explorer
- [ ] Endereços atualizados no frontend
- [ ] Frontend testado e funcionando

## 🎉 Próximos Passos

Após deploy bem-sucedido:

1. **Documente os endereços**: Salve em local seguro
2. **Teste todas as funcionalidades**: Mint, list, buy, cancel
3. **Compartilhe com usuários**: Forneça endereços dos contratos
4. **Monitor**: Acompanhe transações no explorer

## 📞 Suporte

Problemas durante o deploy?

1. Revise este guia passo a passo
2. Verifique logs de erro no console
3. Consulte documentação da Arc
4. Peça ajuda na comunidade

---

✨ **Parabéns!** Você fez deploy de um marketplace completo na Arc Testnet!

