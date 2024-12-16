import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {setupTokenOracles} from '../../helpers/deployment'
import {Addresses} from '../../helpers/address'

const {swell: Address} = Addresses
const setupOracles = 'setupOracles'

const chainlinkAggregators = [{token: Address.USDC, aggregator: Address.Redstone.REDSTONE_USDC_USD_AGGREGATOR}]

const redstoneUsdcOnly = [
  {token: Address.WETH, usdcFeed: Address.Redstone.REDSTONE_ETH_USDC_AGGREGATOR},
  // {token: Address.Synth.msETH, usdcFeed: Address.Redstone.REDSTONE_ETH_USDC_AGGREGATOR},
]

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await setupTokenOracles(hre, {
    chainlinkAggregators,
    redstoneUsdcOnly: redstoneUsdcOnly,
  })
}

func.tags = [setupOracles]
export default func
