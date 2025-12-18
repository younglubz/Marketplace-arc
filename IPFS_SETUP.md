# 🔗 Configuração IPFS

Este projeto usa **IPFS (InterPlanetary File System)** para armazenar imagens e metadados de NFTs de forma descentralizada.

## 🎯 Por que usar IPFS?

- ✅ **Descentralizado**: Arquivos não dependem de servidores centralizados
- ✅ **Imutável**: Conteúdo não pode ser alterado após upload
- ✅ **Eficiente**: Reduz custos de gas ao não armazenar dados grandes na blockchain
- ✅ **Padrão da indústria**: Prática padrão para NFTs profissionais

## 🚀 Configuração Rápida

### Opção 1: Pinata (Recomendado - Gratuito até 1GB/mês)

1. **Crie uma conta gratuita**
   - Acesse: https://pinata.cloud
   - Faça cadastro (grátis)

2. **Gere API Keys**
   - Vá em: **Account Settings** → **API Keys**
   - Clique em **"New Key"**
   - Selecione permissões: **pinFileToIPFS**, **pinJSONToIPFS**
   - Copie a **API Key** e **Secret Key**

3. **Configure no projeto**
   - Crie arquivo `.env` na pasta `frontend/`
   - Adicione suas chaves:
   ```env
   VITE_PINATA_API_KEY=sua_api_key_aqui
   VITE_PINATA_SECRET_KEY=sua_secret_key_aqui
   ```

4. **Reinicie o servidor**
   ```bash
   cd frontend
   npm run dev
   ```

### Configuração para GitHub Pages (Produção)

Para que o build no GitHub Actions funcione corretamente, você precisa configurar os secrets do repositório:

1. **Acesse o repositório no GitHub**
   - Vá para: **Settings** → **Secrets and variables** → **Actions**

2. **Adicione os secrets**
   - Clique em **"New repository secret"**
   - Adicione os seguintes secrets:
     - **Nome**: `VITE_PINATA_API_KEY`
     - **Valor**: Sua API Key do Pinata
   
   - Clique em **"New repository secret"** novamente:
     - **Nome**: `VITE_PINATA_SECRET_KEY`
     - **Valor**: Sua Secret Key do Pinata

3. **O workflow já está configurado**
   - O arquivo `.github/workflows/deploy.yml` já está configurado para usar esses secrets automaticamente durante o build

**⚠️ IMPORTANTE**: 
- Nunca commite o arquivo `.env` no Git (já está no `.gitignore`)
- Use GitHub Secrets apenas para builds de produção
- Para desenvolvimento local, use o arquivo `frontend/.env`

### Opção 2: Web3.Storage (Alternativa)

1. **Crie uma conta**
   - Acesse: https://web3.storage
   - Faça cadastro (gratuito)

2. **Obtenha o Token**
   - Vá em: **Account** → **Create API Token**
   - Copie o token gerado

3. **Configure no projeto**
   - Adicione no `.env`:
   ```env
   VITE_WEB3_STORAGE_TOKEN=seu_token_aqui
   ```

## 📝 Arquivo .env de Exemplo

Crie `frontend/.env` com:

```env
# Pinata (Recomendado)
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_KEY=your_pinata_secret_key

# Web3.Storage (Alternativa)
VITE_WEB3_STORAGE_TOKEN=your_web3_storage_token
```

## 🔄 Como Funciona

1. **Upload de Imagem**:
   - Usuário seleciona imagem
   - Sistema comprime a imagem
   - Upload automático para IPFS
   - Retorna hash IPFS (ex: `QmXxxx...`)

2. **Upload de Metadados**:
   - Metadados do NFT são criados
   - Upload automático para IPFS
   - Hash IPFS é usado como `tokenURI`

3. **Armazenamento na Blockchain**:
   - Apenas o hash IPFS é armazenado no contrato
   - Imagem e metadados ficam no IPFS
   - Reduz drasticamente custos de gas

## 🌐 Gateways IPFS

Os arquivos podem ser acessados via qualquer gateway:

- **Pinata**: `https://gateway.pinata.cloud/ipfs/{hash}`
- **IPFS Público**: `https://ipfs.io/ipfs/{hash}`
- **Cloudflare**: `https://cloudflare-ipfs.com/ipfs/{hash}`

## ⚠️ Sem API Keys Configuradas

Se você não configurar API keys:
- Sistema tentará usar método alternativo
- Se falhar, usará base64 inline (não recomendado)
- Funciona, mas aumenta custos de gas

## 📚 Recursos

- [Pinata Docs](https://docs.pinata.cloud)
- [Web3.Storage Docs](https://web3.storage/docs)
- [IPFS Docs](https://docs.ipfs.io)

## 🎉 Pronto!

Após configurar, todas as imagens serão automaticamente enviadas para IPFS quando você criar NFTs!

