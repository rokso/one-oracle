import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses} from '../../helpers/address'
import {setupTokenOracles} from '../../helpers/deployment'

const {avalanche: Address} = Addresses

const chainlinkAggregators = [
  {token: Address.RENBTCe, aggregator: Address.Chainlink.CHAINLINK_BTC_USD_AGGREGATOR},
  {token: Address.Synth.msBTC, aggregator: Address.Chainlink.CHAINLINK_BTC_USD_AGGREGATOR},
  {token: Address.Synth.msUNI, aggregator: Address.Chainlink.CHAINLINK_UNI_USD_AGGREGATOR},
  {token: Address.Synth.msCRV, aggregator: Address.Chainlink.CHAINLINK_CRV_USD_AGGREGATOR},
  {token: Address.Synth.msAAVE, aggregator: Address.Chainlink.CHAINLINK_AAVE_USD_AGGREGATOR},
]

const curveLpTokens = [
  {token: Address.Curve.REN_LP, isLending: false},
  {token: Address.Curve.AAVE_LP, isLending: false},
]

const customOracles = [
  {token: Address.Aave.avWBTC, oracle: 'ATokenOracle'},
  {token: Address.Aave.avDAI, oracle: 'ATokenOracle'},
  {token: Address.Aave.avUSDC, oracle: 'ATokenOracle'},
  {token: Address.Aave.avUSDT, oracle: 'ATokenOracle'},
  {token: Address.Synth.msUSD, oracle: 'USDPeggedTokenOracle'},
]

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await setupTokenOracles(hre, {customOracles, chainlinkAggregators, curveLpTokens})
}

export default func
