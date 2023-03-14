import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses, InitCodeHash} from '../../helpers/index'

const {UNISWAP_V2_FACTORY_ADDRESS, WETH} = Addresses.mainnet
const UNISWAP_INIT_CODE_HASH = InitCodeHash[UNISWAP_V2_FACTORY_ADDRESS]

const UniswapV2LikeExchange = 'UniswapV2LikeExchange'
const UniswapV2Exchange = 'UniswapV2Exchange'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  if (!UNISWAP_INIT_CODE_HASH) throw new Error('Swap init code hash is missing')

  await deploy(UniswapV2Exchange, {
    contract: UniswapV2LikeExchange,
    from,
    log: true,
    args: [UNISWAP_V2_FACTORY_ADDRESS, UNISWAP_INIT_CODE_HASH, WETH],
  })
}

func.tags = [UniswapV2Exchange]
export default func
