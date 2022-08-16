import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address, InitCodeHash} from '../../helpers'

const {TRADERJOE_FACTORY_ADDRESS, WAVAX_ADDRESS} = Address.avalanche
const TRADER_JOE_INIT_CODE_HASH = InitCodeHash[TRADERJOE_FACTORY_ADDRESS]

const AddressProvider = 'AddressProvider'
const UniswapV2LikeExchange = 'UniswapV2LikeExchange'
const TraderJoeExchange = 'TraderJoeExchange'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, execute, read} = deployments
  const {deployer: from} = await getNamedAccounts()

  await deploy(TraderJoeExchange, {
    contract: UniswapV2LikeExchange,
    from,
    log: true,
    args: [TRADERJOE_FACTORY_ADDRESS, TRADER_JOE_INIT_CODE_HASH, WAVAX_ADDRESS],
  })

  const {address: addressProviderAddress} = await get(AddressProvider)

  if ((await read(TraderJoeExchange, 'addressProvider')) !== addressProviderAddress) {
    await execute(TraderJoeExchange, {from, log: true}, 'updateAddressProvider', addressProviderAddress)
  }
}

func.dependencies = [AddressProvider]
func.tags = [TraderJoeExchange]
export default func
