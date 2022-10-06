import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address} from '../../helpers'

const {
  Chainlink: {CHAINLINK_BTC_USD_AGGREGATOR},
} = Address.avalanche

const BTCPeggedTokenOracle = 'BTCPeggedTokenOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  const stalePeriod = 60 * 60 // 1h

  await deploy(BTCPeggedTokenOracle, {
    from,
    log: true,
    args: [CHAINLINK_BTC_USD_AGGREGATOR, stalePeriod],
  })
}

func.tags = [BTCPeggedTokenOracle]
export default func
