import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const USDPeggedTokenOracle = 'USDPeggedTokenOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(USDPeggedTokenOracle, {
    from: deployer,
    log: true,
    args: [],
  })
}

export default func
func.tags = [USDPeggedTokenOracle]
