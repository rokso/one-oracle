import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {setupTokenOracles} from '../../helpers/deployment'
import {Addresses} from '../../helpers/address'

const {hemi: Address} = Addresses
const setupOracles = 'setupOracles'

const redstonePushAggregators = [
  {token: Address.Synth.msETH, aggregator: Address.Redstone.REDSTONE_ETH_USD_AGGREGATOR},
  {token: Address.Synth.msBTC, aggregator: Address.Redstone.REDSTONE_BTC_USD_AGGREGATOR},
]
const customOracles = [{token: Address.Synth.msUSD, oracle: 'USDPeggedTokenOracle'}]

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await setupTokenOracles(hre, {
    redstonePushAggregators,
    customOracles,
  })
}

func.tags = [setupOracles]
export default func
