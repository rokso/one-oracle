import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address, InitCodeHash} from '../../helpers'

const {QUICKSWAP_FACTORY_ADDRESS, WMATIC_ADDRESS} = Address.polygon
const QUICK_SWAP_INIT_CODE_HASH = InitCodeHash[QUICKSWAP_FACTORY_ADDRESS]

const UniswapV2LikeExchange = 'UniswapV2LikeExchange'
const QuickSwapExchange = 'QuickSwapExchange'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  await deploy(QuickSwapExchange, {
    contract: UniswapV2LikeExchange,
    from,
    log: true,
    args: [QUICKSWAP_FACTORY_ADDRESS, QUICK_SWAP_INIT_CODE_HASH, WMATIC_ADDRESS],
  })
}

func.tags = [QuickSwapExchange]
export default func
