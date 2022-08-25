import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const AlusdTokenMainnetOracle = 'AlusdTokenMainnetOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  const stalePeriod = 4 * 60 * 60 // 4h

  await deploy(AlusdTokenMainnetOracle, {
    from,
    log: true,
    args: [stalePeriod],
  })
}

func.tags = [AlusdTokenMainnetOracle]
export default func
