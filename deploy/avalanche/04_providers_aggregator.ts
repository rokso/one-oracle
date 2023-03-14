import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Addresses, Provider} from '../../helpers'
import {saveGovernorExecutionForMultiSigBatch} from '../../helpers/deployment'

const {WAVAX} = Addresses.avalanche

const ChainlinkPriceProvider = 'ChainlinkPriceProvider'
const PriceProvidersAggregator = 'PriceProvidersAggregator'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read} = deployments
  const {deployer: from} = await getNamedAccounts()

  await deploy(PriceProvidersAggregator, {
    from,
    log: true,
    args: [WAVAX],
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

func.dependencies = [ChainlinkPriceProvider]
func.tags = [PriceProvidersAggregator]
export default func
