import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const AddressProvider = 'AddressProvider'
const MasterOracle = 'MasterOracle'
const ChainlinkAndFallbacksOracle = 'ChainlinkAndFallbacksOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read, execute} = deployments
  const {deployer: from} = await getNamedAccounts()

  const {address: defaultOracleAddress} = await get(ChainlinkAndFallbacksOracle)

  await deploy(MasterOracle, {
    from,
    log: true,
    args: [defaultOracleAddress],
  })

  const {address: addressProviderAddress} = await get(AddressProvider)

  if ((await read(MasterOracle, 'addressProvider')) !== addressProviderAddress) {
    await execute(MasterOracle, {from, log: true}, 'updateAddressProvider', addressProviderAddress)
  }
}

func.dependencies = [AddressProvider, ChainlinkAndFallbacksOracle]
func.tags = [MasterOracle]
export default func
