import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address} from '../../helpers'

const {CHAINLINK_BTC_USD_AGGREGATOR} = Address.avalanche

const AddressProvider = 'AddressProvider'
const BTCPeggedTokenOracle = 'BTCPeggedTokenOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, read, execute, get} = deployments
  const {deployer: from} = await getNamedAccounts()

  const stalePeriod = 60 * 60 // 1h

  await deploy(BTCPeggedTokenOracle, {
    from,
    log: true,
    args: [CHAINLINK_BTC_USD_AGGREGATOR, stalePeriod],
  })

  const {address: addressProviderAddress} = await get(AddressProvider)

  if ((await read(BTCPeggedTokenOracle, 'addressProvider')) !== addressProviderAddress) {
    await execute(BTCPeggedTokenOracle, {from, log: true}, 'updateAddressProvider', addressProviderAddress)
  }
}

func.dependencies = [AddressProvider]
func.tags = [BTCPeggedTokenOracle]
export default func
