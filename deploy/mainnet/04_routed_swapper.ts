import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {ExchangeType} from '../../helpers'

const UniswapV2Exchange = 'UniswapV2Exchange'
const SushiswapExchange = 'SushiswapExchange'
const UniswapV3Exchange = 'UniswapV3Exchange'

const RoutedSwapper = 'RoutedSwapper'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, execute} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(RoutedSwapper, {
    from: deployer,
    log: true,
    args: [],
  })

  const uniswapV2Exchange = await get(UniswapV2Exchange)
  const sushiswapExchange = await get(SushiswapExchange)
  const uniswapV3Exchange = await get(UniswapV3Exchange)

  // TODO: Update only if is needed
  // await execute(
  //   RoutedSwapper,
  //   {from: deployer, log: true},
  //   'setExchange',
  //   ExchangeType.UNISWAP_V2,
  //   uniswapV2Exchange.address
  // )
  // await execute(
  //   RoutedSwapper,
  //   {from: deployer, log: true},
  //   'setExchange',
  //   ExchangeType.SUSHISWAP,
  //   sushiswapExchange.address
  // )
  // await execute(
  //   RoutedSwapper,
  //   {from: deployer, log: true},
  //   'setExchange',
  //   ExchangeType.UNISWAP_V3,
  //   uniswapV3Exchange.address
  // )
}

export default func
func.dependencies = [UniswapV2Exchange, SushiswapExchange, UniswapV3Exchange]
func.tags = [RoutedSwapper]
