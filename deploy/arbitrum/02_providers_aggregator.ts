import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses, Provider} from '../../helpers'
import {saveGovernorExecutionForMultiSigBatch} from '../../helpers/deployment'

const PriceProvidersAggregator = 'PriceProvidersAggregator'
const ChainlinkPriceProvider = 'ChainlinkPriceProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy(PriceProvidersAggregator, {
    from: deployer,
    log: true,
    args: [Addresses.arbitrum.WETH],
  })

  const {address: chainlinkAddress} = await get(ChainlinkPriceProvider)

  if ((await read(PriceProvidersAggregator, 'priceProviders', [Provider.CHAINLINK])) !== chainlinkAddress) {
    await saveGovernorExecutionForMultiSigBatch(
      hre,
      PriceProvidersAggregator,
      'setPriceProvider',
      Provider.CHAINLINK,
      chainlinkAddress
    )
  }
}

func.tags = [PriceProvidersAggregator]
export default func
