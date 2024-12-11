import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {saveGovernorExecutionForMultiSigBatch} from '../../helpers/deployment'

const MasterOracle = 'MasterOracle'
const MainAndFallbackOracle = 'MainAndFallbackOracle'

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, get, read} = deployments
  const {deployer: from} = await getNamedAccounts()

  const {address: defaultOracleAddress} = await get(MainAndFallbackOracle)

  await deploy(MasterOracle, {
    from,
    log: true,
    args: [defaultOracleAddress],
  })

  if ((await read(MasterOracle, 'defaultOracle')) !== defaultOracleAddress) {
    await saveGovernorExecutionForMultiSigBatch(hre, MasterOracle, 'updateDefaultOracle', defaultOracleAddress)
  }
}

func.dependencies = [MainAndFallbackOracle]
func.tags = [MasterOracle]
export default func
