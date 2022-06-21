import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Provider} from '../../helpers'
import {parseEther} from 'ethers/lib/utils'

const PriceProvidersAggregator = 'PriceProvidersAggregator'
const SynthOracle = 'SynthOracle'

// Max acceptable deviation between fallbacks' prices
const MAX_DEVIATION = parseEther('0.05') // 5%

// It's used to determine if a price is invalid (i.e. outdated)
const STALE_PERIOD = 43200 // 12 hours

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get} = deployments
  const {deployer} = await getNamedAccounts()

  const priceProvidersAggregator = await get(PriceProvidersAggregator)

  await deploy(SynthOracle, {
    from: deployer,
    log: true,
    args: [priceProvidersAggregator.address, MAX_DEVIATION, STALE_PERIOD, Provider.UMBRELLA_FIRST_CLASS, Provider.NONE],
  })
}

export default func
func.dependencies = [PriceProvidersAggregator]
func.tags = ['avalanche', SynthOracle]
