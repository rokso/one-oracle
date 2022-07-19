import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address, Provider} from '../../helpers'

const {WETH_ADDRESS} = Address.mainnet
const {CHAINLINK, UNISWAP_V2, SUSHISWAP} = Provider

const PriceProvidersAggregator = 'PriceProvidersAggregator'
const ChainlinkPriceProvider = 'ChainlinkPriceProvider'
const UniswapV2PriceProvider = 'UniswapV2PriceProvider'
const SushiswapPriceProvider = 'SushiswapPriceProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, execute, get} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(PriceProvidersAggregator, {
    from: deployer,
    log: true,
    args: [WETH_ADDRESS],
  })

  const {address: chainlinkAddress} = await get(ChainlinkPriceProvider)
  const {address: uniswapV2Address} = await get(UniswapV2PriceProvider)
  const {address: sushiswapAddress} = await get(SushiswapPriceProvider)

  await execute(PriceProvidersAggregator, {from: deployer, log: true}, 'setPriceProvider', CHAINLINK, chainlinkAddress)
  await execute(PriceProvidersAggregator, {from: deployer, log: true}, 'setPriceProvider', UNISWAP_V2, uniswapV2Address)
  await execute(PriceProvidersAggregator, {from: deployer, log: true}, 'setPriceProvider', SUSHISWAP, sushiswapAddress)
}

export default func
func.tags = [PriceProvidersAggregator]
