const hre = require("hardhat");

async function main() {
  console.log("🚀 Iniciando deploy na Arc Testnet...");
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);

  // Deploy do Marketplace
  console.log("\n📦 Fazendo deploy do Marketplace...");
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  
  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  // Deploy do MockNFT (para testes e NFTs únicos)
  console.log("\n📦 Fazendo deploy do MockNFT...");
  const MockNFT = await hre.ethers.getContractFactory("MockNFT");
  const mockNFT = await MockNFT.deploy();
  await mockNFT.waitForDeployment();
  const mockNFTAddress = await mockNFT.getAddress();
  
  console.log("✅ MockNFT deployed to:", mockNFTAddress);

  // Deploy do CollectionFactory (para criar contratos de coleção)
  console.log("\n📦 Fazendo deploy do CollectionFactory...");
  const CollectionFactory = await hre.ethers.getContractFactory("CollectionFactory");
  const collectionFactory = await CollectionFactory.deploy();
  await collectionFactory.waitForDeployment();
  const collectionFactoryAddress = await collectionFactory.getAddress();
  
  console.log("✅ CollectionFactory deployed to:", collectionFactoryAddress);

  // Salva os endereços em um arquivo
  const fs = require("fs");
  const deployments = {
    network: "Arc Testnet",
    chainId: 5042002,
    marketplace: marketplaceAddress,
    mockNFT: mockNFTAddress,
    collectionFactory: collectionFactoryAddress,
    marketplaceFee: "2.5%",
    explorer: `https://testnet.arcscan.app/address/${marketplaceAddress}`,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    "deployments.json",
    JSON.stringify(deployments, null, 2)
  );

  console.log("\n📝 Endereços salvos em deployments.json");
  console.log("\n🔍 Verifique os contratos em:");
  console.log(`   Marketplace: https://testnet.arcscan.app/address/${marketplaceAddress}`);
  console.log(`   MockNFT: https://testnet.arcscan.app/address/${mockNFTAddress}`);
  console.log(`   CollectionFactory: https://testnet.arcscan.app/address/${collectionFactoryAddress}`);
  
  console.log("\n✨ Deploy concluído com sucesso!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

