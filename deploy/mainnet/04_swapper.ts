import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {ethers} from 'hardhat'
import {ExchangeType} from '../../helpers'

// Note: Swapper on mainnet (`vesper-pools` only) isn't using oracle right now
const ORACLE_ADDRESS = ethers.constants.AddressZero
const MAX_SLIPPAGE = 0

const UniswapV2Exchange = 'UniswapV2Exchange'
const SushiswapExchange = 'SushiswapExchange'
const UniswapV3Exchange = 'UniswapV3Exchange'

const Swapper = 'Swapper'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, execute} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(Swapper, {
    from: deployer,
    log: true,
    args: [ORACLE_ADDRESS, MAX_SLIPPAGE],
  })

  const uniswapV2Exchange = await get(UniswapV2Exchange)
  const sushiswapExchange = await get(SushiswapExchange)
  const uniswapV3Exchange = await get(UniswapV3Exchange)

  await execute(Swapper, {from: deployer, log: true}, 'setExchange', ExchangeType.UNISWAP_V2, uniswapV2Exchange.address)
  await execute(Swapper, {from: deployer, log: true}, 'setExchange', ExchangeType.SUSHISWAP, sushiswapExchange.address)
  await execute(Swapper, {from: deployer, log: true}, 'setExchange', ExchangeType.UNISWAP_V3, uniswapV3Exchange.address)
}

export default func
func.dependencies = ['UniswapV2Exchange', 'SushiswapExchange', 'UniswapV3Exchange']
func.tags = ['mainnet', Swapper]
