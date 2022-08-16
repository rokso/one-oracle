import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'

const AlusdTokenMainnetOracle = 'AlusdTokenMainnetOracle'
const AddressProvider = 'AddressProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read, execute} = deployments
  const {deployer: from} = await getNamedAccounts()

  const stalePeriod = 4 * 60 * 60 // 4h

  await deploy(AlusdTokenMainnetOracle, {
    from,
    log: true,
    args: [stalePeriod],
  })

  const {address: addressProviderAddress} = await get(AddressProvider)

  if ((await read(AlusdTokenMainnetOracle, 'addressProvider')) !== addressProviderAddress) {
    await execute(AlusdTokenMainnetOracle, {from, log: true}, 'updateAddressProvider', addressProviderAddress)
  }
}

func.dependencies = [AddressProvider]
func.tags = [AlusdTokenMainnetOracle]
export default func
