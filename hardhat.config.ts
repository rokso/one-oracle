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

  if (FORK_NODE_URL!.includes('eth.connect') || FORK_NODE_URL.includes('eth-mainnet')) {
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
  },
  // Note: Using factories from Safe
  // See more: https://github.com/safe-global/safe-singleton-factory/tree/main/artifacts
  deterministicDeployment: {
    '1': {
      factory: '0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7',
      deployer: '0xE1CB04A0fA36DdD16a06ea828007E35e1a3cBC37',
      funding: '10000000000000000',
      signedTx:
        // eslint-disable-next-line max-len
        '0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf326a0b1fd9f4102283a663738983f1aac789e979e220a1b649faa74033f507b911af5a061dd0f2f6f2341ee95913cf94b3b8a49cac9fdd7be6310da7acd7a96e31958d7',
    },
    '43114': {
      factory: '0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7',
      deployer: '0xE1CB04A0fA36DdD16a06ea828007E35e1a3cBC37',
      funding: '10000000000000000',
      signedTx:
        //  eslint-disable-next-line max-len
        '0xf8a88085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3830150f8a0d69f418f6da8f01fb95d6d87e1f2eabd85884784cd2ba2d306ba066d41b7c5e6a05a2b76982a148ca8ca2803ceac3d39a3f26208b654c473b17b01e7536eeba55e',
    },
    '137': {
      factory: '0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7',
      deployer: '0xE1CB04A0fA36DdD16a06ea828007E35e1a3cBC37',
      funding: '10000000000000000',
      signedTx:
        //  eslint-disable-next-line max-len
        '0xf8a78085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3820135a085f489c94262e70d9568f4d99427fe4c8aa38bfc1db00284ba8335c577a83f73a0519952b3403cbddd02532b7a9747ff1612d1889b42a53c63e6b63c20026532a8',
    },
    '42161': {
      factory: '0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7',
      deployer: '0xE1CB04A0fA36DdD16a06ea828007E35e1a3cBC37',
      funding: '10000000000000000',
      signedTx:
        //  eslint-disable-next-line max-len
        '0xf8a780843b9aca00830f42408080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf383014986a0364fe6abfcf1a77465394bb2e8bc0855597e9c777308a8686b81a4e315e1e7dba00e36e1a98d3eaa6af29e86c75211090489d8340b0e247536c9bc22a0be8e86ab',
    },
    '56': {
      factory: '0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7',
      deployer: '0xE1CB04A0fA36DdD16a06ea828007E35e1a3cBC37',
      funding: '10000000000000000',
      signedTx:
        //  eslint-disable-next-line max-len
        '0xf8a68085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf38194a039bc1ffd46e4ea51a31d7c856d3a07b0c6a5bc1397e7ee0743813036b92fba02a008e8e2062a30b12774adbedcebc49e1b96f51afc3534f251e65b2e67b270bf4d',
    },
    '10': {
      factory: '0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7',
      deployer: '0xE1CB04A0fA36DdD16a06ea828007E35e1a3cBC37',
      funding: '10000000000000000',
      signedTx:
        //  eslint-disable-next-line max-len
        '0xf8a380831e8480830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf337a0c6fc93309f4116e2c72c18acd099f46d8a821ed5f74de864d39b33475f7e6371a002796a1795a7cb6313e082d92d489e4a68c57bf495dd72c7762463e3a9d9b677',
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
