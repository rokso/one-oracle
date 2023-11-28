import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses, Provider} from '../../helpers'
import {saveGovernorExecutionForMultiSigBatch} from '../../helpers/deployment'

const {WETH} = Addresses.mainnet
const {CHAINLINK, UNISWAP_V2, SUSHISWAP} = Provider

const ChainlinkPriceProvider = 'ChainlinkPriceProvider'
const UniswapV2PriceProvider = 'UniswapV2PriceProvider'
const SushiswapPriceProvider = 'SushiswapPriceProvider'
const PriceProvidersAggregator = 'PriceProvidersAggregator'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read} = deployments
  const {deployer: from} = await getNamedAccounts()

  await deploy(PriceProvidersAggregator, {
    from,
    log: true,
    args: [WETH],
  })

  const {address: chainlinkAddress} = await get(ChainlinkPriceProvider)
  const {address: uniswapV2Address} = await get(UniswapV2PriceProvider)
  const {address: sushiswapAddress} = await get(SushiswapPriceProvider)

  if ((await read(PriceProvidersAggregator, 'priceProviders', [CHAINLINK])) !== chainlinkAddress) {
    await saveGovernorExecutionForMultiSigBatch(
      hre,
      PriceProvidersAggregator,
      'setPriceProvider',
      CHAINLINK,
      chainlinkAddress
    )
  }

  if ((await read(PriceProvidersAggregator, 'priceProviders', [UNISWAP_V2])) !== uniswapV2Address) {
    await saveGovernorExecutionForMultiSigBatch(
      hre,
      PriceProvidersAggregator,
      'setPriceProvider',
      UNISWAP_V2,
      uniswapV2Address
    )
  }

  if ((await read(PriceProvidersAggregator, 'priceProviders', [SUSHISWAP])) !== sushiswapAddress) {
    await saveGovernorExecutionForMultiSigBatch(
      hre,
      PriceProvidersAggregator,
      'setPriceProvider',
      SUSHISWAP,
      sushiswapAddress
    )
  }
}

func.dependencies = [ChainlinkPriceProvider, UniswapV2PriceProvider, SushiswapPriceProvider]
func.tags = [PriceProvidersAggregator]
export default func
