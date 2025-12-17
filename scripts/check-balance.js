const hre = require("hardhat");

/**
 * Script para verificar saldo da carteira na Arc Testnet
 * 
 * Como usar:
 * npx hardhat run scripts/check-balance.js --network arcTestnet
 */

async function main() {
  console.log("💰 Verificando saldo da carteira...\n");

  const [signer] = await hre.ethers.getSigners();
  const address = signer.address;
  
  console.log("📍 Endereço:", address);
  
  const balance = await hre.ethers.provider.getBalance(address);
  const balanceInUSDC = hre.ethers.formatEther(balance);
  
  console.log("💵 Saldo:", balanceInUSDC, "USDC");
  console.log();

  // Verifica se há saldo suficiente para transações
  const minBalance = 0.01; // Mínimo recomendado
  if (parseFloat(balanceInUSDC) < minBalance) {
    console.log("⚠️  Saldo baixo!");
    console.log(`   Recomendamos ter pelo menos ${minBalance} USDC para transações.`);
    console.log("   Obtenha USDC de teste da equipe Arc.");
  } else {
    console.log("✅ Saldo suficiente para realizar transações!");
  }

  // Informações da rede
  const network = await hre.ethers.provider.getNetwork();
  console.log("\n🌐 Informações da Rede:");
  console.log("   Chain ID:", network.chainId.toString());
  console.log("   Nome:", network.name === "unknown" ? "Arc Testnet" : network.name);
  
  const blockNumber = await hre.ethers.provider.getBlockNumber();
  console.log("   Bloco atual:", blockNumber);

  console.log("\n🔗 Visualize sua carteira:");
  console.log(`   https://testnet.arcscan.app/address/${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

