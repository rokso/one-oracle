import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {setupTokenOracles} from '../../helpers/deployment'
import {Addresses} from '../../helpers/address'

const {optimism: Address} = Addresses
const setupOracles = 'setupOracles'

const chainlinkAggregators = [
  {token: Address.Curve.SETH_ETH_LP, aggregator: Address.Chainlink.CHAINLINK_ETH_USD_AGGREGATOR},
  {token: Address.Curve.SUSD_LP, aggregator: Address.Chainlink.CHAINLINK_USDC_USD_AGGREGATOR},
]

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await setupTokenOracles(hre, {
    chainlinkAggregators,
  })
}

func.tags = [setupOracles]
export default func
