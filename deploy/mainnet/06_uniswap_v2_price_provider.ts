import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address} from '../../helpers'

const {UNISWAP_V2_FACTORY_ADDRESS, WETH_ADDRESS} = Address.mainnet

const UniswapV2LikePriceProvider = 'UniswapV2LikePriceProvider'
const UniswapV2PriceProvider = 'UniswapV2PriceProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read, execute} = deployments
  const {deployer: from} = await getNamedAccounts()

  const twapPeriod = 60 * 60 * 2 // 2 hours

  await deploy(UniswapV2PriceProvider, {
    contract: UniswapV2LikePriceProvider,
    from,
    log: true,
    args: [UNISWAP_V2_FACTORY_ADDRESS, twapPeriod, WETH_ADDRESS],
  })
}

func.tags = [UniswapV2PriceProvider]
export default func
