import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {ExchangeType} from '../../helpers'

const SushiSwapExchange = 'SushiSwapExchange'
const PancakeSwapExchange = 'PancakeSwapExchange'
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

  const {address: sushiSwapExchangeAddress} = await get(SushiSwapExchange)

  if ((await read(RoutedSwapper, 'addressOf', [ExchangeType.SUSHISWAP])) !== sushiSwapExchangeAddress) {
    await execute(RoutedSwapper, {from, log: true}, 'setExchange', ExchangeType.SUSHISWAP, sushiSwapExchangeAddress)
  }

  const {address: pancakeSwapExchangeAddress} = await get(PancakeSwapExchange)

  if ((await read(RoutedSwapper, 'addressOf', [ExchangeType.PANCAKE_SWAP])) !== pancakeSwapExchangeAddress) {
    await execute(
      RoutedSwapper,
      {from, log: true},
      'setExchange',
      ExchangeType.PANCAKE_SWAP,
      pancakeSwapExchangeAddress
    )
  }
}

func.dependencies = [SushiSwapExchange, PancakeSwapExchange]
func.tags = [RoutedSwapper]
export default func
