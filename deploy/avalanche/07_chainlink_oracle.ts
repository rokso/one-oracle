import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const AddressProvider = 'AddressProvider'
const ChainlinkOracle = 'ChainlinkOracle'
const PriceProvidersAggregator = 'PriceProvidersAggregator'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read, execute} = deployments
  const {deployer: from} = await getNamedAccounts()

  const stalePeriod = 24 * 60 * 60 // 24h

  await deploy(ChainlinkOracle, {
    from,
    log: true,
    args: [stalePeriod],
  })

  const {address: addressProviderAddress} = await get(AddressProvider)

  if ((await read(ChainlinkOracle, 'addressProvider')) !== addressProviderAddress) {
    await execute(ChainlinkOracle, {from, log: true}, 'updateAddressProvider', addressProviderAddress)
  }
}

func.dependencies = [AddressProvider, PriceProvidersAggregator]
func.tags = [ChainlinkOracle]
export default func
