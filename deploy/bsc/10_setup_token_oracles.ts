import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import Addresses from '../../helpers/address'
import {setupTokenOracles} from '../../helpers/deployment'

const {bsc: Address} = Addresses

const curveLpTokens = [{token: Address.Ellipsis.VAL_3EPS_LP, isLending: false}]

const customOracles = [
  {token: Address.Synth.msUSD, oracle: 'USDPeggedTokenOracle'},
]

const chainlinkAggregators = [
  {token: Address.Synth.msBNB, aggregator: Address.Chainlink.CHAINLINK_BNB_USD_AGGREGATOR},
]

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await setupTokenOracles(hre, {curveLpTokens, customOracles, chainlinkAggregators})
}

export default func
