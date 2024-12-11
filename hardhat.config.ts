import {HardhatUserConfig} from 'hardhat/types'
import '@nomicfoundation/hardhat-toolbox'
import 'solidity-coverage'
import 'hardhat-deploy'
import 'hardhat-log-remover'
import 'hardhat-gas-reporter'
import 'hardhat-contract-sizer'
import '@typechain/hardhat'
import 'hardhat-spdx-license-identifier'
import dotenv from 'dotenv'
import './tasks/create-release'
import './tasks/impersonate-deployer'

dotenv.config()

function getChainConfig() {
  const {FORK_NODE_URL} = process.env

  if (FORK_NODE_URL!.includes('eth.connect') || FORK_NODE_URL!.includes('eth-mainnet')) {
    return {chainId: 1, deploy: ['deploy/mainnet']}
  }
  if (FORK_NODE_URL!.includes('avax')) {
    return {chainId: 43114, deploy: ['deploy/avalanche']}
  }
  if (FORK_NODE_URL!.includes('polygon-mainnet')) {
    return {chainId: 137, deploy: ['deploy/polygon']}
  }
  if (FORK_NODE_URL!.includes('optimism')) {
    return {chainId: 10, deploy: ['deploy/optimism']}
  }
  if (FORK_NODE_URL!.includes('base')) {
    return {chainId: 8453, deploy: ['deploy/base']}
  }
  if (FORK_NODE_URL!.includes('swell')) {
    return {chainId: 1923, deploy: ['deploy/swell']}
  }
  if (FORK_NODE_URL!.includes('hemi')) {
    return {chainId: 43111, deploy: ['deploy/hemi']}
  }

  return {chainId: 31337, deploy: ['deploy/mainnet']}
}

const {chainId, deploy} = getChainConfig()
const accounts = process.env.MNEMONIC ? {mnemonic: process.env.MNEMONIC} : undefined

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    localhost: {
      saveDeployments: true,
      autoImpersonate: true,
      chainId,
      deploy,
    },
    hardhat: {
      chainId,
      forking: {
        url: process.env.FORK_NODE_URL || 'http://localhost',
        blockNumber: process.env.FORK_BLOCK_NUMBER ? parseInt(process.env.FORK_BLOCK_NUMBER) : undefined,
      },
    },
    mainnet: {
      url: process.env.MAINNET_NODE_URL || '',
      chainId: 1,
      gas: 6700000,
      verify: {etherscan: {apiKey: process.env.MAINNET_ETHERSCAN_API_KEY}},
      deploy: ['deploy/mainnet'],
      accounts,
    },
    polygon: {
      url: process.env.POLYGON_NODE_URL || '',
      chainId: 137,
      gas: 11700000,
      verify: {etherscan: {apiKey: process.env.POLYGON_ETHERSCAN_API_KEY}},
      deploy: ['deploy/polygon'],
      accounts,
    },
    avalanche: {
      url: process.env.AVALANCHE_NODE_URL || '',
      chainId: 43114,
      gas: 8000000,
      verify: {etherscan: {apiKey: process.env.AVALANCHE_ETHERSCAN_API_KEY}},
      deploy: ['deploy/avalanche'],
      accounts,
    },
    optimism: {
      url: process.env.OPTIMISM_NODE_URL || '',
      chainId: 10,
      gas: 8000000,
      verify: {etherscan: {apiKey: process.env.OPTIMISM_ETHERSCAN_API_KEY}},
      deploy: ['deploy/optimism'],
      accounts,
    },
    base: {
      url: process.env.BASE_NODE_URL || '',
      chainId: 8453,
      gas: 8000000,
      verify: {etherscan: {apiKey: process.env.BASE_ETHERSCAN_API_KEY}},
      deploy: ['deploy/base'],
      accounts,
    },
    swell: {
      url: process.env.SWELL_NODE_URL || '',
      chainId: 1923,
      gas: 8000000,
      verify: {etherscan: {apiKey: process.env.SWELL_ETHERSCAN_API_KEY}},
      deploy: ['deploy/swell'],
      accounts,
    },
    hemi: {
      url: process.env.HEMI_NODE_URL || '',
      chainId: 43111,
      gas: 8000000,
      verify: {etherscan: {apiKey: 'noApiKeyNeeded'}},
      deploy: ['deploy/hemi'],
      accounts,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      base: process.env.BASE_ETHERSCAN_API_KEY || '',
      hemi: 'noApiKeyNeeded',
    },
    customChains: [
      {
        network: 'base',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.org',
          browserURL: 'https://basescan.org/',
        },
      },
      {
        network: 'swell',
        chainId: 1923,
        urls: {
          apiURL: 'https://explorer.swellnetwork.io/api',
          browserURL: 'https://explorer.swellnetwork.io/',
        },
      },
      {
        network: 'hemi',
        chainId: 43111,
        urls: {
          apiURL: 'https://explorer-b81c3bd8.hemi.xyz/api',
          browserURL: 'https://explorer-b81c3bd8.hemi.xyz/',
        },
      },
    ],
  },
  namedAccounts: {
    deployer: process.env.DEPLOYER || 0,
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: process.env.RUN_CONTRACT_SIZER === 'true',
    disambiguatePaths: false,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    outputFile: 'gas-report.txt',
    noColors: true,
    excludeContracts: ['mock/'],
  },
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 5000,
          },
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
            },
          },
        },
      },
      {
        version: '0.7.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 5000,
          },
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
            },
          },
        },
      },
    ],
    overrides: {
      '@uniswap/v3-core/contracts/libraries/FullMath.sol': {
        version: '0.7.6',
      },
      '@uniswap/v3-core/contracts/libraries/TickMath.sol': {
        version: '0.7.6',
      },
      '@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol': {
        version: '0.7.6',
      },
    },
  },
  spdxLicenseIdentifier: {
    overwrite: true,
    runOnCompile: true,
  },
  mocha: {
    timeout: 200000,
  },
}

export default config
