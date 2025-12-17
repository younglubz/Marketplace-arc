// Contratos deployados na Arc Testnet
export const CONTRACT_ADDRESSES = {
  marketplace: '0xb1B9d130086A6816Cc2D88bC03F671bCc1b9fa08',
  mockNFT: '0x2ceD43bE1bBd8aD876F606e34a2E23673B5A131E',
  collectionFactory: '0xa489e41E3Be16347C01c65979c7869DcbF0a0B96',
}

// Endereço para recebimento de fees da plataforma
export const PLATFORM_FEE_RECEIVER = '0xbE4E0274E68a654767063F3DF1bB43Fe5B580414'

// Configurações de taxas
export const FEE_CONFIG = {
  marketplaceFee: 2.5, // 2.5%
  defaultRoyalty: 5,   // 5% royalty padrão para criadores
}

// Carteira deployer para criar novos contratos de coleção
export const DEPLOYER_CONFIG = {
  address: '0xE7b25C69037697811962e95bB3Ed3972CE0B64f9',
  privateKey: '0xba4bb35e807aba1c7d1e241c7485c050e9a7aebfb4e388fc6ee8c05c666fc8d7',
}

export const ARC_TESTNET_CONFIG = {
  chainId: 5042002,
  chainName: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.testnet.arc.network'],
  blockExplorerUrls: ['https://testnet.arcscan.app'],
}

