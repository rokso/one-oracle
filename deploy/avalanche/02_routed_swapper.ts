import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {ExchangeType} from '../../helpers'

const TraderJoeExchange = 'TraderJoeExchange'

const RoutedSwapper = 'RoutedSwapper'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read, execute} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(RoutedSwapper, {
    from: deployer,
    log: true,
    args: [],
  })

  const {address: traderJoeExchangeAddress} = await get(TraderJoeExchange)

  if ((await read(RoutedSwapper, 'addressOf', [ExchangeType.TRADERJOE])) !== traderJoeExchangeAddress) {
    await execute(
      RoutedSwapper,
      {from: deployer, log: true},
      'setExchange',
      ExchangeType.TRADERJOE,
      traderJoeExchangeAddress
    )
  }
}

export default func
func.dependencies = [TraderJoeExchange]
func.tags = [`${RoutedSwapper}Avalanche`]
