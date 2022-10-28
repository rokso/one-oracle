import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address, InitCodeHash} from '../../helpers'

const {PANCAKE_SWAP_FACTORY_ADDRESS, WBNB} = Address.bsc
const PANCAKE_SWAP_INIT_CODE_HASH = InitCodeHash[PANCAKE_SWAP_FACTORY_ADDRESS]

const UniswapV2LikeExchange = 'UniswapV2LikeExchange'
const PancakeSwapExchange = 'PancakeSwapExchange'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()
  if (!PANCAKE_SWAP_INIT_CODE_HASH) throw new Error('Swap init code hash is missing')

  await deploy(PancakeSwapExchange, {
    contract: UniswapV2LikeExchange,
    from,
    log: true,
    args: [PANCAKE_SWAP_FACTORY_ADDRESS, PANCAKE_SWAP_INIT_CODE_HASH, WBNB],
  })
}

func.tags = [PancakeSwapExchange]
export default func
