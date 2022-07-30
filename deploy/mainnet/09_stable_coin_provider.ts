import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address} from '../../helpers'
import {parseEther} from '@ethersproject/units'

const {DAI_ADDRESS, USDC_ADDRESS} = Address.mainnet

const StableCoinProvider = 'StableCoinProvider'
const PriceProvidersAggregator = 'PriceProvidersAggregator'
const UniswapV2PriceProvider = 'UniswapV2PriceProvider'
const SushiswapPriceProvider = 'SushiswapPriceProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, execute} = deployments
  const {deployer} = await getNamedAccounts()

  const stalePeriod = 60 * 60 * 24 // 24h (USDC has 24h and DAI has 1h heartbeat)
  const maxDeviation = parseEther('0.01') // 1%

  const {address: aggregatorAddress} = await get(PriceProvidersAggregator)

  const {address: stableCoinProviderAddress} = await deploy(StableCoinProvider, {
    from: deployer,
    log: true,
    args: [USDC_ADDRESS, DAI_ADDRESS, aggregatorAddress, stalePeriod, maxDeviation],
  })

  // TODO: Update only if is needed
  // await execute(
  //   UniswapV2PriceProvider,
  //   {from: deployer, log: true},
  //   'updateStableCoinProvider',
  //   stableCoinProviderAddress
  // )
  // await execute(
  //   SushiswapPriceProvider,
  //   {from: deployer, log: true},
  //   'updateStableCoinProvider',
  //   stableCoinProviderAddress
  // )
}

export default func
func.dependencies = [PriceProvidersAggregator]
func.tags = [StableCoinProvider]
