import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const ChainlinkAvalanchePriceProvider = 'ChainlinkAvalanchePriceProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(ChainlinkAvalanchePriceProvider, {
    from: deployer,
    log: true,
    args: [],
  })
}

export default func
func.tags = [ChainlinkAvalanchePriceProvider]
