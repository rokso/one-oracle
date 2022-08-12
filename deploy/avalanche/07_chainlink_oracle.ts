import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const ChainlinkOracle = 'ChainlinkOracle'
const PriceProvidersAggregator = 'PriceProvidersAggregator'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get} = deployments
  const {deployer} = await getNamedAccounts()

  const {address: priceProviderAggregatorAddress} = await get(PriceProvidersAggregator)
  const stalePeriod = 24 * 60 * 60 // 24h

  await deploy(ChainlinkOracle, {
    from: deployer,
    log: true,
    args: [priceProviderAggregatorAddress, stalePeriod],
  })
}

export default func

func.dependencies = [PriceProvidersAggregator]
func.tags = [ChainlinkOracle]
