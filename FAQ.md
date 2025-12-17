# ❓ FAQ - Perguntas Frequentes

## 🔧 Instalação e Configuração

### P: Preciso de experiência com blockchain para usar este projeto?
**R:** Para usar o marketplace como usuário, não! Basta ter MetaMask instalado e seguir o guia. Para desenvolver/modificar, conhecimento básico de Solidity e React ajuda.

### P: Onde consigo USDC para a Arc Testnet?
**R:** Entre em contato com a equipe da Arc através do Discord/Telegram oficial. Eles fornecem tokens de teste para desenvolvedores.

### P: O projeto funciona em Windows?
**R:** Sim! O projeto foi testado e funciona no Windows, Mac e Linux.

### P: Preciso instalar algo além do Node.js?
**R:** Só o Node.js 16+ e o MetaMask. Tudo mais é instalado via npm.

## 🌐 Rede Arc Testnet

### P: Por que usar Arc Testnet?
**R:** Arc Testnet oferece:
- Transações rápidas
- Baixo custo de gas
- Moeda nativa USDC (stablecoin)
- Compatibilidade total com Ethereum

### P: Quanto custa fazer transações na Arc Testnet?
**R:** As transações são muito baratas (frações de centavo). Para testes, os tokens são gratuitos.

### P: Posso usar na mainnet?
**R:** Este projeto está configurado para testnet. Para usar na mainnet, você precisaria:
1. Atualizar o `hardhat.config.js`
2. Fazer deploy dos contratos na mainnet
3. Ter USDC real para gas
4. Realizar auditorias de segurança nos contratos

### P: O que acontece se eu selecionar a rede errada?
**R:** O frontend detecta automaticamente e oferece trocar para Arc Testnet.

## 💰 Marketplace

### P: Qual a taxa do marketplace?
**R:** 2.5% sobre cada venda. Por exemplo, se você vender um NFT por 100 USDC, receberá 97.5 USDC.

### P: Posso mudar a taxa?
**R:** Sim! O owner do contrato pode atualizar a taxa (máximo 10%) usando a função `updateMarketplaceFee()`.

### P: Posso vender NFTs de outros contratos?
**R:** Sim! O marketplace aceita qualquer contrato ERC-721. Basta usar o endereço correto ao listar.

### P: O que acontece se eu listar e depois transferir o NFT?
**R:** A compra falhará porque você não é mais o dono. É melhor cancelar a listagem antes de transferir.

### P: Posso editar o preço após listar?
**R:** Não diretamente. Você precisa cancelar a listagem e criar uma nova com o novo preço.

## 🎨 NFTs

### P: Preciso hospedar as imagens em algum lugar?
**R:** Sim. Opções:
- IPFS (recomendado para produção)
- URLs públicas (https://)
- Serviços de hospedagem de imagens

### P: O que é tokenURI?
**R:** É onde ficam os metadados do NFT (nome, descrição, imagem). Pode ser:
- URL HTTP
- Hash IPFS
- Dados on-chain

### P: Posso criar NFTs sem imagem?
**R:** Sim! O campo de imagem é opcional. O NFT aparecerá com um ícone padrão.

### P: Quantos NFTs posso criar?
**R:** Tecnicamente ilimitado, mas cada mint custa gas.

### P: Posso deletar um NFT?
**R:** NFTs não podem ser deletados da blockchain, mas você pode queimá-los (transferir para endereço 0x0).

## 🔐 Segurança

### P: É seguro usar minha carteira principal?
**R:** Para testnet, use uma carteira separada! Nunca exponha private keys de carteiras com fundos reais.

### P: Como proteger minha private key?
**R:** 
- Mantenha `.env` no `.gitignore`
- Nunca commite private keys
- Use carteiras separadas para desenvolvimento
- Considere usar hardware wallets para produção

### P: Os contratos foram auditados?
**R:** Este é um projeto educacional. Para produção, sempre faça audit profissional.

### P: O que fazer se encontrar uma vulnerabilidade?
**R:** Entre em contato de forma responsável. Para projetos reais, considere programas de bug bounty.

## 🐛 Troubleshooting

### P: "Insufficient funds for gas"
**R:** Você precisa de USDC na Arc Testnet. Solicite tokens de teste da equipe Arc.

### P: "Transaction reverted"
**R:** Causas comuns:
- Rede errada
- Sem aprovação do marketplace
- Preço inválido
- NFT já vendido
- Saldo insuficiente

### P: MetaMask não conecta
**R:** 
1. Verifique se o MetaMask está instalado
2. Recarregue a página
3. Tente desbloquear o MetaMask
4. Limpe cache do navegador

### P: NFTs não aparecem em "Meus NFTs"
**R:** 
1. Aguarde alguns segundos
2. Recarregue a página
3. Verifique se a transação foi confirmada no explorer
4. Confira se está na conta correta

### P: "Nonce too high" 
**R:** 
1. Aguarde transações pendentes
2. Reset da conta no MetaMask:
   - Configurações → Avançado → Reset Account

### P: Erro ao compilar contratos
**R:**
```bash
# Limpe cache e recompile
rm -rf artifacts cache
npm run compile
```

### P: Erro ao fazer deploy
**R:**
1. Verifique `.env` com private key correta
2. Confirme que tem USDC suficiente
3. Teste a conexão RPC:
```bash
curl https://rpc.testnet.arc.network
```

## 💻 Desenvolvimento

### P: Como adicionar novos recursos?
**R:** 
1. Smart contracts: Edite em `contracts/`
2. Frontend: Adicione em `frontend/src/`
3. Compile e teste antes de fazer deploy

### P: Como testar localmente?
**R:**
```bash
# Testes dos contratos
npm test

# Frontend local
npm run dev
```

### P: Posso usar outro framework frontend?
**R:** Sim! Vue, Angular, etc. Basta integrar com Ethers.js.

### P: Como adicionar suporte a múltiplas coleções?
**R:** Você precisaria:
1. Modificar o contrato para trackear múltiplas coleções
2. Adicionar filtros no frontend
3. Atualizar a UI para mostrar coleções

## 📱 Frontend

### P: Funciona em mobile?
**R:** Sim! O design é responsivo. Use MetaMask Mobile ou WalletConnect.

### P: Por que usar Ethers.js e não Web3.js?
**R:** Ethers.js é mais leve, moderna e tem melhor TypeScript support.

### P: Posso customizar o design?
**R:** Totalmente! Edite `frontend/src/index.css` para mudar cores, fontes, etc.

### P: Como adicionar mais páginas?
**R:**
1. Crie componente em `frontend/src/pages/`
2. Adicione rota em `App.jsx`
3. Adicione link na navegação

## 🚀 Deploy e Produção

### P: Quanto custa fazer deploy?
**R:** Na testnet, ~0.02 USDC. Na mainnet, varia com o gas price.

### P: Posso fazer deploy em outras redes?
**R:** Sim! Adicione a rede no `hardhat.config.js`:
```javascript
networks: {
  polygon: {
    url: "https://polygon-rpc.com/",
    chainId: 137,
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

### P: Como verificar contratos?
**R:**
```bash
npx hardhat run scripts/verify-contracts.js --network arcTestnet
```

### P: Preciso fazer deploy novamente se atualizar o frontend?
**R:** Não! Só se modificar os smart contracts.

## 📊 Dados e Analytics

### P: Como rastrear vendas?
**R:** Monitore eventos `ItemSold` do contrato ou use um indexador como The Graph.

### P: Posso ver histórico de transações?
**R:** Sim! Verifique no Arc Explorer usando o endereço do contrato.

### P: Como exportar dados do marketplace?
**R:** Use Web3 para ler eventos históricos ou um indexador.

## 🔄 Atualizações

### P: Como atualizar o projeto?
**R:**
```bash
git pull origin main
npm install
cd frontend && npm install && cd ..
```

### P: Smart contracts podem ser atualizados?
**R:** Não diretamente (imutáveis). Opções:
- Deploy novo contrato
- Usar padrão Proxy (OpenZeppelin)
- Migrar dados para novo contrato

### P: O que fazer após atualizar contratos?
**R:**
1. Compile: `npm run compile`
2. Deploy: `npm run deploy`
3. Atualize endereços no frontend
4. Teste tudo novamente

## 🤝 Comunidade

### P: Onde pedir ajuda?
**R:** 
- GitHub Issues do projeto
- Discord/Telegram da Arc
- Stack Overflow (tag web3)

### P: Como contribuir?
**R:**
1. Fork do repositório
2. Crie branch para sua feature
3. Commit suas mudanças
4. Abra Pull Request

### P: Posso usar este código para meu projeto?
**R:** Sim! Este projeto é MIT License. Use, modifique e distribua livremente.

## 📚 Recursos Adicionais

### P: Onde aprender mais sobre NFTs?
**R:**
- [Ethereum.org - NFT](https://ethereum.org/en/nft/)
- [OpenZeppelin Docs](https://docs.openzeppelin.com/)
- [CryptoZombies](https://cryptozombies.io/)

### P: Onde encontrar exemplos similares?
**R:**
- OpenSea clone tutorials
- Rarible contracts
- LooksRare documentation

---

## 💡 Não encontrou sua pergunta?

Abra uma issue no GitHub ou consulte a documentação completa no [README.md](README.md).

