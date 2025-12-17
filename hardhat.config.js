require("@nomicfoundation/hardhat-toolbox");
try { require('dotenv').config(); } catch (e) { /* dotenv optional */ }

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    arcTestnet: {
      url: "https://rpc.testnet.arc.network",
      chainId: 5042002,
      accounts: ["0xba4bb35e807aba1c7d1e241c7485c050e9a7aebfb4e388fc6ee8c05c666fc8d7"],
      gasPrice: "auto"
    }
  },
  etherscan: {
    apiKey: {
      arcTestnet: "no-api-key-needed"
    },
    customChains: [
      {
        network: "arcTestnet",
        chainId: 5042002,
        urls: {
          apiURL: "https://testnet.arcscan.app/api",
          browserURL: "https://testnet.arcscan.app"
        }
      }
    ]
  }
};

