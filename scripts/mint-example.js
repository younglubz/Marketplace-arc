const hre = require("hardhat");
const fs = require("fs");

/**
 * Script de exemplo para mintar NFTs após o deploy
 * 
 * Como usar:
 * 1. Certifique-se de que fez o deploy primeiro (npm run deploy)
 * 2. Execute: npx hardhat run scripts/mint-example.js --network arcTestnet
 */

async function main() {
  console.log("🎨 Mintando NFTs de exemplo...\n");

  // Carrega endereços do deploy
  const deploymentsPath = "./deployments.json";
  if (!fs.existsSync(deploymentsPath)) {
    console.error("❌ Arquivo deployments.json não encontrado!");
    console.error("Execute primeiro: npm run deploy");
    process.exit(1);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const mockNFTAddress = deployments.mockNFT;

  console.log("📍 Usando contrato NFT:", mockNFTAddress);

  // Conecta ao contrato
  const [signer] = await hre.ethers.getSigners();
  console.log("👤 Endereço da carteira:", signer.address);

  const MockNFT = await hre.ethers.getContractFactory("MockNFT");
  const mockNFT = MockNFT.attach(mockNFTAddress);

  // Lista de NFTs de exemplo para mintar
  const nftsToMint = [
    {
      name: "Arc Genesis #1",
      description: "O primeiro NFT do Arc Marketplace - Uma peça histórica da coleção genesis.",
      imageUrl: "https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?w=800"
    },
    {
      name: "Cosmic Voyager",
      description: "Uma viagem através das estrelas - NFT exclusivo da série espacial.",
      imageUrl: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=800"
    },
    {
      name: "Digital Dreams",
      description: "Arte generativa única criada por algoritmos avançados.",
      imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800"
    }
  ];

  console.log(`\n🖼️  Mintando ${nftsToMint.length} NFTs...\n`);

  for (let i = 0; i < nftsToMint.length; i++) {
    const nft = nftsToMint[i];
    console.log(`${i + 1}. Mintando: ${nft.name}`);
    
    try {
      // Cria URI com metadados (em produção, faça upload para IPFS)
      const tokenURI = `${nft.description} | Image: ${nft.imageUrl}`;
      
      const tx = await mockNFT.mint(signer.address, tokenURI);
      const receipt = await tx.wait();
      
      console.log(`   ✅ Mintado! Token ID: ${i}`);
      console.log(`   📝 TX: ${receipt.hash}`);
      console.log(`   🔗 ${deployments.explorer.replace('/address/', '/tx/')}${receipt.hash}\n`);
      
      // Aguarda um pouco entre mints para evitar problemas de nonce
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`   ❌ Erro ao mintar: ${error.message}\n`);
    }
  }

  console.log("✨ Processo concluído!");
  console.log("\n📋 Próximos passos:");
  console.log("1. Acesse o frontend: npm run dev");
  console.log("2. Vá em 'Meus NFTs' para ver seus NFTs");
  console.log("3. Liste-os no marketplace!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

