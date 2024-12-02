import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {setupTokenOracles} from '../../helpers/deployment'
import {Addresses} from '../../helpers/address'

const {swell: Address} = Addresses
const setupOracles = 'setupOracles'

const chainlinkAggregators: never[] = [
  // {token: Address.Synth.msETH, aggregator: Address.Redstone.REDSTONE_ETH_USD_AGGREGATOR},
  // {token: Address.WETH, aggregator: Address.Redstone.REDSTONE_ETH_USD_AGGREGATOR},
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
