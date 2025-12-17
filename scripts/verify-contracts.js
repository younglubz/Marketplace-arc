const hre = require("hardhat");
const fs = require("fs");

/**
 * Script para verificar contratos no Arc Explorer
 * 
 * Nota: A verificação automática pode não funcionar se o Arc Explorer
 * não tiver API de verificação. Nesse caso, você precisará verificar
 * manualmente através da interface web do explorer.
 * 
 * Como usar:
 * npx hardhat run scripts/verify-contracts.js --network arcTestnet
 */

async function main() {
  console.log("🔍 Iniciando verificação de contratos...\n");

  // Carrega endereços do deploy
  const deploymentsPath = "./deployments.json";
  if (!fs.existsSync(deploymentsPath)) {
    console.error("❌ Arquivo deployments.json não encontrado!");
    console.error("Execute primeiro: npm run deploy");
    process.exit(1);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  console.log("📍 Endereços dos contratos:");
  console.log("   Marketplace:", deployments.marketplace);
  console.log("   MockNFT:", deployments.mockNFT);
  console.log();

  try {
    // Verifica Marketplace
    console.log("📝 Verificando Marketplace...");
    await hre.run("verify:verify", {
      address: deployments.marketplace,
      constructorArguments: [],
    });
    console.log("✅ Marketplace verificado!\n");

    // Verifica MockNFT
    console.log("📝 Verificando MockNFT...");
    await hre.run("verify:verify", {
      address: deployments.mockNFT,
      constructorArguments: [],
    });
    console.log("✅ MockNFT verificado!\n");

    console.log("🎉 Todos os contratos foram verificados com sucesso!");
    console.log("\n🔗 Visualize no explorer:");
    console.log(`   Marketplace: ${deployments.explorer}`);
    console.log(`   MockNFT: ${deployments.explorer.replace(deployments.marketplace, deployments.mockNFT)}`);

  } catch (error) {
    console.error("❌ Erro durante a verificação:");
    console.error(error.message);
    console.log("\n💡 Dica: Se a API de verificação não estiver disponível,");
    console.log("você pode verificar manualmente no Arc Explorer:");
    console.log("1. Acesse:", deployments.explorer);
    console.log("2. Clique na aba 'Contract'");
    console.log("3. Clique em 'Verify & Publish'");
    console.log("4. Faça upload do código do contrato");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

