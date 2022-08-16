import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {parseEther} from '@ethersproject/units'

const VspMainnetOracle = 'VspMainnetOracle'
const VspOracle = 'VspOracle'
const AddressProvider = 'AddressProvider'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read, execute} = deployments
  const {deployer: from} = await getNamedAccounts()

  const stalePeriod = 60 * 60 * 2 // 2 hours
  const maxDeviation = parseEther('0.05') // 5%

  await deploy(VspOracle, {
    contract: VspMainnetOracle,
    from,
    log: true,
    args: [maxDeviation, stalePeriod],
  })

  const {address: addressProviderAddress} = await get(AddressProvider)

  if ((await read(VspOracle, 'addressProvider')) !== addressProviderAddress) {
    await execute(VspOracle, {from, log: true}, 'updateAddressProvider', addressProviderAddress)
  }
}

func.dependencies = [AddressProvider]
func.tags = [VspOracle]
export default func
