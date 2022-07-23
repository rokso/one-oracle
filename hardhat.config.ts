import {HardhatUserConfig} from 'hardhat/types'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-ethers'
import 'solidity-coverage'
import 'hardhat-deploy'
import 'hardhat-log-remover'
import 'hardhat-gas-reporter'
import 'hardhat-contract-sizer'
import '@typechain/hardhat'
import 'hardhat-spdx-license-identifier'
import '@nomiclabs/hardhat-etherscan'
import dotenv from 'dotenv'
import './tasks/create-release'

dotenv.config()

const accounts = process.env.MNEMONIC ? {mnemonic: process.env.MNEMONIC} : undefined

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    localhost: {
      saveDeployments: true,
    },
    hardhat: {
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
