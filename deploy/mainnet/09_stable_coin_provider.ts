import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address} from '../../helpers'
import {parseEther} from '@ethersproject/units'

const {DAI, USDC} = Address.mainnet

const AddressProvider = 'AddressProvider'
const StableCoinProvider = 'StableCoinProvider'
const PriceProvidersAggregator = 'PriceProvidersAggregator'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, execute, read, get} = deployments
  const {deployer: from} = await getNamedAccounts()

  const stalePeriod = 60 * 60 * 24 // 24h (USDC has 24h and DAI has 1h heartbeat)
  const maxDeviation = parseEther('0.01') // 1%

  const {address: stableCoinProviderAddress} = await deploy(StableCoinProvider, {
    from,
    log: true,
    args: [USDC, DAI, stalePeriod, maxDeviation],
  })

  if ((await read(AddressProvider, 'stableCoinProvider')) !== stableCoinProviderAddress) {
    await execute(AddressProvider, {from, log: true}, 'updateStableCoinProvider', stableCoinProviderAddress)
  }
}

func.dependencies = [AddressProvider, PriceProvidersAggregator]
func.tags = [StableCoinProvider]
export default func
