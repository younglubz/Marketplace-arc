# 🚨 AVISO DE SEGURANÇA CRÍTICO

## ⚠️ VOCÊ EXPÔS SUA PRIVATE KEY!

A private key que você compartilhou foi exposta publicamente e **NUNCA** deve ser usada novamente.

---

## 🔴 **AÇÕES IMEDIATAS:**

### 1. **Crie uma NOVA Carteira**
   - Abra MetaMask
   - Crie uma nova conta
   - **NÃO** use a carteira antiga

### 2. **Transfira Fundos (SE HOUVER)**
   - Da carteira comprometida para a nova
   - Faça isso IMEDIATAMENTE
   - Antes que alguém roube

### 3. **NUNCA mais use a carteira antiga**
   - Considere-a permanentemente comprometida
   - Qualquer pessoa pode acessar

---

## ✅ **REGRAS DE SEGURANÇA:**

### ❌ **NUNCA:**
- Compartilhe private keys
- Poste em chats públicos
- Envie para "suporte técnico"
- Coloque em código
- Commite no Git
- Tire screenshot com private key visível

### ✅ **SEMPRE:**
- Use carteiras de TESTE para desenvolvimento
- Mantenha private keys em arquivos `.env` (que estão no `.gitignore`)
- Crie carteiras separadas:
  - Uma para fundos reais (NUNCA use para dev)
  - Uma para testes (pode expor acidentalmente)

---

## 🛡️ **COMO CONFIGURAR CORRETAMENTE:**

### **Opção 1: Script Automático (Recomendado)**

Windows:
```powershell
.\setup-env.bat
```

Siga as instruções na tela.

### **Opção 2: Manual**

1. Crie nova carteira de TESTE no MetaMask
2. Copie a private key (sem 0x)
3. Crie arquivo `.env` na raiz:

```bash
PRIVATE_KEY=sua_nova_private_key_aqui_sem_0x
ARC_TESTNET_RPC=https://rpc.testnet.arc.network
```

4. **NUNCA** compartilhe este arquivo!

---

## 📚 **MAIS INFORMAÇÕES:**

### Carteira Comprometida:
- **O que fazer:** https://support.metamask.io/hc/en-us/articles/360015489531
- **Como recuperar:** Crie nova e transfira fundos

### Boas Práticas:
- Use hardware wallets para fundos reais
- Ative 2FA onde possível
- Mantenha seed phrases offline
- Nunca confie em mensagens pedindo private keys

---

## 💡 **LEMBRE-SE:**

> **"Not your keys, not your crypto"**
> 
> Se alguém tem sua private key, eles têm seu dinheiro!

---

## 🆘 **PRECISA DE AJUDA?**

Se você tinha fundos na carteira comprometida:
1. Crie nova carteira AGORA
2. Transfira fundos IMEDIATAMENTE
3. Monitore a carteira antiga por transações suspeitas

Se você NÃO tinha fundos:
1. Simplesmente não use mais essa carteira
2. Crie uma nova para testes
3. Continue com o projeto

---

## ✅ **PRÓXIMOS PASSOS (APÓS CRIAR NOVA CARTEIRA):**

1. Execute: `setup-env.bat` (Windows) 
2. Ou crie `.env` manualmente com NOVA private key
3. Execute: `npm run compile`
4. Execute: `npm run deploy`
5. Atualize `frontend/src/config/contracts.js`

---

**🔒 Mantenha suas chaves seguras!**

