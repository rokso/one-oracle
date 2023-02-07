import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {ExchangeType} from '../../helpers'

const UniswapV3Exchange = 'UniswapV3Exchange'
const RoutedSwapper = 'RoutedSwapper'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read, execute} = deployments
  const {deployer: from} = await getNamedAccounts()

  await deploy(RoutedSwapper, {
    from,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',      
    },
  })

  const {address: uniswapV3ExchangeAddress} = await get(UniswapV3Exchange)
    
  if ((await read(RoutedSwapper, 'addressOf', [ExchangeType.UNISWAP_V3])) !== uniswapV3ExchangeAddress) {
    await execute(RoutedSwapper, {from, log: true}, 'setExchange', ExchangeType.UNISWAP_V3, uniswapV3ExchangeAddress)
  }

}

func.dependencies = [UniswapV3Exchange]
func.tags = [RoutedSwapper]
export default func
