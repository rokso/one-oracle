import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {parseEther} from '@ethersproject/units'
import {Provider} from '../../helpers'

const ChainlinkAndFallbacksOracle = 'ChainlinkAndFallbacksOracle'
const PriceProvidersAggregator = 'PriceProvidersAggregator'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get} = deployments
  const {deployer} = await getNamedAccounts()

  const stalePeriod = 60 * 60 * 4 // 4 hours
  const maxFallbacksDeviation = parseEther('0.05') // 5%

  const {address: aggregatorAddress} = await get(PriceProvidersAggregator)

  await deploy(ChainlinkAndFallbacksOracle, {
    from: deployer,
    log: true,
    args: [aggregatorAddress, maxFallbacksDeviation, stalePeriod, Provider.UNISWAP_V2, Provider.SUSHISWAP],
  })
}

export default func
func.dependencies = [PriceProvidersAggregator]
func.tags = [ChainlinkAndFallbacksOracle]
