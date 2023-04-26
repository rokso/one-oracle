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

const curveLpTokens = [
  {token: Address.Curve.WSTETH_ETH_LP, isLending: false},
  {token: Address.Curve.FRAXBP_USDC_LP, isLending: false},
]

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await setupTokenOracles(hre, {
    chainlinkAggregators,
    curveLpTokens,
  })
}

func.tags = [setupOracles]
export default func
