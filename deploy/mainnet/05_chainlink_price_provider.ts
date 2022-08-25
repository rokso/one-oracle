import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

// Note: Using this contract because has no config burden
// We could use `ChainlinkMainnetPriceProvider` instead in order to save some gas
const ChainlinkFeedPriceProvider = 'ChainlinkFeedPriceProvider'
const ChainlinkPriceProvider = 'ChainlinkPriceProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  await deploy(ChainlinkPriceProvider, {
    contract: ChainlinkFeedPriceProvider,
    from,
    log: true,
    args: [],
  })
}

func.tags = [ChainlinkPriceProvider]
export default func
