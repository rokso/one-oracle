import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {setupTokenOracles} from '../../helpers/deployment'
import {Addresses} from '../../helpers/address'

const {hemi: Address} = Addresses
const setupOracles = 'setupOracles'

const chainlinkAggregators = [
  {token: Address.WETH, aggregator: Address.Redstone.REDSTONE_ETH_USD_AGGREGATOR},
  {token: Address.USDC, aggregator: Address.Redstone.REDSTONE_USDC_USD_AGGREGATOR},
  {token: Address.USDT, aggregator: Address.Redstone.REDSTONE_USDT_USD_AGGREGATOR},
]

const curveLpTokens: never[] = []

const customOracles: never[] = []

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await setupTokenOracles(hre, {
    chainlinkAggregators,
    curveLpTokens,
    customOracles,
  })
}

func.tags = [setupOracles]
export default func
