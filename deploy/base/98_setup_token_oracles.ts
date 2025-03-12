import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {setupTokenOracles} from '../../helpers/deployment'
import {Addresses} from '../../helpers/address'

const {base: Address} = Addresses
const setupOracles = 'setupOracles'

const chainlinkAggregators = [
  {token: Address.Synth.msETH, aggregator: Address.Chainlink.CHAINLINK_ETH_USD_AGGREGATOR},
  {token: Address.CBETH, aggregator: Address.Chainlink.CHAINLINK_CBETH_USD_AGGREGATOR},
]

const customOracles = [
  {token: Address.Vesper.vaUSDC, oracle: 'VPoolTokenOracle'},
  {token: Address.Vesper.vaETH, oracle: 'VPoolTokenOracle'},
  {token: Address.Vesper.vacbETH, oracle: 'VPoolTokenOracle'},
  {token: Address.Vesper.vawstETH, oracle: 'VPoolTokenOracle'},
  {token: Address.Synth.msUSD, oracle: 'USDPeggedTokenOracle'},
]

const chainlinkEthOnly = [
  {token: Address.WSTETH, ethFeed: Address.Chainlink.CHAINLINK_WSTETH_ETH_AGGREGATOR},
  {token: Address.EZETH, ethFeed: Address.Chainlink.CHAINLINK_EZETH_ETH_AGGREGATOR},
]

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await setupTokenOracles(hre, {
    chainlinkAggregators,
    customOracles,
    chainlinkEthOnly,
  })
}

func.tags = [setupOracles]
export default func
