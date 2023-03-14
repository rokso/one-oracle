import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses, InitCodeHash} from '../../helpers'

const {SUSHISWAP_FACTORY_ADDRESS, WMATIC} = Addresses.polygon
const SUSHI_SWAP_INIT_CODE_HASH = InitCodeHash[SUSHISWAP_FACTORY_ADDRESS]

const UniswapV2LikeExchange = 'UniswapV2LikeExchange'
const SushiSwapExchange = 'SushiSwapExchange'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  if (!SUSHI_SWAP_INIT_CODE_HASH) throw new Error('Swap init code hash is missing')

  await deploy(SushiSwapExchange, {
    contract: UniswapV2LikeExchange,
    from,
    log: true,
    args: [SUSHISWAP_FACTORY_ADDRESS, SUSHI_SWAP_INIT_CODE_HASH, WMATIC],
  })
}

func.tags = [SushiSwapExchange]
export default func
