import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {ExchangeType} from '../../helpers'

const AddressProvider = 'AddressProvider'
const UniswapV2Exchange = 'UniswapV2Exchange'
const SushiswapExchange = 'SushiswapExchange'
const UniswapV3Exchange = 'UniswapV3Exchange'
const RoutedSwapper = 'RoutedSwapper'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read, execute} = deployments
  const {deployer: from} = await getNamedAccounts()

  await deploy(RoutedSwapper, {
    from,
    log: true,
    args: [],
  })

  const {address: addressProviderAddress} = await get(AddressProvider)
  const {address: uniswapV2ExchangeAddress} = await get(UniswapV2Exchange)
  const {address: sushiswapExchangeAddress} = await get(SushiswapExchange)
  const {address: uniswapV3ExchangeAddress} = await get(UniswapV3Exchange)

  if ((await read(RoutedSwapper, 'addressProvider')) !== addressProviderAddress) {
    await execute(RoutedSwapper, {from, log: true}, 'updateAddressProvider', addressProviderAddress)
  }

  if ((await read(RoutedSwapper, 'addressOf', [ExchangeType.UNISWAP_V2])) !== sushiswapExchangeAddress) {
    await execute(RoutedSwapper, {from, log: true}, 'setExchange', ExchangeType.UNISWAP_V2, uniswapV2ExchangeAddress)
  }

  if ((await read(RoutedSwapper, 'addressOf', [ExchangeType.SUSHISWAP])) !== sushiswapExchangeAddress) {
    await execute(RoutedSwapper, {from, log: true}, 'setExchange', ExchangeType.SUSHISWAP, sushiswapExchangeAddress)
  }

  if ((await read(RoutedSwapper, 'addressOf', [ExchangeType.UNISWAP_V3])) !== uniswapV3ExchangeAddress) {
    await execute(RoutedSwapper, {from, log: true}, 'setExchange', ExchangeType.UNISWAP_V3, uniswapV3ExchangeAddress)
  }
}

func.dependencies = [AddressProvider, UniswapV2Exchange, SushiswapExchange, UniswapV3Exchange]
func.tags = [RoutedSwapper]
export default func
