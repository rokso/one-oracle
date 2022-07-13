import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address} from '../../helpers/index'

const {SUSHISWAP_FACTORY_ADDRESS, WETH_ADDRESS} = Address.mainnet

const UniswapV2LikeExchange = 'UniswapV2LikeExchange'
const SushiswapExchange = 'SushiswapExchange'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(SushiswapExchange, {
    contract: UniswapV2LikeExchange,
    from: deployer,
    log: true,
    args: [SUSHISWAP_FACTORY_ADDRESS, WETH_ADDRESS],
  })
}

export default func
func.tags = ['mainnet', SushiswapExchange]
