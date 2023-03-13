import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses} from '../../helpers'

const {UNISWAP_V2_FACTORY_ADDRESS, WETH} = Addresses.mainnet

const UniswapV2LikePriceProvider = 'UniswapV2LikePriceProvider'
const UniswapV2PriceProvider = 'UniswapV2PriceProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer: from} = await getNamedAccounts()

  const twapPeriod = 60 * 60 * 2 // 2 hours

  await deploy(UniswapV2PriceProvider, {
    contract: UniswapV2LikePriceProvider,
    from,
    log: true,
    args: [UNISWAP_V2_FACTORY_ADDRESS, twapPeriod, WETH],
  })
}

func.tags = [UniswapV2PriceProvider]
export default func
