import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address, Provider} from '../../helpers'

const {WETH_ADDRESS} = Address.mainnet
const {CHAINLINK, UNISWAP_V2, SUSHISWAP} = Provider

const AddressProvider = 'AddressProvider'
const ChainlinkPriceProvider = 'ChainlinkPriceProvider'
const UniswapV2PriceProvider = 'UniswapV2PriceProvider'
const SushiswapPriceProvider = 'SushiswapPriceProvider'
const PriceProvidersAggregator = 'PriceProvidersAggregator'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, execute, get, read} = deployments
  const {deployer: from} = await getNamedAccounts()

  const {address: priceProviderAggregatorAddress} = await deploy(PriceProvidersAggregator, {
    from,
    log: true,
    args: [WETH_ADDRESS],
  })

  const {address: chainlinkAddress} = await get(ChainlinkPriceProvider)
  const {address: uniswapV2Address} = await get(UniswapV2PriceProvider)
  const {address: sushiswapAddress} = await get(SushiswapPriceProvider)

  if ((await read(PriceProvidersAggregator, 'priceProviders', [CHAINLINK])) !== chainlinkAddress) {
    await execute(PriceProvidersAggregator, {from, log: true}, 'setPriceProvider', CHAINLINK, chainlinkAddress)
  }

  if ((await read(PriceProvidersAggregator, 'priceProviders', [UNISWAP_V2])) !== uniswapV2Address) {
    await execute(PriceProvidersAggregator, {from, log: true}, 'setPriceProvider', UNISWAP_V2, uniswapV2Address)
  }

  if ((await read(PriceProvidersAggregator, 'priceProviders', [SUSHISWAP])) !== sushiswapAddress) {
    await execute(PriceProvidersAggregator, {from, log: true}, 'setPriceProvider', SUSHISWAP, sushiswapAddress)
  }

  if ((await read(AddressProvider, 'providersAggregator')) !== priceProviderAggregatorAddress) {
    await execute(AddressProvider, {from, log: true}, 'updateProvidersAggregator', priceProviderAggregatorAddress)
  }
}

func.dependencies = [AddressProvider, ChainlinkPriceProvider, UniswapV2PriceProvider, SushiswapPriceProvider]
func.tags = [PriceProvidersAggregator]
export default func
