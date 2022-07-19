import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address} from '../../helpers'
import {ethers} from 'hardhat'

const {UNISWAP_V2_FACTORY_ADDRESS, WETH_ADDRESS} = Address.mainnet
const {AddressZero} = ethers.constants

const UniswapV2LikePriceProvider = 'UniswapV2LikePriceProvider'
const UniswapV2PriceProvider = 'UniswapV2PriceProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy} = deployments
  const {deployer} = await getNamedAccounts()

  const twapPeriod = 60 * 60 * 2 // 2 hours
  const stableCoinProvider = AddressZero // Will set it later

  await deploy(UniswapV2PriceProvider, {
    contract: UniswapV2LikePriceProvider,
    from: deployer,
    log: true,
    args: [UNISWAP_V2_FACTORY_ADDRESS, twapPeriod, WETH_ADDRESS, stableCoinProvider],
  })
}

export default func
func.tags = [UniswapV2PriceProvider]
