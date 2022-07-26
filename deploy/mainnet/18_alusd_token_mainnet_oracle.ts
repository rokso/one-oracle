import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const AlusdTokenMainnetOracle = 'AlusdTokenMainnetOracle'
const PriceProvidersAggregator = 'PriceProvidersAggregator'
const StableCoinProvider = 'StableCoinProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get} = deployments
  const {deployer} = await getNamedAccounts()

  const {address: aggregatorAddress} = await get(PriceProvidersAggregator)
  const {address: stableCoinProviderAddress} = await get(StableCoinProvider)

  const stalePeriod = 4 * 60 * 60 // 4h

  await deploy(AlusdTokenMainnetOracle, {
    from: deployer,
    log: true,
    args: [aggregatorAddress, stableCoinProviderAddress, stalePeriod],
  })
}

export default func
func.dependencies = [PriceProvidersAggregator, StableCoinProvider]
func.tags = [AlusdTokenMainnetOracle]
