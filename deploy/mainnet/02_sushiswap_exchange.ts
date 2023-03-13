import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses, InitCodeHash} from '../../helpers/index'

const {SUSHISWAP_FACTORY_ADDRESS, WETH} = Addresses.mainnet
const SUSHISWAP_INIT_CODE_HASH = InitCodeHash[SUSHISWAP_FACTORY_ADDRESS]

const UniswapV2LikeExchange = 'UniswapV2LikeExchange'
const SushiswapExchange = 'SushiswapExchange'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  if (!SUSHISWAP_INIT_CODE_HASH) throw new Error('Swap init code hash is missing')

  await deploy(SushiswapExchange, {
    contract: UniswapV2LikeExchange,
    from,
    log: true,
    args: [SUSHISWAP_FACTORY_ADDRESS, SUSHISWAP_INIT_CODE_HASH, WETH],
  })
}

func.tags = [SushiswapExchange]
export default func
