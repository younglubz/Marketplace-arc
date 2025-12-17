const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Redeploy do Marketplace na Arc Testnet...");
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);

  // Deploy do novo Marketplace
  console.log("\n📦 Fazendo deploy do Marketplace atualizado...");
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  
  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  // Atualiza o arquivo de configuração do frontend
  const contractsPath = "./frontend/src/config/contracts.js";
  let contractsContent = fs.readFileSync(contractsPath, "utf8");
  
  // Regex para encontrar e substituir o endereço do marketplace
  const oldMarketplaceRegex = /marketplace:\s*'0x[a-fA-F0-9]{40}'/;
  contractsContent = contractsContent.replace(
    oldMarketplaceRegex,
    `marketplace: '${marketplaceAddress}'`
  );
  
  fs.writeFileSync(contractsPath, contractsContent);
  console.log("✅ Endereço atualizado em frontend/src/config/contracts.js");

  // Atualiza o deployments.json se existir
  try {
    const deploymentsPath = "./deployments.json";
    if (fs.existsSync(deploymentsPath)) {
      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
      deployments.marketplace = marketplaceAddress;
      deployments.explorer = `https://testnet.arcscan.app/address/${marketplaceAddress}`;
      deployments.lastUpdate = new Date().toISOString();
      fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
      console.log("✅ deployments.json atualizado");
    }
  } catch (e) {
    console.warn("⚠️ Não foi possível atualizar deployments.json:", e.message);
  }

  console.log("\n🔍 Verifique o contrato em:");
  console.log(`   https://testnet.arcscan.app/address/${marketplaceAddress}`);
  
  console.log("\n✨ Redeploy concluído com sucesso!");
  console.log("\n⚠️  IMPORTANTE: Listagens antigas no contrato antigo não estarão mais acessíveis.");
  console.log("   Os usuários precisarão listar seus NFTs novamente.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

