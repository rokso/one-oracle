import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address, InitCodeHash} from '../../helpers/index'

const {UNISWAP_V2_FACTORY_ADDRESS, WETH_ADDRESS} = Address.mainnet
const UNISWAP_INIT_CODE_HASH = InitCodeHash[UNISWAP_V2_FACTORY_ADDRESS]

const UniswapV2LikeExchange = 'UniswapV2LikeExchange'
const UniswapV2Exchange = 'UniswapV2Exchange'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(UniswapV2Exchange, {
    contract: UniswapV2LikeExchange,
    from: deployer,
    log: true,
    args: [UNISWAP_V2_FACTORY_ADDRESS, UNISWAP_INIT_CODE_HASH, WETH_ADDRESS],
  })
}

export default func
func.tags = ['mainnet', UniswapV2Exchange]
