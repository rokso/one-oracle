import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses} from '../../helpers'

const ChainlinkEthOnlyTokenOracle = 'ChainlinkEthOnlyTokenOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(ChainlinkEthOnlyTokenOracle, {
    from: deployer,
    log: true,
    args: [Addresses.base.WETH],
  })
}

export default func
func.tags = [ChainlinkEthOnlyTokenOracle]
