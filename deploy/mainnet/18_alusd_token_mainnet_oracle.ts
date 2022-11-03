import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const AlusdTokenMainnetOracle = 'AlusdTokenMainnetOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, execute} = deployments
  const {deployer: from} = await getNamedAccounts()

  const stalePeriod = 4 * 60 * 60 // 4h

  const {newlyDeployed} = await deploy(AlusdTokenMainnetOracle, {
    from,
    log: true,
    args: [stalePeriod],
  })

  if (newlyDeployed) {
    await execute(AlusdTokenMainnetOracle, {from, log: true}, 'update')
  }
}

func.tags = [AlusdTokenMainnetOracle]
export default func
