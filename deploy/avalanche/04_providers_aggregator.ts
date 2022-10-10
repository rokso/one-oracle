import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address, Provider} from '../../helpers'

const {WAVAX} = Address.avalanche

const AddressProvider = 'AddressProvider'
const ChainlinkAvalanchePriceProvider = 'ChainlinkAvalanchePriceProvider'
const PriceProvidersAggregator = 'PriceProvidersAggregator'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read, execute} = deployments
  const {deployer: from} = await getNamedAccounts()

  const {address: priceProviderAggregatorAddress} = await deploy(PriceProvidersAggregator, {
    from,
    log: true,
    args: [WAVAX],
  })

  const {address: chainlinkAddress} = await get(ChainlinkAvalanchePriceProvider)

  if ((await read(PriceProvidersAggregator, 'priceProviders', [Provider.CHAINLINK])) !== chainlinkAddress) {
    await execute(PriceProvidersAggregator, {from, log: true}, 'setPriceProvider', Provider.CHAINLINK, chainlinkAddress)
  }

  if ((await read(AddressProvider, 'providersAggregator')) !== priceProviderAggregatorAddress) {
    await execute(AddressProvider, {from, log: true}, 'updateProvidersAggregator', priceProviderAggregatorAddress)
  }
}

func.dependencies = [AddressProvider, ChainlinkAvalanchePriceProvider]
func.tags = [PriceProvidersAggregator]
export default func
