import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const ChainlinkOracle = 'ChainlinkOracle'
const PriceProvidersAggregator = 'PriceProvidersAggregator'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  const stalePeriod = 24 * 60 * 60 // 24h
  await deploy(ChainlinkOracle, {
    from,
    log: true,
    args: [stalePeriod],
  })
}

func.dependencies = [PriceProvidersAggregator]
func.tags = [ChainlinkOracle]
export default func
