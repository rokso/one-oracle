import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const ERC4626TokenOracle = 'ERC4626TokenOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(ERC4626TokenOracle, {
    from: deployer,
    log: true,
    args: [],
  })
}

export default func
func.tags = [ERC4626TokenOracle]
