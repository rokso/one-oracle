import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address, InitCodeHash} from '../../helpers'

const {SUSHISWAP_FACTORY_ADDRESS, WMATIC} = Address.polygon
const SUSHI_SWAP_INIT_CODE_HASH = InitCodeHash[SUSHISWAP_FACTORY_ADDRESS]

const UniswapV2LikeExchange = 'UniswapV2LikeExchange'
const SushiSwapExchange = 'SushiSwapExchange'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  await deploy(SushiSwapExchange, {
    contract: UniswapV2LikeExchange,
    from,
    log: true,
    args: [SUSHISWAP_FACTORY_ADDRESS, SUSHI_SWAP_INIT_CODE_HASH, WMATIC],
  })
}

func.tags = [SushiSwapExchange]
export default func
