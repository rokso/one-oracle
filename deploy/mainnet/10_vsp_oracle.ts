import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {parseEther} from '@ethersproject/units'

const VspMainnetOracle = 'VspMainnetOracle'
const VspOracle = 'VspOracle'
const StableCoinProvider = 'StableCoinProvider'
const PriceProvidersAggregator = 'PriceProvidersAggregator'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get} = deployments
  const {deployer} = await getNamedAccounts()

  const stalePeriod = 60 * 60 * 2 // 2 hours
  const maxDeviation = parseEther('0.05') // 5%

  const {address: aggregatorAddress} = await get(PriceProvidersAggregator)
  const {address: stableCoinProviderAddress} = await get(StableCoinProvider)

  await deploy(VspOracle, {
    contract: VspMainnetOracle,
    from: deployer,
    log: true,
    args: [aggregatorAddress, stableCoinProviderAddress, maxDeviation, stalePeriod],
  })
}

export default func
func.tags = [VspOracle]
