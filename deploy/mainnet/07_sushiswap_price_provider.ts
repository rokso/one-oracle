import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address} from '../../helpers'

const {SUSHISWAP_FACTORY_ADDRESS, WETH_ADDRESS} = Address.mainnet

const AddressProvider = 'AddressProvider'
const UniswapV2LikePriceProvider = 'UniswapV2LikePriceProvider'
const SushiswapPriceProvider = 'SushiswapPriceProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, read, execute, get} = deployments
  const {deployer: from} = await getNamedAccounts()

  const twapPeriod = 60 * 60 * 2 // 2 hours

  await deploy(SushiswapPriceProvider, {
    contract: UniswapV2LikePriceProvider,
    from,
    log: true,
    args: [SUSHISWAP_FACTORY_ADDRESS, twapPeriod, WETH_ADDRESS],
  })

  const {address: addressProviderAddress} = await get(AddressProvider)

  if ((await read(SushiswapPriceProvider, 'addressProvider')) !== addressProviderAddress) {
    await execute(SushiswapPriceProvider, {from, log: true}, 'updateAddressProvider', addressProviderAddress)
  }
}

func.dependencies = [AddressProvider]
func.tags = [SushiswapPriceProvider]
export default func
