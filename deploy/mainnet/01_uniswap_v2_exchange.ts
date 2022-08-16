import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address, InitCodeHash} from '../../helpers/index'

const {UNISWAP_V2_FACTORY_ADDRESS, WETH_ADDRESS} = Address.mainnet
const UNISWAP_INIT_CODE_HASH = InitCodeHash[UNISWAP_V2_FACTORY_ADDRESS]

const AddressProvider = 'AddressProvider'
const UniswapV2LikeExchange = 'UniswapV2LikeExchange'
const UniswapV2Exchange = 'UniswapV2Exchange'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read, execute} = deployments
  const {deployer: from} = await getNamedAccounts()

  await deploy(UniswapV2Exchange, {
    contract: UniswapV2LikeExchange,
    from,
    log: true,
    args: [UNISWAP_V2_FACTORY_ADDRESS, UNISWAP_INIT_CODE_HASH, WETH_ADDRESS],
  })

  const {address: addressProviderAddress} = await get(AddressProvider)

  if ((await read(UniswapV2Exchange, 'addressProvider')) !== addressProviderAddress) {
    await execute(UniswapV2Exchange, {from, log: true}, 'updateAddressProvider', addressProviderAddress)
  }
}

func.dependencies = [AddressProvider]
func.tags = [UniswapV2Exchange]
export default func
