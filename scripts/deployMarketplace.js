const hre = require("hardhat");

async function main() {
  console.log("🚀 Fazendo deploy do Marketplace atualizado...");
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "USDC");

  // Deploy do Marketplace
  console.log("\n📦 Fazendo deploy do Marketplace...");
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  
  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  // Atualiza o arquivo de configuração
  const fs = require("fs");
  
  // Lê o deployments.json existente
  let deployments = {};
  try {
    deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
  } catch (e) {
    console.log("Criando novo deployments.json");
  }
  
  deployments.marketplace = marketplaceAddress;
  deployments.lastUpdate = new Date().toISOString();

  fs.writeFileSync(
    "deployments.json",
    JSON.stringify(deployments, null, 2)
  );

  console.log("\n📝 Endereço atualizado em deployments.json");
  console.log(`\n🔍 Verifique em: https://testnet.arcscan.app/address/${marketplaceAddress}`);
  
  console.log("\n⚠️ IMPORTANTE: Atualize frontend/src/config/contracts.js com:");
  console.log(`   marketplace: '${marketplaceAddress}'`);
  
  console.log("\n✨ Deploy concluído!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

