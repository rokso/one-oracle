import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address, Provider} from '../../helpers'

const {WAVAX_ADDRESS} = Address.avalanche

const ChainlinkAvalanchePriceProvider = 'ChainlinkAvalanchePriceProvider'
const PriceProvidersAggregator = 'PriceProvidersAggregator'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read, execute} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(PriceProvidersAggregator, {
    from: deployer,
    log: true,
    args: [WAVAX_ADDRESS],
  })

  const {address: chainlinkAddress} = await get(ChainlinkAvalanchePriceProvider)

  if ((await read(PriceProvidersAggregator, 'priceProviders', [Provider.CHAINLINK])) !== chainlinkAddress) {
    await execute(
      PriceProvidersAggregator,
      {from: deployer, log: true},
      'setPriceProvider',
      Provider.CHAINLINK,
      chainlinkAddress
    )
  }
}

export default func
func.dependencies = [ChainlinkAvalanchePriceProvider]
func.tags = [PriceProvidersAggregator]
