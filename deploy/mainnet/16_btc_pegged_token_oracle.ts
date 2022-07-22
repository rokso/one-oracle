import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address} from '../../helpers'

const {CHAINLINK_BTC_USD_AGGREGATOR} = Address.mainnet

const BTCPeggedTokenOracle = 'BTCPeggedTokenOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  const heartBeat = 60 * 60 // 1h

  await deploy(BTCPeggedTokenOracle, {
    from: deployer,
    log: true,
    args: [CHAINLINK_BTC_USD_AGGREGATOR, heartBeat],
  })
}

export default func

func.tags = [BTCPeggedTokenOracle]
