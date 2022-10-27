import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const ChainlinkOracle = 'ChainlinkOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  const stalePeriod = 60 * 60 * 4 // 4 hours
  await deploy(ChainlinkOracle, {
    from,
    log: true,
    args: [stalePeriod],
  })
}

func.tags = [ChainlinkOracle]
export default func
