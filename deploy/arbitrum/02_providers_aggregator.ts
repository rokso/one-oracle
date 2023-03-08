import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address, Provider} from '../../helpers'

const PriceProvidersAggregator = 'PriceProvidersAggregator'
const ChainlinkPriceProvider = 'ChainlinkPriceProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read, execute} = deployments
  const {deployer: from} = await getNamedAccounts()

  await deploy(PriceProvidersAggregator, {
    from,
    log: true,
    args: [Address.arbitrum.WETH],
  })

  const {address: chainlinkAddress} = await get(ChainlinkPriceProvider)

  if ((await read(PriceProvidersAggregator, 'priceProviders', [Provider.CHAINLINK])) !== chainlinkAddress) {
    await execute(PriceProvidersAggregator, {from, log: true}, 'setPriceProvider', Provider.CHAINLINK, chainlinkAddress)
  }
}

func.tags = [PriceProvidersAggregator]
export default func
