import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address, Provider} from '../../helpers'

const {WAVAX_ADDRESS} = Address.avalanche

const UmbrellaPriceProvider = 'UmbrellaPriceProvider'
const ChainlinkAvalanchePriceProvider = 'ChainlinkAvalanchePriceProvider'
const PriceProvidersAggregator = 'PriceProvidersAggregator'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, execute} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(PriceProvidersAggregator, {
    from: deployer,
    log: true,
    args: [WAVAX_ADDRESS],
  })

  const chainlinkAvalanchePriceProvider = await get(ChainlinkAvalanchePriceProvider)
  const umbrellaPriceProvider = await get(UmbrellaPriceProvider)

  await execute(
    PriceProvidersAggregator,
    {from: deployer, log: true},
    'setPriceProvider',
    Provider.CHAINLINK,
    chainlinkAvalanchePriceProvider.address
  )

  await execute(
    PriceProvidersAggregator,
    {from: deployer, log: true},
    'setPriceProvider',
    Provider.UMBRELLA_FIRST_CLASS,
    umbrellaPriceProvider.address
  )
}

export default func
func.dependencies = [ChainlinkAvalanchePriceProvider, UmbrellaPriceProvider]
func.tags = ['avalanche', PriceProvidersAggregator]
