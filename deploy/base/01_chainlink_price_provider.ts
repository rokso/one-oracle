import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const ChainlinkBasePriceProvider = 'ChainlinkBasePriceProvider'
const ChainlinkPriceProvider = 'ChainlinkPriceProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(ChainlinkPriceProvider, {
    contract: ChainlinkBasePriceProvider,
    from: deployer,
    log: true,
    args: [],
  })
}

export default func
func.tags = [ChainlinkPriceProvider]
