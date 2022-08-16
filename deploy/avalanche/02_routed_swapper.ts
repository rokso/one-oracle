import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {ExchangeType} from '../../helpers'

const AddressProvider = 'AddressProvider'
const TraderJoeExchange = 'TraderJoeExchange'
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
  const {address: traderJoeExchangeAddress} = await get(TraderJoeExchange)

  if ((await read(RoutedSwapper, 'addressProvider')) !== addressProviderAddress) {
    await execute(RoutedSwapper, {from, log: true}, 'updateAddressProvider', addressProviderAddress)
  }

  if ((await read(RoutedSwapper, 'addressOf', [ExchangeType.TRADERJOE])) !== traderJoeExchangeAddress) {
    await execute(RoutedSwapper, {from, log: true}, 'setExchange', ExchangeType.TRADERJOE, traderJoeExchangeAddress)
  }
}

func.dependencies = [AddressProvider, TraderJoeExchange]
func.tags = [RoutedSwapper]
export default func
