import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses} from '../../helpers'

const RedstoneUsdcOnlyTokenOracle = 'RedstoneUsdcOnlyTokenOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(RedstoneUsdcOnlyTokenOracle, {
    from: deployer,
    log: true,
    args: [Addresses.swell.USDC],
  })
}

export default func
func.tags = [RedstoneUsdcOnlyTokenOracle]
